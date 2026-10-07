from unittest.mock import MagicMock, patch

import pytest

from app.providers.food_data.usda import USDAProviderError
from app.schemas.food import FoodOut
from app.services.food_service import FoodService


def _make_food(slug, name, source):
    return FoodOut(id=1, slug=slug, name=name, kcal=50, protein=1, carbs=2, fat=3, fiber=4, sugar=5, sodium=6, tag="test", unit="serving", source=source)

def test_resolve_vision_slug_curated_success():
    food_service = FoodService(db=MagicMock())
    food_service.remote = MagicMock()
    food_service.local = MagicMock()
    
    curated_food = _make_food("usda-171688", "Apple, Raw", "usda")
    food_service.remote.get_curated.return_value = curated_food
    
    result = food_service.resolve_vision_slug("apple")
    
    assert result == curated_food
    food_service.remote.get_curated.assert_called_once_with("apple")
    food_service.local.get_by_slug.assert_not_called()

def test_resolve_vision_slug_falls_back_to_local_when_remote_returns_none():
    food_service = FoodService(db=MagicMock())
    food_service.remote = MagicMock()
    food_service.local = MagicMock()
    
    local_food = _make_food("local-apple", "Local Apple", "local")
    food_service.remote.get_curated.return_value = None
    food_service.local.get_by_slug.return_value = local_food
    
    result = food_service.resolve_vision_slug("apple")
    
    assert result == local_food
    food_service.remote.get_curated.assert_called_once_with("apple")
    food_service.local.get_by_slug.assert_called_once_with("apple")

def test_resolve_vision_slug_falls_back_to_local_when_no_remote():
    food_service = FoodService(db=MagicMock())
    food_service.remote = None
    food_service.local = MagicMock()
    
    local_food = _make_food("local-apple", "Local Apple", "local")
    food_service.local.get_by_slug.return_value = local_food
    
    result = food_service.resolve_vision_slug("apple")
    
    assert result == local_food
    food_service.local.get_by_slug.assert_called_once_with("apple")

def test_resolve_vision_slug_propagates_usda_error():
    food_service = FoodService(db=MagicMock())
    food_service.remote = MagicMock()
    food_service.local = MagicMock()
    
    food_service.remote.get_curated.side_effect = USDAProviderError("API failed")
    
    with pytest.raises(USDAProviderError):
        food_service.resolve_vision_slug("apple")
        
    food_service.local.get_by_slug.assert_not_called()

def test_resolve_vision_slug_unknown_food_returns_none():
    food_service = FoodService(db=MagicMock())
    food_service.remote = MagicMock()
    food_service.local = MagicMock()
    
    food_service.remote.get_curated.return_value = None
    food_service.local.get_by_slug.return_value = None
    food_service.remote.best_candidate.return_value = None
    
    result = food_service.resolve_vision_slug("unknown")
    assert result is None

def test_search_packaged_food_off_enabled():
    with patch("app.services.food_service.get_settings") as mock_settings:
        mock_settings.return_value.ENABLE_OPEN_FOOD_FACTS = True
        mock_settings.return_value.FOOD_PROVIDER = "local"
        
        with patch("app.services.food_service.OpenFoodFactsProvider") as mock_off_cls:
            mock_off = mock_off_cls.return_value
            food = FoodOut(id=None, slug="off-123", name="Chips", tag="Brand", unit="100 g", kcal=100, protein=2, carbs=10, fat=5, fiber=1, sugar=1, sodium=100, emoji="", estimated=False, source="openfoodfacts")
            mock_off.candidates.return_value = [food]
            
            service = FoodService(MagicMock())
            
            res = service.search_packaged_food("chips")
            assert res == [food]
            mock_off.candidates.assert_called_once_with("chips")

def test_resolve_barcode_off_enabled():
    with patch("app.services.food_service.get_settings") as mock_settings:
        mock_settings.return_value.ENABLE_OPEN_FOOD_FACTS = True
        mock_settings.return_value.FOOD_PROVIDER = "local"
        
        with patch("app.services.food_service.OpenFoodFactsProvider") as mock_off_cls:
            mock_off = mock_off_cls.return_value
            food = FoodOut(id=None, slug="off-123", name="Chips", tag="Brand", unit="100 g", kcal=100, protein=2, carbs=10, fat=5, fiber=1, sugar=1, sodium=100, emoji="", estimated=False, source="openfoodfacts")
            mock_off.get_by_barcode.return_value = food
            
            service = FoodService(MagicMock())
            
            res = service.resolve_barcode("123")
            assert res == food
            mock_off.get_by_barcode.assert_called_once_with("123")

def test_off_disabled_does_not_affect_behavior():
    with patch("app.services.food_service.get_settings") as mock_settings:
        mock_settings.return_value.ENABLE_OPEN_FOOD_FACTS = False
        mock_settings.return_value.FOOD_PROVIDER = "local"
        
        service = FoodService(MagicMock())
        assert service.packaged_provider is None
        
        res = service.search_packaged_food("chips")
        assert res == []
        
        res_bc = service.resolve_barcode("123")
        assert res_bc is None

def test_usda_resolution_remains_isolated():
    with patch("app.services.food_service.get_settings") as mock_settings:
        mock_settings.return_value.ENV = "test"
        mock_settings.return_value.ENABLE_OPEN_FOOD_FACTS = True
        mock_settings.return_value.FOOD_PROVIDER = "local"
        mock_settings.return_value.USDA_API_KEY = None
        
        with patch("app.services.food_service.OpenFoodFactsProvider") as mock_off_cls:
            mock_off = mock_off_cls.return_value
            service = FoodService(MagicMock())
            
            # resolve_vision_slug should not touch packaged_provider
            with patch.object(service.local, "get_by_slug", return_value=None):
                service.resolve_vision_slug("some-slug")
                mock_off.candidates.assert_not_called()
                mock_off.get_by_barcode.assert_not_called()
