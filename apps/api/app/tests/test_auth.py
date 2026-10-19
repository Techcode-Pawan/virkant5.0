import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_auth_me_default_dev_user():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert "user_id" in data
    assert "organization_id" in data
    assert data["role"] == "operator"

@pytest.mark.asyncio
async def test_auth_role_hierarchy_denial():
    # Attempting to access admin users with a viewer/operator token
    headers = {"Authorization": "Bearer mock-operator:user-1:org-1"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/admin/users", headers=headers)
    assert response.status_code == 403
    assert response.json()["error"] == "FORBIDDEN_OPERATION"

@pytest.mark.asyncio
async def test_auth_role_hierarchy_success_for_admin():
    headers = {"Authorization": "Bearer mock-org_admin:admin-1:org-1"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/admin/users", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
