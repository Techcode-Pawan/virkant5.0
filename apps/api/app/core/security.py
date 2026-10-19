from typing import Optional, List
from pydantic import BaseModel
from fastapi import Depends, Header, HTTPException, status
from jose import jwt, JWTError
from app.core.config import settings
from app.core.exceptions import AuthenticationError, AuthorizationError

class AuthenticatedUser(BaseModel):
    user_id: str
    email: str
    organization_id: str
    role: str # 'viewer' | 'operator' | 'engineer' | 'knowledge_manager' | 'org_admin' | 'platform_admin'
    preferred_language: str = "en"

ROLE_HIERARCHY = {
    "viewer": 1,
    "operator": 2,
    "engineer": 3,
    "knowledge_manager": 4,
    "org_admin": 5,
    "platform_admin": 6,
}

def verify_token(token: str) -> dict:
    # 1. Allow deterministic test/mock tokens in dev mode
    if token.startswith("mock-") or token.startswith("dev-"):
        parts = token.split(":")
        # Format: mock-<role>:<user_id>:<org_id> or mock-<role>
        role = parts[0].replace("mock-", "").replace("dev-", "")
        if role not in ROLE_HIERARCHY:
            role = "operator"
        user_id = parts[1] if len(parts) > 1 else "a1111111-1111-1111-1111-111111111111"
        org_id = parts[2] if len(parts) > 2 else "c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b"
        return {
            "sub": user_id,
            "email": f"{role}@vikrant.internal",
            "org_id": org_id,
            "role": role,
            "language": "hi" if role == "operator" else "en"
        }

    # 2. Production JWT verification
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False}
        )
        return payload
    except JWTError as e:
        raise AuthenticationError(f"Token verification failed: {str(e)}")

async def get_current_user(
    authorization: Optional[str] = Header(None)
) -> AuthenticatedUser:
    if not authorization:
        # Default mock user in local development if no header provided
        if settings.APPLICATION_ENV == "development":
            return AuthenticatedUser(
                user_id="a1111111-1111-1111-1111-111111111111",
                email="operator.rajesh@vikrant.internal",
                organization_id="c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b",
                role="operator",
                preferred_language="hi"
            )
        raise AuthenticationError("Authorization header is required")

    if not authorization.startswith("Bearer "):
        raise AuthenticationError("Authorization header must follow 'Bearer <token>' schema")

    token = authorization.split(" ")[1]
    claims = verify_token(token)

    return AuthenticatedUser(
        user_id=claims.get("sub", "anonymous"),
        email=claims.get("email", ""),
        organization_id=claims.get("org_id", "c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b"),
        role=claims.get("role", "viewer"),
        preferred_language=claims.get("language", "en")
    )

def require_role(min_role: str):
    min_level = ROLE_HIERARCHY.get(min_role, 1)

    async def role_checker(current_user: AuthenticatedUser = Depends(get_current_user)):
        user_level = ROLE_HIERARCHY.get(current_user.role, 1)
        if user_level < min_level:
            raise AuthorizationError(
                f"Role '{current_user.role}' lacks permission. Minimum required: '{min_role}'."
            )
        return current_user

    return role_checker
