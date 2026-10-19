import pytest
from app.main import app
from app.db.session import get_db_session

async def override_get_db():
    yield None

@pytest.fixture(autouse=True)
def setup_test_dependencies():
    app.dependency_overrides[get_db_session] = override_get_db
    yield
    app.dependency_overrides.clear()
