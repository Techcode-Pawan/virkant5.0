from typing import Optional
from pydantic import BaseModel, Field

class MachineCreate(BaseModel):
    id: str = Field(..., min_length=2, max_length=100)
    name: str = Field(..., min_length=2, max_length=255)
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    plant_location: Optional[str] = None

class MachineResponse(BaseModel):
    id: str
    organization_id: str
    name: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    plant_location: Optional[str] = None
    document_count: int = 0
    active_issues: int = 0
    created_at: str
