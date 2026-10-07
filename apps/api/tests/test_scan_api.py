from unittest.mock import patch

import httpx
import pytest

from app.core.config import Settings


@pytest.fixture
def fake_settings():
    from app.core.config import get_settings
    get_settings.cache_clear()
    return Settings(
        DATABASE_URL="sqlite:///:memory:",
        GEMINI_API_KEY="test_gemini",
        USDA_API_KEY="test_usda",
        VISION_PROVIDER="gemini",
        FOOD_PROVIDER="usda",
        OPENROUTER_API_KEY=None
    )

def test_identify_api_full_flow(client, fake_settings):
    # Mock Gemini Vision response
    gemini_resp = httpx.Response(200, json={
        "candidates": [{
            "content": {
                "parts": [{"text": '[{"label": "apple", "confidence": 0.95}]'}]
            }
        }]
    }, request=httpx.Request("POST", "url"))

    # Mock USDA FDC Curated response (171688 = apple)
    usda_resp = httpx.Response(200, json={
        "description": "Apple, raw",
        "foodCategory": {"description": "Fruit"},
        "foodNutrients": [
            {"nutrient": {"id": 1008}, "amount": 52},   # kcal
            {"nutrient": {"id": 1003}, "amount": 0.3},  # protein
            {"nutrient": {"id": 1005}, "amount": 14},   # carbs
            {"nutrient": {"id": 1004}, "amount": 0.2},  # fat
            {"nutrient": {"id": 1079}, "amount": 2.4},  # fiber
            {"nutrient": {"id": 2000}, "amount": 10.4}, # sugar
            {"nutrient": {"id": 1093}, "amount": 1}     # sodium
        ]
    }, request=httpx.Request("GET", "url"))

    with patch('app.core.config.get_settings', return_value=fake_settings), \
         patch('app.services.food_service.get_settings', return_value=fake_settings), \
         patch('app.services.scan_service.get_settings', return_value=fake_settings), \
         patch('httpx.post', return_value=gemini_resp), \
         patch('httpx.Client.get', return_value=usda_resp) as mock_usda_get:
         
        r = client.post(
            "/api/v1/scan/identify",
            files={"image": ("apple.jpg", b"\xff\xd8fakejpeg", "image/jpeg")}
        )
        
        assert r.status_code == 200
        data = r.json()
        assert data["provider"] == "gemini"
        assert len(data["candidates"]) == 1
        
        candidate = data["candidates"][0]
        assert candidate["confidence"] == 0.95
        
        # Verify USDA data mapping
        food = candidate["food"]
        assert food["slug"] == "usda-171688"
        assert food["name"] == "Apple, Raw"
        assert food["kcal"] == 52.0
        assert food["protein"] == 0.3
        
        # Ensure USDA endpoint was called with correct ID for 'apple'
        mock_usda_get.assert_called_once()
        args, kwargs = mock_usda_get.call_args
        assert "/food/171688" in args[0]
        assert kwargs["params"]["api_key"] == "test_usda"

def test_identify_api_gemini_error(client, fake_settings):
    with patch('app.core.config.get_settings', return_value=fake_settings), \
         patch('app.services.food_service.get_settings', return_value=fake_settings), \
         patch('app.services.scan_service.get_settings', return_value=fake_settings), \
         patch('httpx.post', side_effect=httpx.TimeoutException("timeout")):
         
        r = client.post(
            "/api/v1/scan/identify",
            files={"image": ("apple.jpg", b"\xff\xd8fakejpeg", "image/jpeg")}
        )
        
        assert r.status_code == 502
        data = r.json()
        assert "error" in data
        assert data["error"]["code"] == "vision_provider_error"
        assert "timeout" in data["error"]["message"]

def test_identify_api_usda_error(client, fake_settings):
    # Gemini succeeds, USDA fails
    gemini_resp = httpx.Response(200, json={
        "candidates": [{
            "content": {
                "parts": [{"text": '[{"label": "apple", "confidence": 0.95}]'}]
            }
        }]
    }, request=httpx.Request("POST", "url"))

    with patch('app.core.config.get_settings', return_value=fake_settings), \
         patch('app.services.food_service.get_settings', return_value=fake_settings), \
         patch('app.services.scan_service.get_settings', return_value=fake_settings), \
         patch('httpx.post', return_value=gemini_resp), \
         patch('httpx.Client.get', side_effect=httpx.TimeoutException("timeout")):
         
        r = client.post(
            "/api/v1/scan/identify",
            files={"image": ("apple.jpg", b"\xff\xd8fakejpeg", "image/jpeg")}
        )
        
        assert r.status_code == 502
        data = r.json()
        assert "error" in data
        assert data["error"]["code"] == "usda_provider_error"
        assert "timeout" in data["error"]["message"]

def test_identify_api_uncataloged_zucchini_resolves_via_usda_search(client, fake_settings):
    """Zucchini is not in CURATED_RAW_FOODS or local catalog; resolves via USDA search best candidate."""
    gemini_resp = httpx.Response(200, json={
        "candidates": [{
            "content": {
                "parts": [{"text": '[{"label": "zucchini", "confidence": 0.92}]'}]
            }
        }]
    }, request=httpx.Request("POST", "url"))

    # USDA returns a processed bread first and raw zucchini second
    usda_search_resp = httpx.Response(200, json={
        "foods": [
            {
                "fdcId": 999901,
                "description": "Zucchini Bread",
                "foodCategory": "Baked Goods",
                "foodNutrients": [{"nutrientNumber": "208", "value": 320.0}]
            },
            {
                "fdcId": 169291,
                "description": "Squash, Summer, Zucchini, Includes Skin, Raw",
                "foodCategory": "Vegetables and Vegetable Products",
                "foodNutrients": [
                    {"nutrientNumber": "208", "value": 17.0},
                    {"nutrientNumber": "203", "value": 1.2},
                    {"nutrientNumber": "205", "value": 3.1},
                    {"nutrientNumber": "204", "value": 0.3},
                    {"nutrientNumber": "291", "value": 1.0},
                    {"nutrientNumber": "269", "value": 2.5},
                    {"nutrientNumber": "307", "value": 8.0}
                ]
            }
        ]
    }, request=httpx.Request("GET", "url"))

    with patch('app.core.config.get_settings', return_value=fake_settings), \
         patch('app.services.food_service.get_settings', return_value=fake_settings), \
         patch('app.services.scan_service.get_settings', return_value=fake_settings), \
         patch('httpx.post', return_value=gemini_resp), \
         patch('httpx.Client.get', return_value=usda_search_resp) as mock_usda_get:

        r = client.post(
            "/api/v1/scan/identify",
            files={"image": ("zucchini.jpg", b"\xff\xd8fakejpeg", "image/jpeg")}
        )

        assert r.status_code == 200
        data = r.json()
        assert data["provider"] == "gemini"
        assert len(data["candidates"]) == 1
        c = data["candidates"][0]
        assert c["confidence"] == 0.92

        # Verify best_candidate picked raw zucchini over zucchini bread
        food = c["food"]
        assert food["slug"] == "usda-169291"
        assert food["name"] == "Squash, Summer, Zucchini, Includes Skin, Raw"
        assert food["kcal"] == 17.0
        assert food["protein"] == 1.2
        assert food["carbs"] == 3.1
        assert food["fat"] == 0.3
        assert food["fiber"] == 1.0
        assert food["source"] == "usda"
        assert food["estimated"] is False

        mock_usda_get.assert_called_once()
        args, kwargs = mock_usda_get.call_args
        assert "/foods/search" in args[0]
        assert kwargs["params"]["query"] == "zucchini"

def test_identify_api_uncataloged_blueberries_resolves_via_usda_search(client, fake_settings):
    """Blueberries are uncataloged; verify authoritative USDA whole food resolution."""
    gemini_resp = httpx.Response(200, json={
        "candidates": [{
            "content": {
                "parts": [{"text": '[{"label": "blueberries", "confidence": 0.89}]'}]
            }
        }]
    }, request=httpx.Request("POST", "url"))

    usda_search_resp = httpx.Response(200, json={
        "foods": [
            {
                "fdcId": 171711,
                "description": "Blueberries, Raw",
                "foodCategory": "Fruits and Fruit Juices",
                "foodNutrients": [
                    {"nutrientNumber": "208", "value": 57.0},
                    {"nutrientNumber": "203", "value": 0.7},
                    {"nutrientNumber": "205", "value": 14.5},
                    {"nutrientNumber": "204", "value": 0.3},
                    {"nutrientNumber": "291", "value": 2.4}
                ]
            }
        ]
    }, request=httpx.Request("GET", "url"))

    with patch('app.core.config.get_settings', return_value=fake_settings), \
         patch('app.services.food_service.get_settings', return_value=fake_settings), \
         patch('app.services.scan_service.get_settings', return_value=fake_settings), \
         patch('httpx.post', return_value=gemini_resp), \
         patch('httpx.Client.get', return_value=usda_search_resp):

        r = client.post(
            "/api/v1/scan/identify",
            files={"image": ("blueberries.jpg", b"\xff\xd8fakejpeg", "image/jpeg")}
        )

        assert r.status_code == 200
        data = r.json()
        assert len(data["candidates"]) == 1
        food = data["candidates"][0]["food"]
        assert food["name"] == "Blueberries, Raw"
        assert food["kcal"] == 57.0
        assert food["source"] == "usda"
        assert food["estimated"] is False

def test_identify_api_uncataloged_food_no_confident_match(client, fake_settings):
    """When USDA returns no confident whole food match, candidate is dropped cleanly."""
    gemini_resp = httpx.Response(200, json={
        "candidates": [{
            "content": {
                "parts": [{"text": '[{"label": "exoticfruit", "confidence": 0.70}]'}]
            }
        }]
    }, request=httpx.Request("POST", "url"))

    # USDA returns only totally unrelated products
    usda_search_resp = httpx.Response(200, json={
        "foods": [
            {
                "fdcId": 8888,
                "description": "Completely Unrelated Candy Bar",
                "foodCategory": "Sweets",
                "foodNutrients": []
            }
        ]
    }, request=httpx.Request("GET", "url"))

    with patch('app.core.config.get_settings', return_value=fake_settings), \
         patch('app.services.food_service.get_settings', return_value=fake_settings), \
         patch('app.services.scan_service.get_settings', return_value=fake_settings), \
         patch('httpx.post', return_value=gemini_resp), \
         patch('httpx.Client.get', return_value=usda_search_resp):

        r = client.post(
            "/api/v1/scan/identify",
            files={"image": ("food.jpg", b"\xff\xd8fakejpeg", "image/jpeg")}
        )

        assert r.status_code == 200
        data = r.json()
        assert data["candidates"] == []

def test_identify_api_non_food_rejection_no_usda_calls(client, fake_settings):
    """When Gemini rejects non-food (logo/object), no USDA requests are made."""
    gemini_resp = httpx.Response(200, json={
        "candidates": [{
            "content": {
                "parts": [{"text": '[]'}]
            }
        }]
    }, request=httpx.Request("POST", "url"))

    with patch('app.core.config.get_settings', return_value=fake_settings), \
         patch('app.services.food_service.get_settings', return_value=fake_settings), \
         patch('app.services.scan_service.get_settings', return_value=fake_settings), \
         patch('httpx.post', return_value=gemini_resp), \
         patch('httpx.Client.get') as mock_usda_get:

        r = client.post(
            "/api/v1/scan/identify",
            files={"image": ("logo.png", b"\x89PNGfakebytes", "image/png")}
        )

        assert r.status_code == 200
        data = r.json()
        assert data["candidates"] == []
        mock_usda_get.assert_not_called()

def test_identify_api_malformed_gemini_prose_rejected(client, fake_settings):
    """When Gemini returns conversational prose instead of clean food labels, parser rejects it."""
    gemini_resp = httpx.Response(200, json={
        "candidates": [{
            "content": {
                "parts": [{"text": 'This is a lovely plate of delicious food with some greens.'}]
            }
        }]
    }, request=httpx.Request("POST", "url"))

    with patch('app.core.config.get_settings', return_value=fake_settings), \
         patch('app.services.food_service.get_settings', return_value=fake_settings), \
         patch('app.services.scan_service.get_settings', return_value=fake_settings), \
         patch('httpx.post', return_value=gemini_resp), \
         patch('httpx.Client.get') as mock_usda_get:

        r = client.post(
            "/api/v1/scan/identify",
            files={"image": ("plate.jpg", b"\xff\xd8fakejpeg", "image/jpeg")}
        )

        assert r.status_code == 200
        data = r.json()
        assert data["candidates"] == []
        mock_usda_get.assert_not_called()

def test_identify_api_uncataloged_usda_search_timeout_returns_502(client, fake_settings):
    """When USDA search times out during uncataloged food lookup, return 502 with usda_provider_error."""
    gemini_resp = httpx.Response(200, json={
        "candidates": [{
            "content": {
                "parts": [{"text": '[{"label": "zucchini", "confidence": 0.90}]'}]
            }
        }]
    }, request=httpx.Request("POST", "url"))

    with patch('app.core.config.get_settings', return_value=fake_settings), \
         patch('app.services.food_service.get_settings', return_value=fake_settings), \
         patch('app.services.scan_service.get_settings', return_value=fake_settings), \
         patch('httpx.post', return_value=gemini_resp), \
         patch('httpx.Client.get', side_effect=httpx.TimeoutException("Search timeout")):

        r = client.post(
            "/api/v1/scan/identify",
            files={"image": ("zucchini.jpg", b"\xff\xd8fakejpeg", "image/jpeg")}
        )

        assert r.status_code == 502
        data = r.json()
        assert data["error"]["code"] == "usda_provider_error"
