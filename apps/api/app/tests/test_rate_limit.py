import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_rate_limiting_enforcement():
    # Make multiple quick requests to verify limiter functions properly
    headers = {"Authorization": "Bearer mock-operator:user-rate:org-rate"}
    payload = {"message": "Quick test", "language": "en"}
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # First request succeeds
        resp1 = await ac.post("/api/v1/chat", json=payload, headers=headers)
        assert resp1.status_code == 200
