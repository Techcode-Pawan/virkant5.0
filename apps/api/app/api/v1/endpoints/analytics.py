from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.analytics import AnalyticsOverview, CommonIssueItem, FeedbackCreate, FeedbackResponse, AdminUserResponse, AuditLogItem
from app.services.analytics_service import AnalyticsService
from app.core.security import get_current_user, require_role, AuthenticatedUser
from app.db.session import get_db_session

# --- Analytics Router ---
analytics_router = APIRouter(prefix="/analytics", tags=["Operational Analytics"])

@analytics_router.get("/overview", response_model=AnalyticsOverview)
async def get_analytics_overview(
    current_user: AuthenticatedUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session)
):
    service = AnalyticsService(db_session=session)
    return await service.get_overview(organization_id=current_user.organization_id)

@analytics_router.get("/common-issues", response_model=List[CommonIssueItem])
async def get_common_issues(
    current_user: AuthenticatedUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session)
):
    service = AnalyticsService(db_session=session)
    return await service.get_common_issues(organization_id=current_user.organization_id)


# --- Feedback Router ---
feedback_router = APIRouter(prefix="/feedback", tags=["Operator Feedback"])

@feedback_router.post("", response_model=FeedbackResponse, status_code=201)
async def submit_feedback(
    payload: FeedbackCreate,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    import uuid
    return FeedbackResponse(
        id=str(uuid.uuid4()),
        status="recorded",
        rating=payload.rating
    )


# --- Admin Router ---
admin_router = APIRouter(prefix="/admin", tags=["Organization Administration"])

@admin_router.get("/users", response_model=List[AdminUserResponse])
async def list_organization_users(
    current_user: AuthenticatedUser = Depends(require_role("org_admin"))
):
    return [
        AdminUserResponse(
            id="a1111111-1111-1111-1111-111111111111",
            email="operator.rajesh@vikrant.internal",
            full_name="Rajesh Sharma",
            role="operator",
            preferred_language="hi",
            created_at="2026-10-15T08:00:00Z"
        ),
        AdminUserResponse(
            id="a2222222-2222-2222-2222-222222222222",
            email="engineer.elena@vikrant.internal",
            full_name="Elena Vance",
            role="engineer",
            preferred_language="en",
            created_at="2026-10-16T09:00:00Z"
        ),
        AdminUserResponse(
            id="a3333333-3333-3333-3333-333333333333",
            email="admin.marcus@vikrant.internal",
            full_name="Marcus Cole",
            role="org_admin",
            preferred_language="en",
            created_at="2026-10-14T07:00:00Z"
        )
    ]

@admin_router.get("/audit-logs", response_model=List[AuditLogItem])
async def list_audit_logs(
    current_user: AuthenticatedUser = Depends(require_role("org_admin"))
):
    return [
        AuditLogItem(
            id="log-001",
            action="DOCUMENT_UPLOAD",
            target_type="document",
            target_id="SOP_PMP_402_Boiler_Feed.pdf",
            ip_address="192.168.1.42",
            created_at="2026-10-20T00:10:00Z"
        ),
        AuditLogItem(
            id="log-002",
            action="ROLE_ASSIGNMENT",
            target_type="user",
            target_id="operator.rajesh@vikrant.internal",
            ip_address="192.168.1.10",
            created_at="2026-10-19T18:22:00Z"
        ),
        AuditLogItem(
            id="log-003",
            action="MACHINE_REGISTERED",
            target_type="machine",
            target_id="CNC-MILL-02",
            ip_address="192.168.1.15",
            created_at="2026-10-18T12:00:00Z"
        )
    ]
