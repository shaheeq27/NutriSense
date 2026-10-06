"""Vision provider package — provider factory and public API."""

from __future__ import annotations

from app.providers.vision.base import VisionGuess, VisionProvider
from app.providers.vision.stub import StubVisionProvider

__all__ = ["VisionGuess", "VisionProvider", "StubVisionProvider", "get_vision_provider"]


def get_vision_provider() -> VisionProvider:
    """Return the vision provider configured by settings.

    Imports are deferred so the Gemini provider (and its httpx import) are only
    loaded when actually selected.  Falls back to Stub when the key is missing.
    """
    from app.core.config import get_settings

    settings = get_settings()

    if settings.VISION_PROVIDER == "trained_model":
        from app.providers.vision.trained_model import TrainedModelVisionProvider
        return TrainedModelVisionProvider(settings.TRAINED_MODEL_PATH)

    if settings.VISION_PROVIDER == "gemini":
        if not settings.GEMINI_API_KEY:
            import logging
            logging.getLogger(__name__).warning(
                "VISION_PROVIDER=gemini but GEMINI_API_KEY is unset — falling back to stub"
            )
            return StubVisionProvider()

        from app.providers.vision.gemini import GeminiVisionProvider
        return GeminiVisionProvider(settings.GEMINI_API_KEY, model=settings.GEMINI_MODEL)
        
    if settings.VISION_PROVIDER == "openrouter":
        if not settings.OPENROUTER_API_KEY:
            import logging
            logging.getLogger(__name__).warning(
                "VISION_PROVIDER=openrouter but OPENROUTER_API_KEY is unset — falling back to stub"
            )
            return StubVisionProvider()

        from app.providers.vision.openrouter import OpenRouterVisionProvider
        return OpenRouterVisionProvider(settings.OPENROUTER_API_KEY, model=settings.OPENROUTER_VISION_MODEL)

    return StubVisionProvider()
