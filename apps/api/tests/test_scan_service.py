from unittest.mock import MagicMock

import pytest

from app.providers.food_data.usda import USDAProviderError
from app.providers.vision.base import VisionGuess
from app.schemas.food import FoodOut
from app.services.scan_service import ScanService


def _make_food(slug, name, source):
    return FoodOut(id=1, slug=slug, name=name, kcal=50, protein=1, carbs=2, fat=3, fiber=4, sugar=5, sodium=6, tag="test", unit="serving", source=source)

def test_identify_resolves_through_food_service():
    scan_service = ScanService(db=MagicMock())
    scan_service.foods = MagicMock()
    scan_service.primary_vision = MagicMock()
    scan_service.primary_vision.name = "mock_vision"
    scan_service.fallback_vision = MagicMock()
    scan_service.fallback_vision.name = "mock_fallback"
    scan_service.fallback_vision.identify.return_value = []
    scan_service.fallback_vision_2 = MagicMock()
    scan_service.fallback_vision_2.name = "mock_fallback_2"
    scan_service.fallback_vision_2.identify.return_value = []

    
    scan_service.foods.supported_vision_slugs.return_value = ["apple", "banana"]
    scan_service.primary_vision.identify.return_value = [
        VisionGuess(label="apple", confidence=0.9),
        VisionGuess(label="banana", confidence=0.8)
    ]
    
    usda_apple = _make_food("usda-123", "USDA Apple", "usda")
    local_banana = _make_food("banana", "Banana", "local")
    
    def mock_resolve(slug):
        if slug == "apple":
            return usda_apple
        if slug == "banana":
            return local_banana
        return None
        
    scan_service.foods.resolve_vision_slug.side_effect = mock_resolve
    
    result = scan_service.identify(b"image_data", "test.jpg", "image/jpeg")
    
    assert result.provider == "mock_vision"
    assert len(result.candidates) == 2
    
    assert result.candidates[0].food == usda_apple
    assert result.candidates[0].confidence == 0.9
    
    assert result.candidates[1].food == local_banana
    assert result.candidates[1].confidence == 0.8
    
    scan_service.primary_vision.identify.assert_called_once_with(b"image_data", "test.jpg", ["apple", "banana"])
    assert scan_service.foods.resolve_vision_slug.call_count == 2

def test_identify_skips_unresolved_candidates():
    scan_service = ScanService(db=MagicMock())
    scan_service.foods = MagicMock()
    scan_service.primary_vision = MagicMock()
    scan_service.primary_vision.name = "mock_vision"
    scan_service.fallback_vision = MagicMock()
    scan_service.fallback_vision.name = "mock_fallback"
    scan_service.fallback_vision.identify.return_value = []
    scan_service.fallback_vision_2 = MagicMock()
    scan_service.fallback_vision_2.name = "mock_fallback_2"
    scan_service.fallback_vision_2.identify.return_value = []

    
    scan_service.foods.supported_vision_slugs.return_value = ["apple", "unknown"]
    scan_service.primary_vision.identify.return_value = [
        VisionGuess(label="apple", confidence=0.9),
        VisionGuess(label="unknown", confidence=0.5)
    ]
    
    def mock_resolve(slug):
        if slug == "apple":
            return _make_food("apple", "Apple", "local")
        return None
        
    scan_service.foods.resolve_vision_slug.side_effect = mock_resolve
    
    result = scan_service.identify(b"img", None, None)
    
    assert len(result.candidates) == 1
    assert result.candidates[0].food.slug == "apple"

def test_identify_propagates_usda_error():
    scan_service = ScanService(db=MagicMock())
    scan_service.foods = MagicMock()
    scan_service.primary_vision = MagicMock()
    scan_service.primary_vision.name = "mock_vision"
    scan_service.fallback_vision = MagicMock()
    scan_service.fallback_vision.name = "mock_fallback"
    scan_service.fallback_vision.identify.return_value = []
    scan_service.fallback_vision_2 = MagicMock()
    scan_service.fallback_vision_2.name = "mock_fallback_2"
    scan_service.fallback_vision_2.identify.return_value = []

    
    scan_service.foods.supported_vision_slugs.return_value = ["apple"]
    scan_service.primary_vision.identify.return_value = [VisionGuess(label="apple", confidence=0.9)]
    
    scan_service.foods.resolve_vision_slug.side_effect = USDAProviderError("API failed")
    
    with pytest.raises(USDAProviderError):
        scan_service.identify(b"img", None, None)

def test_identify_uncataloged_food_resolves_to_usda():
    scan_service = ScanService(db=MagicMock())
    scan_service.foods = MagicMock()
    scan_service.primary_vision = MagicMock()
    scan_service.primary_vision.name = "gemini"
    scan_service.fallback_vision = MagicMock()
    scan_service.fallback_vision.name = "mock_fallback"
    scan_service.fallback_vision.identify.return_value = []
    scan_service.fallback_vision_2 = MagicMock()
    scan_service.fallback_vision_2.name = "mock_fallback_2"
    scan_service.fallback_vision_2.identify.return_value = []

    
    # "cucumber" is uncataloged in local DB, but Gemini identifies it
    scan_service.foods.supported_vision_slugs.return_value = ["apple", "banana"]
    scan_service.primary_vision.identify.return_value = [
        VisionGuess(label="cucumber", confidence=0.92)
    ]
    
    usda_cucumber = FoodOut(
        id=2709784,
        slug="usda-2709784",
        name="Cucumber, Raw",
        kcal=16.0,
        protein=0.7,
        carbs=3.6,
        fat=0.1,
        fiber=0.5,
        sugar=1.7,
        sodium=2.0,
        tag="Vegetables",
        unit="100 g",
        source="usda",
        estimated=False
    )
    scan_service.foods.resolve_vision_slug.return_value = usda_cucumber
    
    result = scan_service.identify(b"cucumber_bytes", "cucumber.jpg", "image/jpeg")
    
    assert result.provider == "gemini"
    assert len(result.candidates) == 1
    c = result.candidates[0]
    assert c.confidence == 0.92
    assert c.food.name == "Cucumber, Raw"
    assert c.food.kcal == 16.0
    assert c.food.source == "usda"
    assert c.food.estimated is False
    scan_service.foods.resolve_vision_slug.assert_called_once_with("cucumber")

def test_identify_uncataloged_carrot_and_avocado():
    scan_service = ScanService(db=MagicMock())
    scan_service.foods = MagicMock()
    scan_service.primary_vision = MagicMock()
    scan_service.primary_vision.name = "gemini"
    scan_service.fallback_vision = MagicMock()
    scan_service.fallback_vision.name = "mock_fallback"
    scan_service.fallback_vision.identify.return_value = []
    scan_service.fallback_vision_2 = MagicMock()
    scan_service.fallback_vision_2.name = "mock_fallback_2"
    scan_service.fallback_vision_2.identify.return_value = []

    
    scan_service.foods.supported_vision_slugs.return_value = ["apple"]
    scan_service.primary_vision.identify.return_value = [
        VisionGuess(label="carrot", confidence=0.88),
        VisionGuess(label="avocado", confidence=0.85),
    ]
    
    carrot = FoodOut(id=170393, slug="usda-170393", name="Carrots, Raw", kcal=41.0, protein=0.9, carbs=9.6, fat=0.2, fiber=2.8, sugar=4.7, sodium=69.0, tag="Vegetables", unit="100 g", source="usda", estimated=False)
    avocado = FoodOut(id=171705, slug="usda-171705", name="Avocado, Raw", kcal=160.0, protein=2.0, carbs=8.5, fat=14.7, fiber=6.7, sugar=0.7, sodium=7.0, tag="Fruits", unit="100 g", source="usda", estimated=False)
    
    scan_service.foods.resolve_vision_slug.side_effect = lambda slug: carrot if slug == "carrot" else avocado
    
    result = scan_service.identify(b"bytes", "mix.jpg", "image/jpeg")
    assert len(result.candidates) == 2
    assert result.candidates[0].food.name == "Carrots, Raw"
    assert result.candidates[0].food.kcal == 41.0
    assert result.candidates[1].food.name == "Avocado, Raw"
    assert result.candidates[1].food.kcal == 160.0

def test_identify_non_food_rejection_no_usda_lookup():
    scan_service = ScanService(db=MagicMock())
    scan_service.foods = MagicMock()
    scan_service.primary_vision = MagicMock()
    scan_service.primary_vision.name = "gemini"
    scan_service.fallback_vision = MagicMock()
    scan_service.fallback_vision.name = "mock_fallback"
    scan_service.fallback_vision.identify.return_value = []
    scan_service.fallback_vision_2 = MagicMock()
    scan_service.fallback_vision_2.name = "mock_fallback_2"
    scan_service.fallback_vision_2.identify.return_value = []

    
    # Gemini rejects non-food / logo image and returns empty list
    scan_service.foods.supported_vision_slugs.return_value = ["apple", "banana"]
    scan_service.primary_vision.identify.return_value = []
    
    result = scan_service.identify(b"logo_bytes", "logo.png", "image/png")
    
    assert result.candidates == []
    scan_service.foods.resolve_vision_slug.assert_not_called()

def test_identify_unresolved_candidate_dropped():
    scan_service = ScanService(db=MagicMock())
    scan_service.foods = MagicMock()
    scan_service.primary_vision = MagicMock()
    scan_service.primary_vision.name = "gemini"
    scan_service.fallback_vision = MagicMock()
    scan_service.fallback_vision.name = "mock_fallback"
    scan_service.fallback_vision.identify.return_value = []
    scan_service.fallback_vision_2 = MagicMock()
    scan_service.fallback_vision_2.name = "mock_fallback_2"
    scan_service.fallback_vision_2.identify.return_value = []

    
    scan_service.foods.supported_vision_slugs.return_value = ["apple"]
    scan_service.primary_vision.identify.return_value = [VisionGuess(label="unresolvablefood", confidence=0.75)]
    scan_service.foods.resolve_vision_slug.return_value = None
    
    result = scan_service.identify(b"bytes", "food.jpg", "image/jpeg")
    assert result.candidates == []

def test_nutrition_strictly_sourced_from_food_service():
    """Verify Gemini only supplies food identity and confidence; nutrition is 100% from FoodService."""
    scan_service = ScanService(db=MagicMock())
    scan_service.foods = MagicMock()
    scan_service.primary_vision = MagicMock()
    scan_service.primary_vision.name = "gemini"
    scan_service.fallback_vision = MagicMock()
    scan_service.fallback_vision.name = "mock_fallback"
    scan_service.fallback_vision.identify.return_value = []
    scan_service.fallback_vision_2 = MagicMock()
    scan_service.fallback_vision_2.name = "mock_fallback_2"
    scan_service.fallback_vision_2.identify.return_value = []

    
    # Gemini only provides label and confidence:
    guess = VisionGuess(label="cucumber", confidence=0.94)
    assert not hasattr(guess, "kcal")
    assert not hasattr(guess, "protein")
    scan_service.primary_vision.identify.return_value = [guess]
    
    usda_food = _make_food("usda-2709784", "Cucumber, Raw", "usda")
    scan_service.foods.resolve_vision_slug.return_value = usda_food
    
    result = scan_service.identify(b"img", "c.jpg", "image/jpeg")
    cand = result.candidates[0]
    assert cand.confidence == 0.94
    assert cand.food is usda_food
    assert cand.food.source == "usda"
