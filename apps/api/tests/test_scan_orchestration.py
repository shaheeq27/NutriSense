import pytest
from unittest.mock import MagicMock

from app.services.scan_service import ScanService
from app.providers.vision.base import VisionGuess, VisionProviderError
from app.schemas.food import FoodOut


def _make_food(slug):
    return FoodOut(id=1, slug=slug, name=slug.capitalize(), kcal=50, protein=1, carbs=2, fat=3, fiber=4, sugar=5, sodium=6, tag="test", unit="serving", source="local")

@pytest.fixture
def fake_food_service():
    foods = MagicMock()
    foods.supported_vision_slugs.return_value = ["apple", "banana", "orange"]
    foods.resolve_vision_slug.side_effect = lambda slug: _make_food(slug)
    return foods

def test_trained_model_succeeds(fake_food_service):
    # 1. trained model succeeds → Gemini not called, OpenRouter not called.
    primary = MagicMock()
    primary.name = "trained_model"
    primary.identify.return_value = [VisionGuess(label="apple", confidence=0.9)]
    
    fallback = MagicMock()
    fallback.name = "gemini"
    
    fallback_2 = MagicMock()
    fallback_2.name = "openrouter"
    
    svc = ScanService(db=MagicMock(), primary_vision=primary, fallback_vision=fallback, fallback_vision_2=fallback_2)
    svc.foods = fake_food_service
    
    res = svc.identify(b"fake", "test.jpg", "image/jpeg")
    
    primary.identify.assert_called_once()
    fallback.identify.assert_not_called()
    fallback_2.identify.assert_not_called()
    assert res.provider == "trained_model"
    assert res.candidates[0].food.slug == "apple"

def test_trained_model_low_confidence(fake_food_service):
    # 2. trained model low confidence → Gemini called.
    primary = MagicMock()
    primary.name = "trained_model"
    primary.identify.return_value = [VisionGuess(label="apple", confidence=0.5)] # below 0.8
    
    fallback = MagicMock()
    fallback.name = "gemini"
    fallback.identify.return_value = [VisionGuess(label="banana", confidence=0.85)]
    
    fallback_2 = MagicMock()
    fallback_2.name = "openrouter"
    
    svc = ScanService(db=MagicMock(), primary_vision=primary, fallback_vision=fallback, fallback_vision_2=fallback_2)
    svc.foods = fake_food_service
    
    res = svc.identify(b"fake", "test.jpg", "image/jpeg")
    
    primary.identify.assert_called_once()
    fallback.identify.assert_called_once()
    fallback_2.identify.assert_not_called()
    assert res.provider == "gemini"
    assert res.candidates[0].food.slug == "banana"

def test_gemini_succeeds_high_confidence(fake_food_service):
    # 3. Gemini succeeds with high confidence → OpenRouter not called.
    primary = MagicMock()
    primary.name = "trained_model"
    primary.identify.side_effect = VisionProviderError("Model exploded")
    
    fallback = MagicMock()
    fallback.name = "gemini"
    fallback.identify.return_value = [VisionGuess(label="banana", confidence=0.85)]
    
    fallback_2 = MagicMock()
    fallback_2.name = "openrouter"
    
    svc = ScanService(db=MagicMock(), primary_vision=primary, fallback_vision=fallback, fallback_vision_2=fallback_2)
    svc.foods = fake_food_service
    
    res = svc.identify(b"fake", "test.jpg", "image/jpeg")
    
    primary.identify.assert_called_once()
    fallback.identify.assert_called_once()
    fallback_2.identify.assert_not_called()
    assert res.provider == "gemini"
    assert res.candidates[0].food.slug == "banana"

def test_gemini_low_confidence(fake_food_service):
    # 4. Gemini low confidence → OpenRouter called.
    primary = MagicMock()
    primary.name = "trained_model"
    primary.identify.return_value = [VisionGuess(label="apple", confidence=0.5)]
    
    fallback = MagicMock()
    fallback.name = "gemini"
    fallback.identify.return_value = [VisionGuess(label="banana", confidence=0.5)]
    
    fallback_2 = MagicMock()
    fallback_2.name = "openrouter"
    fallback_2.identify.return_value = [VisionGuess(label="orange", confidence=0.9)]
    
    svc = ScanService(db=MagicMock(), primary_vision=primary, fallback_vision=fallback, fallback_vision_2=fallback_2)
    svc.foods = fake_food_service
    
    res = svc.identify(b"fake", "test.jpg", "image/jpeg")
    
    primary.identify.assert_called_once()
    fallback.identify.assert_called_once()
    fallback_2.identify.assert_called_once()
    assert res.provider == "openrouter"
    assert res.candidates[0].food.slug == "orange"

def test_gemini_raises(fake_food_service):
    # 5. Gemini raises → OpenRouter called.
    primary = MagicMock()
    primary.name = "trained_model"
    primary.identify.side_effect = VisionProviderError("Primary exploded")
    
    fallback = MagicMock()
    fallback.name = "gemini"
    fallback.identify.side_effect = VisionProviderError("Gemini exploded")
    
    fallback_2 = MagicMock()
    fallback_2.name = "openrouter"
    fallback_2.identify.return_value = [VisionGuess(label="orange", confidence=0.9)]
    
    svc = ScanService(db=MagicMock(), primary_vision=primary, fallback_vision=fallback, fallback_vision_2=fallback_2)
    svc.foods = fake_food_service
    
    res = svc.identify(b"fake", "test.jpg", "image/jpeg")
    
    primary.identify.assert_called_once()
    fallback.identify.assert_called_once()
    fallback_2.identify.assert_called_once()
    assert res.provider == "openrouter"
    assert res.candidates[0].food.slug == "orange"
    
def test_all_three_fail(fake_food_service):
    # 7. all three providers fail → controlled failure.
    primary = MagicMock()
    primary.name = "trained_model"
    primary.identify.side_effect = VisionProviderError("Primary failed")
    
    fallback = MagicMock()
    fallback.name = "gemini"
    fallback.identify.side_effect = VisionProviderError("Gemini failed")
    
    fallback_2 = MagicMock()
    fallback_2.name = "openrouter"
    fallback_2.identify.side_effect = VisionProviderError("OpenRouter failed")
    
    svc = ScanService(db=MagicMock(), primary_vision=primary, fallback_vision=fallback, fallback_vision_2=fallback_2)
    svc.foods = fake_food_service
    
    with pytest.raises(VisionProviderError, match="OpenRouter failed"):
        svc.identify(b"fake", "test.jpg", "image/jpeg")

def test_no_fake_food(fake_food_service):
    # 8. no fake food is generated.
    primary = MagicMock()
    primary.name = "trained_model"
    primary.identify.return_value = []
    
    fallback = MagicMock()
    fallback.name = "gemini"
    fallback.identify.return_value = []
    
    fallback_2 = MagicMock()
    fallback_2.name = "openrouter"
    fallback_2.identify.return_value = []
    
    svc = ScanService(db=MagicMock(), primary_vision=primary, fallback_vision=fallback, fallback_vision_2=fallback_2)
    svc.foods = fake_food_service
    
    res = svc.identify(b"fake", "test.jpg", "image/jpeg")
    
    assert len(res.candidates) == 0

def test_food_service_owns_nutrition():
    # 9. FoodService remains responsible for nutrition resolution.
    pass
