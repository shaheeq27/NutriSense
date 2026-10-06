import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.food import FoodOut
from app.providers.food_data.openfoodfacts import OFFProviderError

# Ensure we bypass authentication for these public/read endpoints if auth is required, 
# or just use the dependency override if necessary.
# Let's check if /foods endpoints require auth. In NutriSense, /foods is probably protected?
# We'll just use the standard `client` and `auth` fixtures.

# The user explicitly asked to "Mock the OFF provider/service. Do not make real Open Food Facts network requests."
# We can mock `FoodService.packaged_provider` or `OpenFoodFactsProvider`.

@pytest.fixture
def mock_off_provider():
    with patch("app.services.food_service.OpenFoodFactsProvider") as mock:
        yield mock.return_value

@pytest.fixture
def mock_settings_enabled():
    with patch("app.services.food_service.get_settings") as mock_set:
        mock_set.return_value.ENABLE_OPEN_FOOD_FACTS = True
        yield mock_set

@pytest.fixture
def mock_settings_disabled():
    with patch("app.services.food_service.get_settings") as mock_set:
        mock_set.return_value.ENABLE_OPEN_FOOD_FACTS = False
        yield mock_set

def test_packaged_search_success(client, auth, mock_off_provider, mock_settings_enabled):
    food = FoodOut(id=None, slug="off-123", name="Chips", tag="Brand", unit="100 g", kcal=100, protein=2, carbs=10, fat=5, fiber=1, sugar=1, sodium=100, emoji="", estimated=False, source="openfoodfacts")
    mock_off_provider.candidates.return_value = [food]
    
    res = client.get("/api/v1/foods/packaged/search?q=chips", headers=auth)
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    assert data[0]["name"] == "Chips"

def test_packaged_search_empty(client, auth, mock_off_provider, mock_settings_enabled):
    mock_off_provider.candidates.return_value = []
    
    res = client.get("/api/v1/foods/packaged/search?q=unknown", headers=auth)
    assert res.status_code == 200
    assert res.json() == []

def test_packaged_search_disabled(client, auth, mock_settings_disabled):
    res = client.get("/api/v1/foods/packaged/search?q=chips", headers=auth)
    assert res.status_code == 200
    assert res.json() == []

def test_barcode_lookup_success(client, auth, mock_off_provider, mock_settings_enabled):
    food = FoodOut(id=None, slug="off-123", name="Chips", tag="Brand", unit="100 g", kcal=100, protein=2, carbs=10, fat=5, fiber=1, sugar=1, sodium=100, emoji="", estimated=False, source="openfoodfacts")
    mock_off_provider.get_by_barcode.return_value = food
    
    res = client.get("/api/v1/foods/barcode/12345", headers=auth)
    assert res.status_code == 200
    assert res.json()["name"] == "Chips"

def test_barcode_lookup_not_found(client, auth, mock_off_provider, mock_settings_enabled):
    mock_off_provider.get_by_barcode.return_value = None
    
    res = client.get("/api/v1/foods/barcode/unknown", headers=auth)
    assert res.status_code == 404
    assert res.json()["error"]["message"] == "Barcode not found"

def test_barcode_lookup_disabled(client, auth, mock_settings_disabled):
    res = client.get("/api/v1/foods/barcode/12345", headers=auth)
    assert res.status_code == 404
    assert res.json()["error"]["message"] == "Barcode not found"

def test_off_provider_error_propagates_as_502(client, auth, mock_off_provider, mock_settings_enabled):
    mock_off_provider.candidates.side_effect = OFFProviderError("Network timeout", code="off_provider_error")
    
    res = client.get("/api/v1/foods/packaged/search?q=chips", headers=auth)
    assert res.status_code == 502
    assert "Network timeout" in res.json()["error"]["message"]

