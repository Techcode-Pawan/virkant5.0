from app.tests.conftest import sign_in


async def test_auth_me_default_dev_user(client):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "a1111111-1111-1111-1111-111111111111"
    assert data["role"] == "operator"
    assert data["persisted"] is True  # seeded into MongoDB at startup


async def test_auth_role_hierarchy_denial(client):
    headers = {"Authorization": "Bearer mock-operator:user-1:org-1"}
    response = await client.get("/api/v1/admin/users", headers=headers)
    assert response.status_code == 403
    assert response.json()["error"] == "FORBIDDEN_OPERATION"


async def test_auth_role_hierarchy_success_for_admin(client):
    await sign_in(client, "admin.marcus@vikrant.internal", role="org_admin")
    headers = {"Authorization": "Bearer mock-org_admin:admin-1:c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b"}
    response = await client.get("/api/v1/admin/users", headers=headers)
    assert response.status_code == 200
    emails = [u["email"] for u in response.json()]
    assert "admin.marcus@vikrant.internal" in emails  # real users, not a hardcoded list


async def test_signed_token_cannot_be_forged(client):
    data, headers = await sign_in(client, "forge.check@vikrant.internal")
    assert data["token"].count(".") == 2  # JWT
    tampered = data["token"][:-4] + ("AAAA" if not data["token"].endswith("AAAA") else "BBBB")
    res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tampered}"})
    assert res.status_code == 401


async def test_workspace_switch_issues_scoped_token(client):
    data, headers = await sign_in(client, "switcher@vikrant.internal")
    new_ws = (await client.post("/api/v1/auth/workspace/new", headers=headers, json={"name": "Night shift"})).json()
    switched = await client.post("/api/v1/auth/workspace/switch", headers=headers, json={"workspace_id": new_ws["id"]})
    assert switched.status_code == 200
    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {switched.json()['token']}"})
    assert me.json()["workspace_id"] == new_ws["id"]

    # Cannot switch into someone else's workspace.
    _, other_headers = await sign_in(client, "intruder@vikrant.internal")
    denied = await client.post("/api/v1/auth/workspace/switch", headers=other_headers, json={"workspace_id": new_ws["id"]})
    assert denied.status_code == 404


async def test_invalid_email_rejected(client):
    res = await client.post("/api/v1/auth/session", json={"email": "not-an-email", "role": "operator"})
    assert res.status_code == 400
    assert res.json()["error"] == "INVALID_INPUT"
