from unittest.mock import patch

import httpx
import pytest

from app.core.config import Settings
from app.providers.food_data.usda import USDAProviderError
from app.schemas.food import FoodOut
from app.services import nutrition_service
from app.services.food_service import FoodService

USDA_BRINJAL_SEARCH_ITEM = {
    "fdcId": 169228,
    "description": "Eggplant, raw",
    "foodCategory": "Vegetables and Vegetable Products",
    "foodNutrients": [
        {"nutrientNumber": "208", "value": 25.0},
        {"nutrientNumber": "203", "value": 0.98},
        {"nutrientNumber": "205", "value": 5.88},
        {"nutrientNumber": "204", "value": 0.18},
        {"nutrientNumber": "291", "value": 3.0},
        {"nutrientNumber": "269", "value": 3.53},
        {"nutrientNumber": "307", "value": 2.0},
    ],
}

USDA_BRINJAL_DETAIL = {
    "description": "Eggplant, raw",
    "foodCategory": {"description": "Vegetables and Vegetable Products"},
    "foodNutrients": [
        {"nutrient": {"id": 1008}, "amount": 25.0},
        {"nutrient": {"id": 1003}, "amount": 0.98},
        {"nutrient": {"id": 1005}, "amount": 5.88},
        {"nutrient": {"id": 1004}, "amount": 0.18},
        {"nutrient": {"id": 1079}, "amount": 3.0},
        {"nutrient": {"id": 2000}, "amount": 3.53},
        {"nutrient": {"id": 1093}, "amount": 2.0},
    ],
}


@pytest.fixture
def usda_settings():
    from app.core.config import get_settings
    get_settings.cache_clear()
    return Settings(
        DATABASE_URL="sqlite:///:memory:",
        USDA_API_KEY="test_usda_key",
        FOOD_PROVIDER="usda",
    )


def test_plural_pizzas_matches_pizza(db):
    r = FoodService(db).search("pizzas")
    assert r.items, "expected results"
    assert all("Pizza" in f.name for f in r.items[:3])
    assert r.estimate is None


def test_exact_name_ranks_first(db):
    assert FoodService(db).search("roti").items[0].name == "Roti"
    assert FoodService(db).search("masala dosa").items[0].name == "Masala Dosa"


def test_alias_match(db):
    assert FoodService(db).search("chapati").items[0].name == "Roti"


def test_unknown_food_returns_estimate(db):
    r = FoodService(db).search("mutton kebab platter")
    assert r.estimate is not None and r.estimate.estimated
    assert r.estimate.kcal == 420


def test_limit(db):
    assert len(FoodService(db).search("chicken", limit=3).items) == 3


# -----------------------------------------------------------------------------
# REQUIRED BEHAVIOR TESTS (1-8)
# -----------------------------------------------------------------------------


def test_1_local_catalog_search_still_works(db, usda_settings):
    """1. Local catalog search still works and does not query USDA."""
    with patch("app.core.config.get_settings", return_value=usda_settings), \
         patch("app.services.food_service.get_settings", return_value=usda_settings):
        service = FoodService(db)
        with patch.object(service.remote, "candidates") as mock_usda_search:
            res = service.search("roti")
            assert len(res.items) > 0
            assert res.items[0].name == "Roti"
            assert res.items[0].source == "local"
            assert res.items[0].estimated is False
            assert res.estimate is None
            mock_usda_search.assert_not_called()


def test_2_unknown_food_brinjal_falls_back_to_usda_search(db, usda_settings):
    """2. Unknown food 'brinjal' falls back to USDA search."""
    mock_search_resp = httpx.Response(
        200,
        json={"foods": [USDA_BRINJAL_SEARCH_ITEM]},
        request=httpx.Request("GET", "https://api.nal.usda.gov/fdc/v1/foods/search"),
    )
    with patch("app.core.config.get_settings", return_value=usda_settings), \
         patch("app.services.food_service.get_settings", return_value=usda_settings), \
         patch("httpx.Client.get", return_value=mock_search_resp) as mock_get:
        service = FoodService(db)
        res = service.search("brinjal")
        assert len(res.items) == 1
        assert res.items[0].name == "Eggplant, Raw"
        assert res.estimate is None
        mock_get.assert_called_once()
        assert "/foods/search" in mock_get.call_args[0][0]
        assert mock_get.call_args[1]["params"]["query"] == "brinjal"


def test_3_usda_search_result_contains_real_fdc_id(db, usda_settings):
    """3. USDA search result contains a real FDC ID, slug, and source=usda."""
    mock_search_resp = httpx.Response(
        200,
        json={"foods": [USDA_BRINJAL_SEARCH_ITEM]},
        request=httpx.Request("GET", "https://api.nal.usda.gov/fdc/v1/foods/search"),
    )
    with patch("app.core.config.get_settings", return_value=usda_settings), \
         patch("app.services.food_service.get_settings", return_value=usda_settings), \
         patch("httpx.Client.get", return_value=mock_search_resp):
        service = FoodService(db)
        res = service.search("brinjal")
        item = res.items[0]
        assert item.id == 169228
        assert item.slug == "usda-169228"
        assert item.source == "usda"
        assert item.estimated is False
        assert item.unit == "100 g"


def test_4_selecting_usda_result_successfully_calculates_nutrition(db, usda_settings):
    """4. Selecting the USDA result successfully calculates nutrition via food_id."""
    mock_detail_resp = httpx.Response(
        200,
        json=USDA_BRINJAL_DETAIL,
        request=httpx.Request("GET", "https://api.nal.usda.gov/fdc/v1/food/169228"),
    )
    with patch("app.core.config.get_settings", return_value=usda_settings), \
         patch("app.services.food_service.get_settings", return_value=usda_settings), \
         patch("httpx.Client.get", return_value=mock_detail_resp) as mock_get:
        service = FoodService(db)
        food = service.resolve_target(food_id=169228)
        assert food.id == 169228
        assert food.name == "Eggplant, Raw"
        facts = nutrition_service.scale(food, servings=2.0)
        assert facts.kcal == 50.0
        assert facts.protein == 2.0
        assert facts.carbs == 11.8
        mock_get.assert_called_once_with("/food/169228", params={"api_key": "test_usda_key"})


def test_5_usda_nutrition_values_reach_api_response_correctly(client, usda_settings):
    """5. USDA nutrition values reach the API response correctly (search -> calculate)."""
    usda_item = FoodOut(
        id=169228,
        slug="usda-169228",
        name="Eggplant, Raw",
        tag="Vegetables and Vegetable Products",
        unit="100 g",
        source="usda",
        estimated=False,
        kcal=25.0,
        protein=0.98,
        carbs=5.88,
        fat=0.18,
        fiber=3.0,
        sugar=3.53,
        sodium=2.0,
    )
    with patch("app.core.config.get_settings", return_value=usda_settings), \
         patch("app.services.food_service.get_settings", return_value=usda_settings), \
         patch("app.providers.food_data.usda.UsdaFoodProvider.candidates", return_value=[usda_item]), \
         patch("app.providers.food_data.usda.UsdaFoodProvider.get", return_value=usda_item):
        # 1. Search foods
        s_res = client.get("/api/v1/foods/search?q=brinjal")
        assert s_res.status_code == 200
        s_data = s_res.json()
        assert len(s_data["items"]) == 1
        item = s_data["items"][0]
        assert item["id"] == 169228
        assert item["slug"] == "usda-169228"
        assert item["source"] == "usda"
        assert item["estimated"] is False

        # 2. Calculate nutrition using food_id
        c_res = client.post("/api/v1/nutrition/calculate", json={"food_id": item["id"], "servings": 2})
        assert c_res.status_code == 200
        c_data = c_res.json()
        assert c_data["kcal"] == 50.0
        assert c_data["protein"] == 2.0
        assert c_data["carbs"] == 11.8
        assert c_data["fat"] == 0.4
        assert c_data["fiber"] == 6.0
        assert c_data["sugar"] == 7.1
        assert c_data["sodium"] == 4.0
        assert c_data["servings"] == 2.0


def test_6_usda_no_match_does_not_produce_0_kcal(client, usda_settings):
    """6. USDA no-match does not produce 0 kcal or fabricate an estimate."""
    with patch("app.core.config.get_settings", return_value=usda_settings), \
         patch("app.services.food_service.get_settings", return_value=usda_settings), \
         patch("app.providers.food_data.usda.UsdaFoodProvider.candidates", return_value=[]):
        res = client.get("/api/v1/foods/search?q=zorblax")
        assert res.status_code == 200
        data = res.json()
        assert data["items"] == []
        assert data["estimate"] is None


def test_7_usda_provider_failure_propagates_correctly(client, usda_settings):
    """7. USDA provider failure propagates correctly and does not silently produce fake nutrition."""
    with patch("app.core.config.get_settings", return_value=usda_settings), \
         patch("app.services.food_service.get_settings", return_value=usda_settings), \
         patch("app.providers.food_data.usda.UsdaFoodProvider.candidates", side_effect=USDAProviderError("USDA API down", code="usda_provider_error")), \
         patch("app.providers.food_data.usda.UsdaFoodProvider.get", side_effect=USDAProviderError("USDA API down", code="usda_provider_error")):
        # Search failure propagates
        s_res = client.get("/api/v1/foods/search?q=brinjal")
        assert s_res.status_code == 502
        assert s_res.json()["error"]["code"] == "usda_provider_error"

        # Calculate failure propagates
        c_res = client.post("/api/v1/nutrition/calculate", json={"food_id": 169228, "servings": 1})
        assert c_res.status_code == 502
        assert c_res.json()["error"]["code"] == "usda_provider_error"


def test_8_existing_local_food_nutrition_remains_unchanged(client, usda_settings):
    """8. Existing local-food nutrition calculation remains unchanged."""
    with patch("app.core.config.get_settings", return_value=usda_settings), \
         patch("app.services.food_service.get_settings", return_value=usda_settings):
        # Calculate by food_id (1 is Chicken Biryani: 680 kcal)
        res1 = client.post("/api/v1/nutrition/calculate", json={"food_id": 1, "servings": 2})
        assert res1.status_code == 200
        data1 = res1.json()
        assert data1["kcal"] == 1360.0
        assert data1["protein"] == 56.0

        # Calculate by slug
        res2 = client.post("/api/v1/nutrition/calculate", json={"slug": "banana", "servings": 1})
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["kcal"] == 105.0
        assert data2["protein"] == 1.3

