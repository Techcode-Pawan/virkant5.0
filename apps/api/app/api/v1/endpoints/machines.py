from typing import List

from fastapi import APIRouter, Depends, Request
from pymongo.errors import DuplicateKeyError

from app.core.exceptions import ForgeWiseException
from app.core.security import AuthenticatedUser, get_current_user, require_role
from app.db.mongo import DOCUMENTS, MACHINES, get_db, iso, utcnow
from app.schemas.machines import MachineCreate, MachineResponse
from app.services.audit_service import record_audit

router = APIRouter(prefix="/machines", tags=["Machines & Assets"])


def _to_response(m: dict, document_count: int) -> MachineResponse:
    return MachineResponse(
        id=m["machine_id"],
        organization_id=m["organization_id"],
        name=m["name"],
        manufacturer=m.get("manufacturer"),
        model=m.get("model"),
        plant_location=m.get("plant_location"),
        document_count=document_count,
        active_issues=0,
        created_at=iso(m.get("created_at")),
    )


@router.get("", response_model=List[MachineResponse])
async def list_machines(current_user: AuthenticatedUser = Depends(get_current_user)):
    db = get_db()
    machines = [m async for m in db[MACHINES].find({"organization_id": current_user.organization_id}).sort("machine_id", 1)]
    counts = {
        r["_id"]: r["n"]
        async for r in await db[DOCUMENTS].aggregate([
            {"$match": {"workspace_id": current_user.workspace_id, "machine_id": {"$ne": None}}},
            {"$group": {"_id": "$machine_id", "n": {"$sum": 1}}},
        ])
    }
    return [_to_response(m, counts.get(m["machine_id"], 0)) for m in machines]


@router.post("", response_model=MachineResponse, status_code=201)
async def create_machine(
    payload: MachineCreate,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_role("engineer")),
):
    doc = {
        "_id": f"{current_user.organization_id}:{payload.id.strip()}",
        "organization_id": current_user.organization_id,
        "machine_id": payload.id.strip(),
        "name": payload.name.strip(),
        "manufacturer": payload.manufacturer,
        "model": payload.model,
        "plant_location": payload.plant_location,
        "created_at": utcnow(),
    }
    try:
        await get_db()[MACHINES].insert_one(doc)
    except DuplicateKeyError:
        raise ForgeWiseException(409, "DUPLICATE_MACHINE", f"Equipment '{payload.id}' already exists.")
    await record_audit(current_user, "MACHINE_REGISTERED", "machine", doc["machine_id"], request)
    return _to_response(doc, 0)
