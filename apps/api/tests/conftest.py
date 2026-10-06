import os
from datetime import UTC, date, datetime

os.environ.setdefault("ENV", "test")
os.environ.setdefault("SEED_ON_STARTUP", "false")
os.environ.setdefault("JWT_SECRET", "test-secret-key-at-least-32-bytes-long!!")
os.environ.setdefault("JWT_EXPIRE_MINUTES", "5256000")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core import clock
from app.db.base import Base
from app.db.seed import seed
from app.db.session import get_db
from app.main import create_app
from app.models.user import User

FIXED_TODAY = date(2026, 10, 2)

@pytest.fixture(autouse=True)
def fixed_clock():
    clock.set_clock(lambda: datetime(2026, 10, 2, 16, 0, tzinfo=UTC))
    yield FIXED_TODAY
    clock.reset_clock()


@pytest.fixture
def db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    session = Session()
    seed(session)
    yield session
    session.close()
    engine.dispose()


@pytest.fixture
def client(db):
    app = create_app()
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as c:
        yield c


@pytest.fixture
def auth(client):
    r = client.post("/api/v1/auth/register",
                    json={"email": "riya@example.com", "password": "supersecret", "name": "Riya"})
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def user(db):
    u = User(email="u@example.com", name="U", password_hash="x")
    db.add(u)
    db.commit()
    return u
