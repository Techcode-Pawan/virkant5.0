from fastapi import APIRouter, Depends
from app.core.security import get_current_user, AuthenticatedUser

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.get("/me")
async def get_my_profile(current_user: AuthenticatedUser = Depends(get_current_user)):
    return {
        "user_id": current_user.user_id,
        "email": current_user.email,
        "full_name": current_user.email.split("@")[0].replace(".", " ").title(),
        "organization_id": current_user.organization_id,
        "organization_name": "Vikrant Heavy Forge Industries",
        "role": current_user.role,
        "preferred_language": current_user.preferred_language
    }
