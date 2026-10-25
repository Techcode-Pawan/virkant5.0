import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional
from app.schemas.auth import SessionResponse, WorkspaceItem

class WorkspaceManager:
    """
    In-memory and persistent workspace manager ensuring each sign-in
    generates a unique, isolated workspace with its own SOPs and state.
    """
    def __init__(self):
        # Maps workspace_id -> dict
        self._workspaces: Dict[str, dict] = {
            "ws-a1111111": {
                "id": "ws-a1111111",
                "name": "Operator Rajesh Bay C-4",
                "user_id": "a1111111-1111-1111-1111-111111111111",
                "organization_id": "c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        }
        # Maps user_id -> list of workspace_ids
        self._user_workspaces: Dict[str, List[str]] = {
            "a1111111-1111-1111-1111-111111111111": ["ws-a1111111"]
        }

    def create_session(
        self,
        email: str,
        role: str,
        organization_id: str = "c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b",
        preferred_language: str = "en",
        full_name: Optional[str] = None,
        workspace_id: Optional[str] = None,
        new_workspace: bool = False
    ) -> SessionResponse:
        session_id = f"sess-{uuid.uuid4().hex[:12]}"
        
        # Consistent user_id from email or new uuid
        safe_email = email.strip().lower()
        clean_name = full_name or safe_email.split("@")[0].replace(".", " ").title()
        user_id = f"usr-{abs(hash(safe_email)) % 100000000:08d}"

        # Generate unique isolated workspace if requested or not specified
        if new_workspace or not workspace_id:
            ws_id = f"ws-{uuid.uuid4().hex[:8]}"
            ws_name = f"{clean_name}'s Isolated Workspace ({role.title()})"
        else:
            ws_id = workspace_id
            ws_name = self._workspaces.get(ws_id, {}).get("name", f"Workspace {ws_id}")

        # Store workspace
        self._workspaces[ws_id] = {
            "id": ws_id,
            "name": ws_name,
            "user_id": user_id,
            "organization_id": organization_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        if user_id not in self._user_workspaces:
            self._user_workspaces[user_id] = []
        if ws_id not in self._user_workspaces[user_id]:
            self._user_workspaces[user_id].append(ws_id)

        # Generate Bearer Token format: mock-<role>:<user_id>:<org_id>:<workspace_id>:<session_id>
        token = f"mock-{role}:{user_id}:{organization_id}:{ws_id}:{session_id}"

        supported_models = [
            "gemini-2.5-flash",
            "gpt-4o",
            "claude-3-5-sonnet",
            "ollama-industrial",
            "forgewise-expert"
        ]

        supported_languages = ["en", "hi", "es", "de", "fr", "ja"]

        return SessionResponse(
            token=token,
            session_id=session_id,
            user_id=user_id,
            email=safe_email,
            full_name=clean_name,
            role=role,
            organization_id=organization_id,
            organization_name="Vikrant Heavy Forge Industries",
            workspace_id=ws_id,
            workspace_name=ws_name,
            preferred_language=preferred_language,
            supported_models=supported_models,
            supported_languages=supported_languages,
            created_at=datetime.now(timezone.utc).isoformat()
        )

    def list_workspaces(self, user_id: str, active_workspace_id: Optional[str] = None) -> List[WorkspaceItem]:
        ws_ids = self._user_workspaces.get(user_id, [])
        # Always include active workspace if present
        if active_workspace_id and active_workspace_id not in ws_ids:
            ws_ids.append(active_workspace_id)

        items = []
        for wid in ws_ids:
            ws_data = self._workspaces.get(wid, {
                "id": wid,
                "name": f"Workspace {wid}",
                "user_id": user_id,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            items.append(WorkspaceItem(
                id=wid,
                name=ws_data.get("name", wid),
                user_id=ws_data.get("user_id", user_id),
                document_count=0,
                is_active=(wid == active_workspace_id),
                created_at=ws_data.get("created_at", datetime.now(timezone.utc).isoformat())
            ))
        return items

    def create_new_workspace(self, user_id: str, name: Optional[str] = None, role: str = "operator") -> WorkspaceItem:
        ws_id = f"ws-{uuid.uuid4().hex[:8]}"
        ws_name = name or f"Workspace {ws_id} ({role.title()})"
        ws_data = {
            "id": ws_id,
            "name": ws_name,
            "user_id": user_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        self._workspaces[ws_id] = ws_data
        if user_id not in self._user_workspaces:
            self._user_workspaces[user_id] = []
        self._user_workspaces[user_id].append(ws_id)

        return WorkspaceItem(
            id=ws_id,
            name=ws_name,
            user_id=user_id,
            document_count=0,
            is_active=True,
            created_at=ws_data["created_at"]
        )

# Global singleton for instant low-latency session and workspace lookup
workspace_manager = WorkspaceManager()
