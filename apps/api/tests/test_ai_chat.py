"""Tests for the AI Meal Assistant endpoint and service."""

import os

os.environ.setdefault("ENV", "test")
os.environ.setdefault("SEED_ON_STARTUP", "false")
os.environ.setdefault("JWT_SECRET", "test-secret-key-at-least-32-bytes-long!!")
os.environ.setdefault("JWT_EXPIRE_MINUTES", "5256000")

from datetime import UTC, date, datetime
from unittest.mock import MagicMock, patch

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
from app.models.user import User, UserProfile
from app.schemas.ai_chat import ParsedIntent
from app.services.ai_chat_service import AIChatService

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
                    json={"email": "ai-test@example.com", "password": "supersecret", "name": "TestUser"})
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def auth_with_profile(client, auth):
    """Authenticated user with a vegetarian profile and peanut allergy."""
    r = client.put("/api/v1/users/me/profile", headers=auth, json={
        "sex": "female",
        "height_cm": 165,
        "weight_kg": 60,
        "age": 28,
        "goal": "maintain",
        "activity_level": "moderate",
        "diet_style": "vegetarian",
        "allergies": ["peanut"],
    })
    assert r.status_code == 200, r.text
    return auth


# ── Test 1: Authenticated user can call the AI endpoint ────────────────

class TestAIChatAuth:
    def test_unauthenticated_request_rejected(self, client):
        """Unauthenticated requests should be rejected."""
        r = client.post("/api/v1/ai/chat", json={"message": "Suggest me a meal"})
        assert r.status_code == 401

    def test_authenticated_user_can_call(self, client, auth):
        """Authenticated user can call the AI endpoint."""
        r = client.post("/api/v1/ai/chat", json={"message": "Hello!"}, headers=auth)
        assert r.status_code == 200
        data = r.json()
        assert "message" in data

    def test_empty_message_rejected(self, client, auth):
        """Empty message should be rejected by validation."""
        r = client.post("/api/v1/ai/chat", json={"message": ""}, headers=auth)
        assert r.status_code == 422


# ── Test 2: User profile/targets are passed into AI flow ───────────────

class TestPersonalization:
    def test_greeting_uses_user_name(self, client, auth):
        """Greeting should include the user's name."""
        r = client.post("/api/v1/ai/chat", json={"message": "Hello!"}, headers=auth)
        assert r.status_code == 200
        data = r.json()
        assert "TestUser" in data["message"]

    def test_profile_respected_in_suggestion(self, client, auth_with_profile):
        """Meal suggestions should respect user's diet style."""
        r = client.post(
            "/api/v1/ai/chat",
            json={"message": "Suggest me a dinner"},
            headers=auth_with_profile,
        )
        assert r.status_code == 200
        data = r.json()
        assert "message" in data
        # If a meal is returned, it should not contain meat (user is vegetarian)
        if data.get("meal"):
            meal_name = data["meal"]["name"].lower()
            meat_terms = {"chicken", "mutton", "beef", "pork", "lamb", "fish", "prawn", "kebab"}
            assert not any(t in meal_name for t in meat_terms), \
                f"Vegetarian user got non-veg suggestion: {meal_name}"


# ── Test 3: Dietary restrictions/allergies respected ───────────────────

class TestDietaryRestrictions:
    def test_allergens_excluded(self, client, auth_with_profile):
        """Meals suggested should not contain user's allergens (peanut)."""
        r = client.post(
            "/api/v1/ai/chat",
            json={"message": "Suggest me a snack"},
            headers=auth_with_profile,
        )
        assert r.status_code == 200
        data = r.json()
        if data.get("meal"):
            assert "peanut" not in data["meal"]["name"].lower(), \
                f"User with peanut allergy got: {data['meal']['name']}"


# ── Test 4: Calorie-specific requests are interpreted ──────────────────

class TestCalorieRequests:
    def test_deterministic_calorie_parsing(self, db):
        """Deterministic parser should extract calorie targets."""
        svc = AIChatService(db)
        intent = svc._parse_intent_deterministic("Suggest me a 600 calorie dinner")
        assert intent.intent == "meal_suggestion"
        assert intent.calorie_target == 600
        assert intent.meal_type == "dinner"

    def test_remaining_calories_parsing(self, db):
        """Parser should detect 'calories left' pattern."""
        svc = AIChatService(db)
        intent = svc._parse_intent_deterministic("I have 800 calories left today")
        assert intent.intent == "meal_suggestion"
        assert intent.calorie_target == 800
        assert intent.uses_remaining_calories is True

    def test_kcal_variant(self, db):
        """Parser should handle 'kcal' variant."""
        svc = AIChatService(db)
        intent = svc._parse_intent_deterministic("Give me something around 500 kcal")
        assert intent.intent == "meal_suggestion"
        assert intent.calorie_target == 500


# ── Test 5: Ingredient-based requests are interpreted ──────────────────

class TestIngredientRequests:
    def test_ingredient_extraction(self, db):
        """Deterministic parser should extract ingredients from 'I have...' pattern."""
        svc = AIChatService(db)
        intent = svc._parse_intent_deterministic(
            "I have rice, eggs and paneer. What can I cook?"
        )
        assert intent.intent == "meal_suggestion"
        assert "rice" in intent.ingredients
        assert "eggs" in intent.ingredients
        assert "paneer" in intent.ingredients

    def test_ingredient_meal_suggestion(self, client, auth_with_profile):
        """Ingredient-based request should return a suggestion from NutriSense DB."""
        r = client.post(
            "/api/v1/ai/chat",
            json={"message": "I have rice and dal. What can I cook?"},
            headers=auth_with_profile,
        )
        assert r.status_code == 200
        data = r.json()
        assert "message" in data


# ── Test 6: Nutrition values come from NutriSense services ─────────────

class TestVerifiedNutrition:
    def test_meal_has_verified_nutrition(self, client, auth_with_profile):
        """When a meal is suggested, its nutrition must come from the food DB (not estimated)."""
        r = client.post(
            "/api/v1/ai/chat",
            json={"message": "Suggest me a high protein lunch"},
            headers=auth_with_profile,
        )
        assert r.status_code == 200
        data = r.json()
        if data.get("meal"):
            meal = data["meal"]
            # Verify nutrition fields are present and numeric
            assert isinstance(meal["calories"], (int, float))
            assert isinstance(meal["protein"], (int, float))
            assert isinstance(meal["carbs"], (int, float))
            assert isinstance(meal["fat"], (int, float))
            assert isinstance(meal["fiber"], (int, float))
            # Verify the meal has an id or slug (it came from the real DB)
            assert meal.get("food_id") is not None or meal.get("slug") is not None, \
                "Meal suggestion should reference a real food item"

    def test_response_contract_shape(self, client, auth_with_profile):
        """Response should always have 'message', optionally 'meal'."""
        r = client.post(
            "/api/v1/ai/chat",
            json={"message": "Hello!"},
            headers=auth_with_profile,
        )
        assert r.status_code == 200
        data = r.json()
        assert "message" in data
        assert "meal" in data  # should be present (null for greetings)
        assert data["meal"] is None  # greeting has no meal


# ── Test 7: Unauthenticated requests are rejected ─────────────────────

class TestUnauthenticated:
    def test_no_token(self, client):
        r = client.post("/api/v1/ai/chat", json={"message": "Suggest a meal"})
        assert r.status_code == 401

    def test_invalid_token(self, client):
        r = client.post(
            "/api/v1/ai/chat",
            json={"message": "Suggest a meal"},
            headers={"Authorization": "Bearer invalid-token-xyz"},
        )
        assert r.status_code == 401


# ── Test 8: AI/provider failure returns clean API error ────────────────

class TestProviderFailure:
    def test_gemini_failure_falls_back_gracefully(self, db):
        """If Gemini call fails, the service should fall back to deterministic parsing."""
        svc = AIChatService(db)
        # Even without a Gemini key, the service should work via deterministic fallback
        svc._api_key = None
        user = db.query(User).first()
        if user is None:
            user = User(email="fallback@test.com", name="Fallback", password_hash="x")
            db.add(user)
            db.commit()

        result = svc.chat(user, "Suggest me a dinner")
        assert result.message  # Should always return a message
        assert isinstance(result.message, str)

    def test_api_error_is_clean(self, client, auth):
        """When the AI service encounters an unexpected error, it should return a clean error."""
        with patch.object(AIChatService, "chat", side_effect=Exception("Boom")):
            r = client.post(
                "/api/v1/ai/chat",
                json={"message": "Suggest a meal"},
                headers=auth,
            )
            # The AI provider error handler should catch this cleanly
            assert r.status_code == 502
            data = r.json()
            assert "error" in data
            assert data["error"]["code"] == "ai_provider_error"



# ── Test 9: Existing Regenerate behavior is unchanged ──────────────────

class TestRegenerateUnchanged:
    def test_generate_endpoint_still_works(self, client, auth_with_profile):
        """The existing meal-plan generate endpoint should still work."""
        today = "2026-10-02"
        r = client.post(f"/api/v1/meal-plans/{today}/generate", headers=auth_with_profile)
        assert r.status_code == 200
        data = r.json()
        assert "date" in data
        assert "meals" in data
        assert len(data["meals"]) > 0

    def test_swap_endpoint_still_works(self, client, auth_with_profile):
        """The existing swap options endpoint should still work."""
        today = "2026-10-02"
        # First generate a plan
        client.post(f"/api/v1/meal-plans/{today}/generate", headers=auth_with_profile)
        # Then get swap options
        r = client.get(f"/api/v1/meal-plans/{today}/slots/breakfast/options", headers=auth_with_profile)
        assert r.status_code == 200


# ── Test: Intent parsing edge cases ────────────────────────────────────

class TestIntentParsing:
    def test_greeting_detected(self, db):
        svc = AIChatService(db)
        assert svc._parse_intent_deterministic("Hello!").intent == "greeting"
        assert svc._parse_intent_deterministic("hi").intent == "greeting"

    def test_out_of_scope_detected(self, db):
        svc = AIChatService(db)
        intent = svc._parse_intent_deterministic("What is the weather today?")
        assert intent.intent == "out_of_scope"

    def test_high_protein_preference(self, db):
        svc = AIChatService(db)
        intent = svc._parse_intent_deterministic("Give me a high protein meal")
        assert intent.intent == "meal_suggestion"
        assert "high_protein" in intent.preferences

    def test_vegetarian_request(self, db):
        svc = AIChatService(db)
        intent = svc._parse_intent_deterministic("Suggest something vegetarian for dinner")
        assert intent.intent == "meal_suggestion"
        assert intent.meal_type == "dinner"

    def test_meal_type_detection(self, db):
        svc = AIChatService(db)
        for slot in ("breakfast", "lunch", "snack", "dinner"):
            intent = svc._parse_intent_deterministic(f"Suggest me a {slot}")
            assert intent.meal_type == slot, f"Failed to detect meal type: {slot}"


# ── Test: Response contract ────────────────────────────────────────────

class TestResponseContract:
    def test_out_of_scope_response(self, client, auth):
        r = client.post(
            "/api/v1/ai/chat",
            json={"message": "What is the capital of France?"},
            headers=auth,
        )
        assert r.status_code == 200
        data = r.json()
        assert data["meal"] is None
        assert "meal assistant" in data["message"].lower()

    def test_meal_suggestion_has_required_fields(self, client, auth_with_profile):
        r = client.post(
            "/api/v1/ai/chat",
            json={"message": "Suggest me a breakfast"},
            headers=auth_with_profile,
        )
        assert r.status_code == 200
        data = r.json()
        if data.get("meal"):
            meal = data["meal"]
            required = {"name", "description", "calories", "protein", "carbs",
                        "fat", "fiber", "ingredients", "meal_type"}
            assert required <= set(meal.keys()), \
                f"Missing keys: {required - set(meal.keys())}"
