async def test_root_health_reports_real_database_status(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app"] == "ForgeWise AI"
    assert data["database"]["status"] == "connected"
    assert data["database"]["database"] == "vikrant5_test"
    assert isinstance(data["database"]["latency_ms"], float)


async def test_health_never_exposes_credentials(client):
    data = (await client.get("/api/v1/health")).json()
    assert "@" not in (data["database"]["host"] or "")
    assert "mongodb://" in data["database"]["host"]


async def test_health_lists_only_configured_providers(client):
    data = (await client.get("/api/v1/health")).json()
    # The test environment has no API keys: nothing may claim to be configured.
    assert data["llm"]["configured_providers"] == []
    assert data["llm"]["primary_model"] == "offline-extractive"


async def test_readiness_endpoint(client):
    response = await client.get("/api/v1/health/ready")
    assert response.status_code == 200
