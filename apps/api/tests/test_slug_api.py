import pytest
from unittest.mock import patch, MagicMock
from app.schemas.food import FoodOut

def off_food():
    return FoodOut(
        id=None, slug="off-123", name="Chips", tag="Brand", unit="100 g",
        kcal=100, protein=2, carbs=10, fat=5, fiber=1, sugar=1, sodium=100,
        emoji="", estimated=False, source="openfoodfacts"
    )

@pytest.fixture
def mock_off_provider():
    with patch("app.services.food_service.OpenFoodFactsProvider") as mock:
        yield mock.return_value

@pytest.fixture
def mock_settings_enabled():
    with patch("app.services.food_service.get_settings") as mock_set:
        mock_set.return_value.ENABLE_OPEN_FOOD_FACTS = True
        yield mock_set

@pytest.fixture(autouse=True)
def override_auth(client):
    from app.api.deps import get_current_user
    from app.models.user import User
    
    async def mock_user():
        return User(id=1, email="test@test.com")
        
    client.app.dependency_overrides[get_current_user] = mock_user
    yield
    client.app.dependency_overrides.pop(get_current_user, None)

def test_nutrition_food_id_works(client, mock_off_provider, mock_settings_enabled):
    # Test food_id=1 exists
    res = client.post("/api/v1/nutrition/calculate", json={"food_id": 1, "servings": 2})
    assert res.status_code == 200
    assert "kcal" in res.json()

def test_nutrition_slug_works(client, mock_off_provider, mock_settings_enabled):
    mock_off_provider.get_by_barcode.return_value = off_food()
    res = client.post("/api/v1/nutrition/calculate", json={"slug": "off-123", "portion_grams": 150})
    assert res.status_code == 200
    data = res.json()
    assert data["kcal"] == 150.0 # 100 * 1.5

def test_nutrition_missing_both_identifiers(client):
    res = client.post("/api/v1/nutrition/calculate", json={"servings": 1})
    assert res.status_code == 422 # Pydantic error

def test_nutrition_both_identifiers_rejected(client):
    res = client.post("/api/v1/nutrition/calculate", json={"food_id": 1, "slug": "off-123"})
    assert res.status_code == 422

def test_nutrition_unresolved_slug(client, mock_off_provider, mock_settings_enabled):
    mock_off_provider.get_by_barcode.return_value = None
    res = client.post("/api/v1/nutrition/calculate", json={"slug": "off-unknown"})
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "food_not_found"

def test_meal_plan_add_item_slug(client, mock_off_provider, mock_settings_enabled):
    mock_off_provider.get_by_barcode.return_value = off_food()
    from app.core.clock import today
    day = today().isoformat()
    res = client.post(f"/api/v1/meal-plans/{day}/slots/lunch/items", json={"slug": "off-123", "portion_grams": 50})
    assert res.status_code == 200
    lunch = [s for s in res.json()["meals"] if s["slot"] == "lunch"][-1]
    assert lunch["name"] == "Chips"
    assert lunch["kcal"] == 50.0

def test_tracking_log_slug(client, mock_off_provider, mock_settings_enabled):
    mock_off_provider.get_by_barcode.return_value = off_food()
    res = client.post("/api/v1/tracking/logs", json={"slug": "off-123", "slot": "snack", "portion_grams": 200})
    assert res.status_code == 201
    assert res.json()["name"] == "Chips"
    assert res.json()["kcal"] == 200.0
    assert res.json()["fiber"] == 2.0

def test_tracking_custom_food_remains_intact(client):
    res = client.post("/api/v1/tracking/logs", json={"custom": {"name": "My Food", "kcal": 50, "protein": 0, "carbs": 0, "fat": 0}, "slot": "snack"})
    assert res.status_code == 201
    assert res.json()["name"] == "My Food"
    assert res.json()["kcal"] == 50.0
