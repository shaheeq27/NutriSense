import pytest
import httpx
from unittest.mock import Mock, patch
from app.providers.food_data.openfoodfacts import OpenFoodFactsProvider, OFFProviderError

@pytest.fixture
def mock_client():
    client = Mock()
    return client

@pytest.fixture
def provider(mock_client):
    return OpenFoodFactsProvider(client=mock_client)

def test_candidates_success(provider, mock_client):
    mock_response = Mock()
    mock_response.json.return_value = {
        "products": [
            {
                "_id": "0012345678905",
                "product_name": "Test Snack",
                "brands": "BrandA, BrandB",
                "nutriments": {
                    "energy-kcal_100g": 500,
                    "proteins_100g": 10,
                    "carbohydrates_100g": 60,
                    "fat_100g": 20,
                    "fiber_100g": 5,
                    "sugars_100g": 15,
                    "sodium_100g": 0.4
                }
            }
        ]
    }
    mock_client.get.return_value = mock_response

    res = provider.candidates("snack")
    assert len(res) == 1
    f = res[0]
    assert f.slug == "off-0012345678905"
    assert f.name == "Test Snack"
    assert f.tag == "BrandA"
    assert f.kcal == 500
    assert f.protein == 10
    assert f.carbs == 60
    assert f.fat == 20
    assert f.fiber == 5
    assert f.sugar == 15
    assert f.sodium == 400
    assert f.source == "openfoodfacts"

def test_candidates_empty(provider, mock_client):
    mock_response = Mock()
    mock_response.json.return_value = {"products": []}
    mock_client.get.return_value = mock_response

    res = provider.candidates("unknown")
    assert res == []

def test_candidates_malformed_product(provider, mock_client):
    mock_response = Mock()
    mock_response.json.return_value = {
        "products": [
            {"product_name": "No Nutriments"},  # missing nutriments
            {"nutriments": {"energy-kcal_100g": 100}}, # missing name
            {
                "product_name": "Missing kcal",
                "nutriments": {"proteins_100g": 10}
            }
        ]
    }
    mock_client.get.return_value = mock_response

    res = provider.candidates("bad")
    assert res == []

def test_candidates_http_failure(provider, mock_client):
    # Simulate a 500 error
    resp = Mock()
    resp.status_code = 500
    err = httpx.HTTPStatusError("Server error", request=Mock(), response=resp)
    mock_client.get.side_effect = err

    with pytest.raises(OFFProviderError) as exc:
        provider.candidates("error")
    assert exc.value.status_code == 502

def test_candidates_timeout(provider, mock_client):
    # Simulate a timeout
    err = httpx.RequestError("Timeout", request=Mock())
    mock_client.get.side_effect = err

    with pytest.raises(OFFProviderError) as exc:
        provider.candidates("timeout")
    assert exc.value.status_code == 502

def test_get_by_barcode_success(provider, mock_client):
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "status": 1,
        "product": {
            "_id": "12345",
            "product_name": "Barcode Item",
            "brands": "BarcodeBrand",
            "nutriments": {
                "energy-kcal_100g": 100,
                "proteins_100g": 5,
                "carbohydrates_100g": 10,
                "fat_100g": 2
            }
        }
    }
    mock_client.get.return_value = mock_response

    f = provider.get_by_barcode("12345")
    assert f is not None
    assert f.name == "Barcode Item"
    assert f.tag == "BarcodeBrand"
    assert f.kcal == 100
    assert f.protein == 5
    assert f.carbs == 10
    assert f.fat == 2

def test_get_by_barcode_not_found(provider, mock_client):
    mock_response = Mock()
    mock_response.status_code = 404
    mock_client.get.return_value = mock_response

    f = provider.get_by_barcode("000")
    assert f is None

def test_get_by_barcode_status_0(provider, mock_client):
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"status": 0, "status_verbose": "product not found"}
    mock_client.get.return_value = mock_response

    f = provider.get_by_barcode("000")
    assert f is None

def test_candidates_missing_core_macros(provider, mock_client):
    mock_response = Mock()
    mock_response.json.return_value = {
        "products": [
            {
                "product_name": "No Carbs",
                "nutriments": {
                    "energy-kcal_100g": 100,
                    "proteins_100g": 10,
                    "fat_100g": 5
                    # Missing carbs
                }
            },
            {
                "product_name": "No Protein",
                "nutriments": {
                    "energy-kcal_100g": 100,
                    "carbohydrates_100g": 10,
                    "fat_100g": 5
                    # Missing protein
                }
            }
        ]
    }
    mock_client.get.return_value = mock_response

    res = provider.candidates("bad")
    assert res == []

def test_malformed_macros_dropped(provider, mock_client):
    mock_response = Mock()
    mock_response.json.return_value = {
        "products": [
            {
                "product_name": "Bad Carbs",
                "nutriments": {
                    "energy-kcal_100g": 100,
                    "proteins_100g": 10,
                    "fat_100g": 5,
                    "carbohydrates_100g": "N/A"
                }
            },
            {
                "product_name": "Bad Protein NaN",
                "nutriments": {
                    "energy-kcal_100g": 100,
                    "proteins_100g": float("nan"),
                    "fat_100g": 5,
                    "carbohydrates_100g": 10
                }
            }
        ]
    }
    mock_client.get.return_value = mock_response

    res = provider.candidates("malformed")
    assert res == []

def test_casing_preserved(provider, mock_client):
    mock_response = Mock()
    mock_response.json.return_value = {
        "products": [
            {
                "_id": "001",
                "product_name": "M&M's",
                "nutriments": {
                    "energy-kcal_100g": 100,
                    "proteins_100g": 10,
                    "carbohydrates_100g": 10,
                    "fat_100g": 5
                }
            }
        ]
    }
    mock_client.get.return_value = mock_response

    res = provider.candidates("candy")
    assert len(res) == 1
    assert res[0].name == "M&M's"

def test_barcode_missing_core_macros(provider, mock_client):
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "status": 1,
        "product": {
            "product_name": "Missing Fat",
            "nutriments": {
                "energy-kcal_100g": 100,
                "proteins_100g": 10,
                "carbohydrates_100g": 10
                # missing fat
            }
        }
    }
    mock_client.get.return_value = mock_response

    f = provider.get_by_barcode("123")
    assert f is None

def test_barcode_malformed_macros_dropped(provider, mock_client):
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "status": 1,
        "product": {
            "product_name": "Bad Protein",
            "nutriments": {
                "energy-kcal_100g": 100,
                "proteins_100g": "~10",
                "carbohydrates_100g": 10,
                "fat_100g": 5
            }
        }
    }
    mock_client.get.return_value = mock_response

    f = provider.get_by_barcode("123")
    assert f is None
