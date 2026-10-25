from typing import List, Optional
from pydantic import BaseModel, Field

class SignInRequest(BaseModel):
    email: str = Field(default="operator.rajesh@vikrant.internal")
    role: str = Field(default="operator")
    full_name: Optional[str] = None
    organization_id: str = Field(default="c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b")
    preferred_language: str = Field(default="en")
    workspace_id: Optional[str] = None
    new_workspace: bool = False

class SessionResponse(BaseModel):
    token: str
    session_id: str
    user_id: str
    email: str
    full_name: str
    role: str
    organization_id: str
    organization_name: str = "Vikrant Heavy Forge Industries"
    workspace_id: str
    workspace_name: str
    preferred_language: str
    supported_models: List[str]
    supported_languages: List[str]
    created_at: str

class WorkspaceItem(BaseModel):
    id: str
    name: str
    user_id: str
    document_count: int = 0
    is_active: bool = False
    created_at: str

class CreateWorkspaceRequest(BaseModel):
    name: Optional[str] = None
    clone_baseline_sops: bool = True
