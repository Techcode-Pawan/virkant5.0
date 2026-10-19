from typing import List
from fastapi import APIRouter, Depends
from app.schemas.machines import MachineResponse, MachineCreate
from app.core.security import get_current_user, require_role, AuthenticatedUser

router = APIRouter(prefix="/machines", tags=["Machines & Assets"])

DEMO_MACHINES = [
    {
        "id": "PMP-402",
        "organization_id": "c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b",
        "name": "High-Pressure Boiler Feed Pump",
        "manufacturer": "Flowserve",
        "model": "HPX-150-B",
        "plant_location": "Boiler House 2, Bay C",
        "document_count": 2,
        "active_issues": 0,
        "created_at": "2026-10-15T08:00:00Z"
    },
    {
        "id": "CNC-MILL-02",
        "organization_id": "c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b",
        "name": "5-Axis Precision Machining Center",
        "manufacturer": "Okuma",
        "model": "MU-5000V",
        "plant_location": "Machining Cell 4",
        "document_count": 3,
        "active_issues": 1,
        "created_at": "2026-10-16T09:30:00Z"
    },
    {
        "id": "HYD-PRESS-01",
        "organization_id": "c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b",
        "name": "2000-Ton Hydraulic Forging Press",
        "manufacturer": "Schuler",
        "model": "HP-2000-M",
        "plant_location": "Heavy Forging Bay 1",
        "document_count": 1,
        "active_issues": 0,
        "created_at": "2026-10-17T11:00:00Z"
    }
]

@router.get("", response_model=List[MachineResponse])
async def list_machines(current_user: AuthenticatedUser = Depends(get_current_user)):
    # Filter by user organization
    return [m for m in DEMO_MACHINES if m["organization_id"] == current_user.organization_id]

@router.post("", response_model=MachineResponse, status_code=201)
async def create_machine(
    payload: MachineCreate,
    current_user: AuthenticatedUser = Depends(require_role("engineer"))
):
    new_m = {
        "id": payload.id,
        "organization_id": current_user.organization_id,
        "name": payload.name,
        "manufacturer": payload.manufacturer,
        "model": payload.model,
        "plant_location": payload.plant_location,
        "document_count": 0,
        "active_issues": 0,
        "created_at": "2026-10-20T00:00:00Z"
    }
    DEMO_MACHINES.append(new_m)
    return new_m
