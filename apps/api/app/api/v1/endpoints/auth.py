from typing import List
from fastapi import APIRouter, Depends, status
from app.core.security import get_current_user, AuthenticatedUser
from app.schemas.auth import SignInRequest, SessionResponse, WorkspaceItem, CreateWorkspaceRequest
from app.services.workspace_service import workspace_manager

router = APIRouter(prefix="/auth", tags=["Authentication & Session Management"])

@router.post("/session", response_model=SessionResponse, status_code=status.HTTP_200_OK)
@router.post("/signin", response_model=SessionResponse, status_code=status.HTTP_200_OK)
async def sign_in_session(payload: SignInRequest):
    """
    Signs in a user and generates a unique, isolated workspace session.
    Each sign-in generates a distinct isolated workspace unless an existing
    workspace ID is explicitly passed.
    """
    session = workspace_manager.create_session(
        email=payload.email,
        role=payload.role,
        organization_id=payload.organization_id,
        preferred_language=payload.preferred_language,
        full_name=payload.full_name,
        workspace_id=payload.workspace_id,
        new_workspace=payload.new_workspace
    )
    return session

@router.get("/me")
async def get_my_profile(current_user: AuthenticatedUser = Depends(get_current_user)):
    return {
        "user_id": current_user.user_id,
        "email": current_user.email,
        "full_name": current_user.email.split("@")[0].replace(".", " ").title(),
        "organization_id": current_user.organization_id,
        "organization_name": "Vikrant Heavy Forge Industries",
        "role": current_user.role,
        "preferred_language": current_user.preferred_language,
        "workspace_id": current_user.workspace_id,
        "session_id": current_user.session_id
    }

@router.get("/workspaces", response_model=List[WorkspaceItem])
async def list_workspaces(current_user: AuthenticatedUser = Depends(get_current_user)):
    """
    Returns all workspaces available to the current user.
    """
    return workspace_manager.list_workspaces(
        user_id=current_user.user_id,
        active_workspace_id=current_user.workspace_id
    )

@router.post("/workspace/new", response_model=WorkspaceItem, status_code=status.HTTP_201_CREATED)
async def create_new_workspace(
    payload: CreateWorkspaceRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Creates a new, isolated workspace for the authenticated user.
    """
    return workspace_manager.create_new_workspace(
        user_id=current_user.user_id,
        name=payload.name,
        role=current_user.role
    )
