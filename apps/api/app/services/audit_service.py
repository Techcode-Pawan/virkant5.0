import uuid
from typing import Optional

from fastapi import Request
from pymongo.errors import PyMongoError

from app.core.logging import app_logger
from app.core.security import AuthenticatedUser
from app.db.mongo import AUDIT_LOGS, get_db, utcnow


async def record_audit(
    user: AuthenticatedUser,
    action: str,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    request: Optional[Request] = None,
) -> None:
    """Appends an audit entry. Audit failures are logged, never hidden as success of the audit itself."""
    try:
        await get_db()[AUDIT_LOGS].insert_one({
            "_id": str(uuid.uuid4()),
            "organization_id": user.organization_id,
            "workspace_id": user.workspace_id,
            "user_id": user.user_id,
            "user_email": user.email,
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "ip_address": request.client.host if request and request.client else None,
            "created_at": utcnow(),
        })
    except PyMongoError as exc:
        app_logger.error(f"Audit log write failed for {action}: {exc.__class__.__name__}")
