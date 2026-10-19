import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_tenant_isolation_machines():
    # User 1 from Org A
    headers_org_a = {"Authorization": "Bearer mock-operator:user-a:c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b"}
    # User 2 from Org B
    headers_org_b = {"Authorization": "Bearer mock-operator:user-b:other-org-id-9999"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res_a = await ac.get("/api/v1/machines", headers=headers_org_a)
        res_b = await ac.get("/api/v1/machines", headers=headers_org_b)

    assert res_a.status_code == 200
    assert res_b.status_code == 200

    machines_a = res_a.json()
    machines_b = res_b.json()

    # User A sees Org A machines
    assert len(machines_a) >= 1
    assert all(m["organization_id"] == "c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b" for m in machines_a)

    # User B cannot see Org A machines (zero leak)
    assert not any(m["organization_id"] == "c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b" for m in machines_b)
