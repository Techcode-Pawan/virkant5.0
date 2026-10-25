ORG_A = "c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b"


async def test_tenant_isolation_machines(client):
    res_a = await client.get("/api/v1/machines", headers={"Authorization": f"Bearer mock-operator:user-a:{ORG_A}"})
    res_b = await client.get("/api/v1/machines", headers={"Authorization": "Bearer mock-operator:user-b:other-org-id-9999"})
    assert res_a.status_code == 200 and res_b.status_code == 200
    machines_a, machines_b = res_a.json(), res_b.json()
    assert len(machines_a) >= 4  # seeded equipment, read from MongoDB
    assert all(m["organization_id"] == ORG_A for m in machines_a)
    assert not any(m["organization_id"] == ORG_A for m in machines_b)


async def test_machine_registration_persists(client, database):
    headers = {"Authorization": f"Bearer mock-engineer:eng-1:{ORG_A}"}
    res = await client.post("/api/v1/machines", headers=headers, json={"id": "CMP-77", "name": "Air Compressor"})
    assert res.status_code == 201
    assert await database["machines"].find_one({"organization_id": ORG_A, "machine_id": "CMP-77"})
    dup = await client.post("/api/v1/machines", headers=headers, json={"id": "CMP-77", "name": "Air Compressor"})
    assert dup.status_code == 409
    operator = {"Authorization": f"Bearer mock-operator:op-1:{ORG_A}"}
    assert (await client.post("/api/v1/machines", headers=operator, json={"id": "X-1", "name": "Nope"})).status_code == 403
