import re
import uuid
from typing import List, Optional

from app.core.config import settings
from app.core.exceptions import AuthorizationError, InvalidInputError, NotFoundError
from app.core.security import (
    DEFAULT_USER_EMAIL,
    DEFAULT_USER_ID,
    DEFAULT_WORKSPACE_ID,
    AuthenticatedUser,
    ROLE_HIERARCHY,
    create_access_token,
    stable_user_id,
)
from app.db.mongo import DOCUMENTS, MACHINES, ORGANIZATIONS, USERS, WORKSPACES, get_db, iso, utcnow
from app.schemas.auth import SessionResponse, WorkspaceItem

SUPPORTED_LANGUAGES = ["en", "hi", "es", "de", "fr", "ja"]
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

SEED_MACHINES = [
    ("PMP-402", "High-Pressure Boiler Feed Pump", "Flowserve", "HPX-150-B", "Boiler House 2, Bay C"),
    ("CNC-MILL-02", "5-Axis Precision Machining Center", "Okuma", "MU-5000V", "Machining Cell 4"),
    ("HYD-PRESS-01", "2000-Ton Hydraulic Forging Press", "Schuler", "HP-2000-M", "Heavy Forging Bay 1"),
    ("ROB-CELL-01", "Heavy Robotic Handling Cell", "KUKA", "KR-500", "Bay C-4 Forge Line"),
]


async def seed_defaults() -> None:
    """Idempotently creates the default organization, operator, workspace and equipment."""
    db = get_db()
    now = utcnow()
    org_id = settings.DEFAULT_ORGANIZATION_ID
    await db[ORGANIZATIONS].update_one(
        {"_id": org_id},
        {"$setOnInsert": {"name": settings.DEFAULT_ORGANIZATION_NAME, "slug": "vikrant-heavy-forge", "created_at": now}},
        upsert=True,
    )
    await db[USERS].update_one(
        {"_id": DEFAULT_USER_ID},
        {"$setOnInsert": {
            "email": DEFAULT_USER_EMAIL, "full_name": "Rajesh Sharma", "role": "operator",
            "organization_id": org_id, "preferred_language": "hi", "created_at": now,
        }},
        upsert=True,
    )
    await db[WORKSPACES].update_one(
        {"_id": DEFAULT_WORKSPACE_ID},
        {"$setOnInsert": {
            "name": "Operator Rajesh Bay C-4", "user_id": DEFAULT_USER_ID, "organization_id": org_id,
            "default_model": None, "created_at": now, "updated_at": now,
        }},
        upsert=True,
    )
    for machine_id, name, manufacturer, model, location in SEED_MACHINES:
        await db[MACHINES].update_one(
            {"organization_id": org_id, "machine_id": machine_id},
            {"$setOnInsert": {
                "_id": f"{org_id}:{machine_id}", "name": name, "manufacturer": manufacturer, "model": model,
                "plant_location": location, "created_at": now,
            }},
            upsert=True,
        )


def _new_workspace_doc(user_id: str, organization_id: str, name: str) -> dict:
    now = utcnow()
    return {
        "_id": f"ws-{uuid.uuid4().hex[:8]}",
        "name": name,
        "user_id": user_id,
        "organization_id": organization_id,
        "default_model": None,
        "created_at": now,
        "updated_at": now,
    }


class WorkspaceManager:
    async def create_session(
        self,
        email: str,
        role: str,
        organization_id: Optional[str] = None,
        preferred_language: str = "en",
        full_name: Optional[str] = None,
        workspace_id: Optional[str] = None,
        new_workspace: bool = False,
    ) -> SessionResponse:
        db = get_db()
        safe_email = email.strip().lower()
        if not EMAIL_RE.match(safe_email):
            raise InvalidInputError("Please enter a valid e-mail address.")
        if role not in ROLE_HIERARCHY:
            role = "operator"
        language = preferred_language if preferred_language in SUPPORTED_LANGUAGES else "en"
        now = utcnow()

        user = await db[USERS].find_one({"email": safe_email})
        if user is None:
            user = {
                "_id": stable_user_id(safe_email),
                "email": safe_email,
                "full_name": (full_name or safe_email.split("@")[0].replace(".", " ").title()).strip(),
                "role": role if settings.ALLOW_ROLE_SELF_SELECT else "operator",
                "organization_id": organization_id or settings.DEFAULT_ORGANIZATION_ID,
                "preferred_language": language,
                "created_at": now,
                "last_login_at": now,
            }
            await db[USERS].insert_one(user)
        else:
            updates = {"last_login_at": now, "preferred_language": language}
            if settings.ALLOW_ROLE_SELF_SELECT:
                updates["role"] = role
            if full_name:
                updates["full_name"] = full_name.strip()
            await db[USERS].update_one({"_id": user["_id"]}, {"$set": updates})
            user.update(updates)

        user_id = user["_id"]
        org_id = user["organization_id"]

        workspace = None
        if workspace_id and not new_workspace:
            workspace = await db[WORKSPACES].find_one({"_id": workspace_id})
            if workspace is None or workspace["user_id"] != user_id:
                raise AuthorizationError("That workspace does not belong to this account.")
        if workspace is None and not new_workspace:
            workspace = await db[WORKSPACES].find_one({"user_id": user_id}, sort=[("updated_at", -1)])
        if workspace is None:
            workspace = _new_workspace_doc(user_id, org_id, f"{user['full_name']}'s Workspace")
            await db[WORKSPACES].insert_one(workspace)

        return self._session_response(user, workspace)

    def _session_response(self, user: dict, workspace: dict) -> SessionResponse:
        session_id = f"sess-{uuid.uuid4().hex[:12]}"
        org_name = settings.DEFAULT_ORGANIZATION_NAME
        token = create_access_token(
            user_id=user["_id"],
            email=user["email"],
            organization_id=user["organization_id"],
            role=user["role"],
            workspace_id=workspace["_id"],
            session_id=session_id,
            language=user.get("preferred_language", "en"),
            full_name=user.get("full_name"),
        )
        from app.ai.llm.service import llm_service  # local import avoids a cycle at module load

        return SessionResponse(
            token=token,
            session_id=session_id,
            user_id=user["_id"],
            email=user["email"],
            full_name=user.get("full_name") or user["email"],
            role=user["role"],
            organization_id=user["organization_id"],
            organization_name=org_name,
            workspace_id=workspace["_id"],
            workspace_name=workspace["name"],
            preferred_language=user.get("preferred_language", "en"),
            supported_models=[m["id"] for m in llm_service.models_report()],
            supported_languages=SUPPORTED_LANGUAGES,
            created_at=iso(utcnow()),
        )

    async def switch_workspace(self, current: AuthenticatedUser, workspace_id: str) -> SessionResponse:
        db = get_db()
        workspace = await db[WORKSPACES].find_one({"_id": workspace_id})
        if workspace is None or workspace["user_id"] != current.user_id:
            raise NotFoundError("Workspace not found.")
        await db[WORKSPACES].update_one({"_id": workspace_id}, {"$set": {"updated_at": utcnow()}})
        user = await db[USERS].find_one({"_id": current.user_id}) or {
            "_id": current.user_id, "email": current.email, "role": current.role,
            "organization_id": current.organization_id, "preferred_language": current.preferred_language,
            "full_name": current.full_name or current.email,
        }
        return self._session_response(user, workspace)

    async def list_workspaces(self, user_id: str, active_workspace_id: Optional[str] = None) -> List[WorkspaceItem]:
        db = get_db()
        rows = [w async for w in db[WORKSPACES].find({"user_id": user_id}).sort("created_at", -1)]
        if active_workspace_id and not any(w["_id"] == active_workspace_id for w in rows):
            ws = await db[WORKSPACES].find_one({"_id": active_workspace_id})
            if ws:
                rows.insert(0, ws)
        counts = {
            r["_id"]: r["n"]
            async for r in await db[DOCUMENTS].aggregate([
                {"$match": {"workspace_id": {"$in": [w["_id"] for w in rows]}}},
                {"$group": {"_id": "$workspace_id", "n": {"$sum": 1}}},
            ])
        }
        return [
            WorkspaceItem(
                id=w["_id"],
                name=w.get("name", w["_id"]),
                user_id=w.get("user_id", user_id),
                document_count=counts.get(w["_id"], 0),
                is_active=w["_id"] == active_workspace_id,
                created_at=iso(w.get("created_at")),
            )
            for w in rows
        ]

    async def create_new_workspace(self, current: AuthenticatedUser, name: Optional[str] = None) -> WorkspaceItem:
        ws = _new_workspace_doc(current.user_id, current.organization_id, (name or "").strip() or "New Workspace")
        await get_db()[WORKSPACES].insert_one(ws)
        return WorkspaceItem(
            id=ws["_id"], name=ws["name"], user_id=current.user_id, document_count=0,
            is_active=False, created_at=iso(ws["created_at"]),
        )

    async def get_profile(self, current: AuthenticatedUser) -> dict:
        db = get_db()
        user = await db[USERS].find_one({"_id": current.user_id})
        workspace = await db[WORKSPACES].find_one({"_id": current.workspace_id})
        return {
            "user_id": current.user_id,
            "email": (user or {}).get("email", current.email),
            "full_name": (user or {}).get("full_name") or current.full_name or current.email.split("@")[0].replace(".", " ").title(),
            "organization_id": current.organization_id,
            "organization_name": settings.DEFAULT_ORGANIZATION_NAME,
            "role": current.role,
            "preferred_language": (user or {}).get("preferred_language", current.preferred_language),
            "workspace_id": current.workspace_id,
            "workspace_name": (workspace or {}).get("name", current.workspace_id),
            "session_id": current.session_id,
            "persisted": user is not None,
        }


workspace_manager = WorkspaceManager()
