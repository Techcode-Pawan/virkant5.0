from typing import List

from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel

from app.core.security import AuthenticatedUser, get_current_user
from app.schemas.auth import CreateWorkspaceRequest, SessionResponse, SignInRequest, WorkspaceItem
from app.services.audit_service import record_audit
from app.services.workspace_service import workspace_manager

router = APIRouter(prefix="/auth", tags=["Authentication & Session Management"])


class SwitchWorkspaceRequest(BaseModel):
    workspace_id: str


@router.post("/session", response_model=SessionResponse, status_code=status.HTTP_200_OK)
@router.post("/signin", response_model=SessionResponse, status_code=status.HTTP_200_OK)
async def sign_in_session(payload: SignInRequest, request: Request):
    """
    Signs in (creating the user on first sign-in) and returns a signed session token.
    The most recent workspace is reused unless new_workspace=true or workspace_id is given.
    """
    session = await workspace_manager.create_session(
        email=payload.email,
        role=payload.role,
        organization_id=payload.organization_id,
        preferred_language=payload.preferred_language,
        full_name=payload.full_name,
        workspace_id=payload.workspace_id,
        new_workspace=payload.new_workspace,
    )
    await record_audit(
        AuthenticatedUser(user_id=session.user_id, email=session.email, organization_id=session.organization_id,
                          role=session.role, workspace_id=session.workspace_id),
        "SIGN_IN", "user", session.email, request,
    )
    return session


@router.get("/me")
async def get_my_profile(current_user: AuthenticatedUser = Depends(get_current_user)):
    return await workspace_manager.get_profile(current_user)


@router.get("/workspaces", response_model=List[WorkspaceItem])
async def list_workspaces(current_user: AuthenticatedUser = Depends(get_current_user)):
    return await workspace_manager.list_workspaces(current_user.user_id, current_user.workspace_id)


@router.post("/workspace/new", response_model=WorkspaceItem, status_code=status.HTTP_201_CREATED)
async def create_new_workspace(payload: CreateWorkspaceRequest, current_user: AuthenticatedUser = Depends(get_current_user)):
    return await workspace_manager.create_new_workspace(current_user, payload.name)


@router.post("/workspace/switch", response_model=SessionResponse)
async def switch_workspace(payload: SwitchWorkspaceRequest, current_user: AuthenticatedUser = Depends(get_current_user)):
    """Returns a new token scoped to another workspace owned by the same user."""
    return await workspace_manager.switch_workspace(current_user, payload.workspace_id)
