import httpx
import pytest
from unittest.mock import patch

from app.providers.food_data.usda import UsdaFoodProvider, USDAProviderError, CURATED_RAW_FOODS

def test_curated_slug_maps_to_fdc_id():
    provider = UsdaFoodProvider("dummy_key")
    
    mock_resp = httpx.Response(200, json={
        "description": "Banana, raw",
        "foodCategory": {"description": "Fruits and Fruit Juices"},
        "foodNutrients": []
    }, request=httpx.Request("GET", "https://api.nal.usda.gov/fdc/v1/food/173944"))
    
    with patch("httpx.Client.get", return_value=mock_resp) as mock_get:
        result = provider.get_curated("banana")
        assert result is not None
        assert result.slug == "usda-173944"
        assert result.name == "Banana, Raw"
        assert result.tag == "Fruits and Fruit Juices"
        mock_get.assert_called_once_with("/food/173944", params={"api_key": "dummy_key"})

def test_unknown_slug_returns_none():
    provider = UsdaFoodProvider("dummy_key")
    result = provider.get_curated("unknown-slug")
    assert result is None

def test_missing_description_raises():
    provider = UsdaFoodProvider("dummy_key")
    mock_resp = httpx.Response(200, json={"foodNutrients": []}, request=httpx.Request("GET", "url"))
    with patch("httpx.Client.get", return_value=mock_resp):
        with pytest.raises(USDAProviderError, match="Malformed USDA response"):
            provider.get_curated("apple")

def test_foundation_nutrient_parsing():
    provider = UsdaFoodProvider("dummy_key")
    mock_resp = httpx.Response(200, json={
        "description": "Apple",
        "foodNutrients": [
            {"nutrient": {"id": 1008}, "amount": 52},   # kcal
            {"nutrient": {"id": 1003}, "amount": 0.3},  # protein
            {"nutrient": {"id": 1079}, "amount": 2.4},  # fiber
            {"nutrient": {"id": 9999}, "amount": 100}   # unknown, should be ignored
        ]
    }, request=httpx.Request("GET", "url"))
    
    with patch("httpx.Client.get", return_value=mock_resp):
        result = provider.get_curated("apple")
        assert result.kcal == 52.0
        assert result.protein == 0.3
        assert result.fiber == 2.4
        assert result.carbs == 0.0  # missing nutrients default to 0.0
        assert result.sugar == 0.0

def test_sr_legacy_nutrient_parsing():
    provider = UsdaFoodProvider("dummy_key")
    # SR Legacy usually has nutrientNumber at top level or inside nutrient
    mock_resp = httpx.Response(200, json={
        "description": "Apple",
        "foodNutrients": [
            {"nutrientNumber": "208", "value": 52},     # kcal
            {"nutrient": {"id": 203}, "amount": 0.3},   # protein
        ]
    }, request=httpx.Request("GET", "url"))
    
    with patch("httpx.Client.get", return_value=mock_resp):
        result = provider.get_curated("apple")
        assert result.kcal == 52.0
        assert result.protein == 0.3

def test_http_401_403_raises_auth_error():
    provider = UsdaFoodProvider("dummy_key")
    for status in (401, 403):
        mock_resp = httpx.Response(status, request=httpx.Request("GET", "url"))
        with patch("httpx.Client.get", return_value=mock_resp):
            with pytest.raises(USDAProviderError) as exc_info:
                provider.get_curated("apple")
            assert exc_info.value.code == "usda_auth_error"

def test_http_429_raises_rate_limit_error():
    provider = UsdaFoodProvider("dummy_key")
    mock_resp = httpx.Response(429, request=httpx.Request("GET", "url"))
    with patch("httpx.Client.get", return_value=mock_resp):
        with pytest.raises(USDAProviderError) as exc_info:
            provider.get_curated("apple")
        assert exc_info.value.code == "usda_rate_limit"

def test_http_5xx_raises_provider_error():
    provider = UsdaFoodProvider("dummy_key")
    mock_resp = httpx.Response(500, request=httpx.Request("GET", "url"))
    with patch("httpx.Client.get", return_value=mock_resp):
        with pytest.raises(USDAProviderError) as exc_info:
            provider.get_curated("apple")
        assert exc_info.value.code == "usda_provider_error"

def test_network_timeout_raises_provider_error():
    provider = UsdaFoodProvider("dummy_key")
    with patch("httpx.Client.get", side_effect=httpx.TimeoutException("timeout")):
        with pytest.raises(USDAProviderError) as exc_info:
            provider.get_curated("apple")
        assert exc_info.value.code == "usda_provider_error"

def test_candidates_propagates_errors_and_masks_api_key():
    provider = UsdaFoodProvider("secret-key-123")
    
    # 401 should propagate
    mock_resp = httpx.Response(401, request=httpx.Request("GET", "url?api_key=secret-key-123"))
    with patch("httpx.Client.get", return_value=mock_resp):
        with pytest.raises(USDAProviderError, match="REDACTED") as exc_info:
            provider.candidates("apple")
        assert exc_info.value.code == "usda_auth_error"
        assert "secret-key-123" not in str(exc_info.value)

def test_candidates_success():
    provider = UsdaFoodProvider("dummy_key")
    mock_resp = httpx.Response(200, json={
        "foods": [
            {
                "fdcId": 1234,
                "description": "Apple, raw",
                "foodCategory": "Fruit",
                "foodNutrients": [{"nutrientNumber": "208", "value": 52}]
            }
        ]
    }, request=httpx.Request("GET", "url"))
    
    with patch("httpx.Client.get", return_value=mock_resp):
        results = provider.candidates("apple")
        assert len(results) == 1
        assert results[0].id == 1234
        assert results[0].slug == "usda-1234"
        assert results[0].name == "Apple, Raw"
        assert results[0].kcal == 52.0
        assert results[0].source == "usda"
        assert results[0].estimated is False

def test_get_by_food_id_success():
    provider = UsdaFoodProvider("dummy_key")
    mock_resp = httpx.Response(200, json={
        "description": "Eggplant, raw",
        "foodCategory": {"description": "Vegetables"},
        "foodNutrients": [
            {"nutrient": {"id": 1008}, "amount": 25},
            {"nutrient": {"id": 1003}, "amount": 0.98},
            {"nutrient": {"id": 1005}, "amount": 5.88},
            {"nutrient": {"id": 1004}, "amount": 0.18},
        ]
    }, request=httpx.Request("GET", "url"))
    
    with patch("httpx.Client.get", return_value=mock_resp) as mock_get:
        food = provider.get(169228)
        assert food is not None
        assert food.id == 169228
        assert food.slug == "usda-169228"
        assert food.name == "Eggplant, Raw"
        assert food.tag == "Vegetables"
        assert food.source == "usda"
        assert food.estimated is False
        assert food.kcal == 25.0
        assert food.protein == 0.98
        mock_get.assert_called_once_with("/food/169228", params={"api_key": "dummy_key"})

def test_get_by_food_id_not_found():
    provider = UsdaFoodProvider("dummy_key")
    mock_resp = httpx.Response(404, request=httpx.Request("GET", "url"))
    with patch("httpx.Client.get", return_value=mock_resp):
        assert provider.get(999999) is None

def test_best_candidate_picks_raw_over_salad():
    provider = UsdaFoodProvider("dummy_key")
    mock_resp = httpx.Response(200, json={
        "foods": [
            {
                "fdcId": 1111,
                "description": "Cucumber Salad Made With Cucumber And Vinegar",
                "foodCategory": "Salads",
                "foodNutrients": [{"nutrientNumber": "208", "value": 45}]
            },
            {
                "fdcId": 2709784,
                "description": "Cucumber, Raw",
                "foodCategory": "Vegetables",
                "foodNutrients": [{"nutrientNumber": "208", "value": 16}]
            }
        ]
    }, request=httpx.Request("GET", "url"))
    
    with patch("httpx.Client.get", return_value=mock_resp):
        best = provider.best_candidate("cucumber")
        assert best is not None
        assert best.name == "Cucumber, Raw"
        assert best.id == 2709784
        assert best.kcal == 16.0

def test_best_candidate_picks_raw_avocado_over_dressing():
    provider = UsdaFoodProvider("dummy_key")
    mock_resp = httpx.Response(200, json={
        "foods": [
            {
                "fdcId": 2222,
                "description": "Avocado Dressing",
                "foodCategory": "Dressings",
                "foodNutrients": [{"nutrientNumber": "208", "value": 350}]
            },
            {
                "fdcId": 171705,
                "description": "Avocados, Raw",
                "foodCategory": "Fruits",
                "foodNutrients": [{"nutrientNumber": "208", "value": 160}]
            }
        ]
    }, request=httpx.Request("GET", "url"))
    
    with patch("httpx.Client.get", return_value=mock_resp):
        best = provider.best_candidate("avocado")
        assert best is not None
        assert best.name == "Avocados, Raw"
        assert best.id == 171705

def test_best_candidate_picks_raw_carrots_over_cake():
    provider = UsdaFoodProvider("dummy_key")
    mock_resp = httpx.Response(200, json={
        "foods": [
            {
                "fdcId": 3333,
                "description": "Carrot Cake With Cream Cheese Frosting",
                "foodCategory": "Cakes",
                "foodNutrients": [{"nutrientNumber": "208", "value": 415}]
            },
            {
                "fdcId": 170393,
                "description": "Carrots, Raw",
                "foodCategory": "Vegetables",
                "foodNutrients": [{"nutrientNumber": "208", "value": 41}]
            }
        ]
    }, request=httpx.Request("GET", "url"))
    
    with patch("httpx.Client.get", return_value=mock_resp):
        best = provider.best_candidate("carrot")
        assert best is not None
        assert best.name == "Carrots, Raw"
        assert best.id == 170393

def test_best_candidate_no_confident_match_returns_none():
    provider = UsdaFoodProvider("dummy_key")
    mock_resp = httpx.Response(200, json={
        "foods": [
            {
                "fdcId": 4444,
                "description": "Original Buffalo Style Chicken Wings",
                "foodCategory": "Poultry",
                "foodNutrients": [{"nutrientNumber": "208", "value": 250}]
            }
        ]
    }, request=httpx.Request("GET", "url"))
    
    with patch("httpx.Client.get", return_value=mock_resp):
        best = provider.best_candidate("blueberry")
        assert best is None

def test_best_candidate_empty_query():
    provider = UsdaFoodProvider("dummy_key")
    assert provider.best_candidate("") is None
    assert provider.best_candidate("   ") is None
