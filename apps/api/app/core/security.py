import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, Header
from jose import JWTError, jwt
from pydantic import BaseModel

from app.core.config import settings
from app.core.exceptions import AuthenticationError, AuthorizationError

JWT_ALGORITHM = "HS256"
DEFAULT_USER_ID = "a1111111-1111-1111-1111-111111111111"
DEFAULT_WORKSPACE_ID = "ws-a1111111"
DEFAULT_USER_EMAIL = "operator.rajesh@vikrant.internal"


class AuthenticatedUser(BaseModel):
    user_id: str
    email: str
    organization_id: str
    role: str  # 'viewer' | 'operator' | 'engineer' | 'knowledge_manager' | 'org_admin' | 'platform_admin'
    preferred_language: str = "en"
    workspace_id: str = "ws-default"
    session_id: Optional[str] = None
    full_name: Optional[str] = None


ROLE_HIERARCHY = {
    "viewer": 1,
    "operator": 2,
    "engineer": 3,
    "knowledge_manager": 4,
    "org_admin": 5,
    "platform_admin": 6,
}


def stable_user_id(email: str) -> str:
    """Deterministic id derived from the e-mail (Python's hash() is randomized per process)."""
    digest = hashlib.sha256(email.strip().lower().encode("utf-8")).hexdigest()
    return f"usr-{digest[:16]}"


def create_access_token(
    user_id: str,
    email: str,
    organization_id: str,
    role: str,
    workspace_id: str,
    session_id: str,
    language: str = "en",
    full_name: Optional[str] = None,
) -> str:
    now = datetime.now(timezone.utc)
    claims = {
        "sub": user_id,
        "email": email,
        "org_id": organization_id,
        "role": role,
        "workspace_id": workspace_id,
        "session_id": session_id,
        "language": language,
        "name": full_name,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)).timestamp()),
    }
    return jwt.encode(claims, settings.JWT_SECRET, algorithm=JWT_ALGORITHM)


def _decode_dev_token(token: str) -> dict:
    # Development-only token format used by the test-suite and local tooling:
    #   mock-<role>:<user_id>:<org_id>:<workspace_id>:<session_id>
    parts = token.split(":")
    role = parts[0].replace("mock-", "").replace("dev-", "")
    if role not in ROLE_HIERARCHY:
        role = "operator"
    user_id = parts[1] if len(parts) > 1 and parts[1] else DEFAULT_USER_ID
    org_id = parts[2] if len(parts) > 2 and parts[2] else settings.DEFAULT_ORGANIZATION_ID
    email = f"{role}@vikrant.internal"
    if "@" in user_id:
        email = user_id
        user_id = stable_user_id(email)
    workspace_id = parts[3] if len(parts) > 3 and parts[3] else f"ws-{user_id[:8]}"
    return {
        "sub": user_id,
        "email": email,
        "org_id": org_id,
        "role": role,
        "language": "hi" if role == "operator" else "en",
        "workspace_id": workspace_id,
        "session_id": parts[4] if len(parts) > 4 and parts[4] else None,
    }


def verify_token(token: str) -> dict:
    if token.startswith(("mock-", "dev-")):
        if not settings.is_development:
            raise AuthenticationError("Development tokens are disabled in this environment.")
        return _decode_dev_token(token)
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise AuthenticationError("Your session has expired or is invalid. Please sign in again.")


async def get_current_user(authorization: Optional[str] = Header(None)) -> AuthenticatedUser:
    if not authorization:
        if settings.is_development:
            # Local development convenience: the seeded default operator.
            return AuthenticatedUser(
                user_id=DEFAULT_USER_ID,
                email=DEFAULT_USER_EMAIL,
                organization_id=settings.DEFAULT_ORGANIZATION_ID,
                role="operator",
                preferred_language="hi",
                workspace_id=DEFAULT_WORKSPACE_ID,
                session_id="sess-default",
                full_name="Rajesh Sharma",
            )
        raise AuthenticationError("Authorization header is required")

    if not authorization.startswith("Bearer "):
        raise AuthenticationError("Authorization header must follow 'Bearer <token>' schema")

    claims = verify_token(authorization.split(" ", 1)[1].strip())
    user_id = claims.get("sub") or "anonymous"
    return AuthenticatedUser(
        user_id=user_id,
        email=claims.get("email", ""),
        organization_id=claims.get("org_id") or settings.DEFAULT_ORGANIZATION_ID,
        role=claims.get("role", "viewer"),
        preferred_language=claims.get("language", "en"),
        workspace_id=claims.get("workspace_id") or f"ws-{user_id[:8]}",
        session_id=claims.get("session_id"),
        full_name=claims.get("name"),
    )


def has_role(user: AuthenticatedUser, min_role: str) -> bool:
    return ROLE_HIERARCHY.get(user.role, 1) >= ROLE_HIERARCHY.get(min_role, 1)


def require_role(min_role: str):
    async def role_checker(current_user: AuthenticatedUser = Depends(get_current_user)):
        if not has_role(current_user, min_role):
            raise AuthorizationError(
                f"Role '{current_user.role}' lacks permission. Minimum required: '{min_role}'."
            )
        return current_user

    return role_checker
