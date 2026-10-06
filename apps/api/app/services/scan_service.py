"""Food identification from an image. Identification only - nutrition comes from nutrition_service."""

import logging
from sqlalchemy.orm import Session

from app.core.exceptions import BusinessRuleViolation
from app.providers.vision.base import VisionProvider, VisionProviderError
from app.schemas.scan import ScanCandidate, ScanResponse
from app.services.food_service import FoodService
from app.core.config import get_settings

logger = logging.getLogger(__name__)

MAX_IMAGE_BYTES = 8 * 1024 * 1024
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}


class ScanService:
    def __init__(
        self, 
        db: Session, 
        primary_vision: VisionProvider | None = None, 
        fallback_vision: VisionProvider | None = None,
        fallback_vision_2: VisionProvider | None = None
    ):
        self.foods = FoodService(db)
        settings = get_settings()
        
        self.primary_vision = primary_vision
        self.fallback_vision = fallback_vision
        self.fallback_vision_2 = fallback_vision_2
        
        if not self.primary_vision:
            if settings.VISION_PROVIDER == "trained_model":
                from app.providers.vision.trained_model import TrainedModelVisionProvider
                self.primary_vision = TrainedModelVisionProvider(settings.TRAINED_MODEL_PATH)
            elif settings.VISION_PROVIDER == "gemini":
                from app.providers.vision.gemini import GeminiVisionProvider
                if settings.GEMINI_API_KEY:
                    self.primary_vision = GeminiVisionProvider(settings.GEMINI_API_KEY, model=settings.GEMINI_MODEL)
                else:
                    from app.providers.vision.stub import StubVisionProvider
                    self.primary_vision = StubVisionProvider()
            else:
                from app.providers.vision.stub import StubVisionProvider
                self.primary_vision = StubVisionProvider()

        if not self.fallback_vision and settings.VISION_PROVIDER == "trained_model":
            from app.providers.vision.gemini import GeminiVisionProvider
            if settings.GEMINI_API_KEY:
                self.fallback_vision = GeminiVisionProvider(settings.GEMINI_API_KEY, model=settings.GEMINI_MODEL)
                
        if not self.fallback_vision_2 and settings.VISION_PROVIDER == "trained_model":
            from app.providers.vision.openrouter import OpenRouterVisionProvider
            if settings.OPENROUTER_API_KEY:
                self.fallback_vision_2 = OpenRouterVisionProvider(settings.OPENROUTER_API_KEY, model=settings.OPENROUTER_VISION_MODEL)

    def identify(self, image: bytes, filename: str | None, content_type: str | None) -> ScanResponse:
        if not image:
            raise BusinessRuleViolation("Image is empty", code="invalid_image")
        if len(image) > MAX_IMAGE_BYTES:
            raise BusinessRuleViolation("Image exceeds 8 MB", code="image_too_large")
        if content_type and content_type not in ALLOWED_TYPES:
            raise BusinessRuleViolation(f"Unsupported image type {content_type}", code="unsupported_image_type")
        
        library_slugs = self.foods.supported_vision_slugs()
        
        settings = get_settings()
        threshold = settings.VISION_FALLBACK_THRESHOLD
        
        guesses = []
        provider_name = self.primary_vision.name
        use_fallback_1 = False
        use_fallback_2 = False
        
        primary_error = None
        # PRIMARY
        try:
            guesses = self.primary_vision.identify(image, filename, library_slugs)
            if not guesses:
                logger.info(f"Primary vision ({provider_name}) returned no candidates. Falling back to 1.")
                use_fallback_1 = True
            elif guesses[0].confidence < threshold:
                logger.info(f"Primary vision ({provider_name}) confidence {guesses[0].confidence} < {threshold}. Falling back to 1.")
                use_fallback_1 = True
        except VisionProviderError as e:
            logger.warning(f"Primary vision ({provider_name}) failed: {str(e)}. Falling back to 1.")
            primary_error = e
            use_fallback_1 = True
            
        if use_fallback_1 and not self.fallback_vision and primary_error:
            raise primary_error

        fallback_1_error = None
        # FALLBACK 1
        if use_fallback_1 and self.fallback_vision:
            fallback_name = self.fallback_vision.name
            try:
                guesses = self.fallback_vision.identify(image, filename, library_slugs)
                provider_name = fallback_name
                if not guesses:
                    logger.info(f"Fallback vision 1 ({fallback_name}) returned no candidates. Falling back to 2.")
                    use_fallback_2 = True
                elif guesses[0].confidence < threshold:
                    logger.info(f"Fallback vision 1 ({fallback_name}) confidence {guesses[0].confidence} < {threshold}. Falling back to 2.")
                    use_fallback_2 = True
            except VisionProviderError as e:
                logger.error(f"Fallback vision 1 ({fallback_name}) failed: {str(e)}")
                fallback_1_error = e
                use_fallback_2 = True
                
        if use_fallback_2 and not self.fallback_vision_2 and fallback_1_error:
            raise fallback_1_error
                
        # FALLBACK 2
        if use_fallback_2 and self.fallback_vision_2:
            fallback_name_2 = self.fallback_vision_2.name
            try:
                guesses = self.fallback_vision_2.identify(image, filename, library_slugs)
                provider_name = fallback_name_2
            except VisionProviderError as e:
                logger.error(f"Fallback vision 2 ({fallback_name_2}) also failed: {str(e)}")
                raise e

        candidates = []
        for g in guesses:
            food = self.foods.resolve_vision_slug(g.label)
            if food is not None:
                candidates.append(ScanCandidate(food=food, confidence=g.confidence))
                
        return ScanResponse(
            candidates=candidates,
            provider=provider_name,
        )
