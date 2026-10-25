from typing import List

from fastapi import APIRouter, Depends

from app.core.exceptions import NotFoundError
from app.core.security import AuthenticatedUser, get_current_user, require_role
from app.db.mongo import AUDIT_LOGS, FEEDBACK, MESSAGES, USERS, get_db, iso, utcnow
from app.schemas.analytics import AdminUserResponse, AnalyticsOverview, AuditLogItem, CommonIssueItem, FeedbackCreate, FeedbackResponse
from app.services.analytics_service import AnalyticsService

# --- Analytics Router ---
analytics_router = APIRouter(prefix="/analytics", tags=["Operational Analytics"])
analytics = AnalyticsService()


@analytics_router.get("/overview", response_model=AnalyticsOverview)
async def get_analytics_overview(current_user: AuthenticatedUser = Depends(get_current_user)):
    return await analytics.get_overview(organization_id=current_user.organization_id)


@analytics_router.get("/common-issues", response_model=List[CommonIssueItem])
async def get_common_issues(current_user: AuthenticatedUser = Depends(get_current_user)):
    return await analytics.get_common_issues(organization_id=current_user.organization_id)


# --- Feedback Router ---
feedback_router = APIRouter(prefix="/feedback", tags=["Operator Feedback"])


@feedback_router.post("", response_model=FeedbackResponse, status_code=201)
async def submit_feedback(payload: FeedbackCreate, current_user: AuthenticatedUser = Depends(get_current_user)):
    db = get_db()
    message = await db[MESSAGES].find_one({"_id": payload.message_id, "user_id": current_user.user_id})
    if message is None:
        raise NotFoundError("Message not found.")
    rating = 1 if payload.rating > 0 else -1
    feedback_id = f"{payload.message_id}:{current_user.user_id}"
    await db[FEEDBACK].update_one(
        {"_id": feedback_id},
        {"$set": {
            "message_id": payload.message_id, "user_id": current_user.user_id,
            "organization_id": current_user.organization_id, "rating": rating,
            "remarks": payload.remarks, "updated_at": utcnow(),
        }},
        upsert=True,
    )
    await db[MESSAGES].update_one({"_id": payload.message_id}, {"$set": {"feedback": rating}})
    return FeedbackResponse(id=feedback_id, status="recorded", rating=rating)


# --- Admin Router ---
admin_router = APIRouter(prefix="/admin", tags=["Organization Administration"])


@admin_router.get("/users", response_model=List[AdminUserResponse])
async def list_organization_users(current_user: AuthenticatedUser = Depends(require_role("org_admin"))):
    cursor = get_db()[USERS].find({"organization_id": current_user.organization_id}).sort("created_at", 1)
    return [
        AdminUserResponse(
            id=u["_id"], email=u["email"], full_name=u.get("full_name"), role=u.get("role", "operator"),
            preferred_language=u.get("preferred_language", "en"), created_at=iso(u.get("created_at")),
        )
        async for u in cursor
    ]


@admin_router.get("/audit-logs", response_model=List[AuditLogItem])
async def list_audit_logs(limit: int = 100, current_user: AuthenticatedUser = Depends(require_role("org_admin"))):
    cursor = (
        get_db()[AUDIT_LOGS]
        .find({"organization_id": current_user.organization_id})
        .sort("created_at", -1)
        .limit(max(1, min(limit, 500)))
    )
    return [
        AuditLogItem(
            id=a["_id"], action=a["action"], target_type=a.get("target_type"), target_id=a.get("target_id"),
            ip_address=a.get("ip_address"), created_at=iso(a.get("created_at")),
        )
        async for a in cursor
    ]
