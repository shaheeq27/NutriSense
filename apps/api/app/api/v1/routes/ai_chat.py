"""AI Meal Assistant routes."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import DB, CurrentUser
from app.core.exceptions import AIProviderError, DomainError
from app.schemas.ai_chat import AIChatRequest, AIChatResponse
from app.services.ai_chat_service import AIChatService

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/chat", response_model=AIChatResponse)
def ai_chat(body: AIChatRequest, user: CurrentUser, db: DB) -> AIChatResponse:
    """Chat with the AI Meal Assistant.

    Understands natural-language meal requests and returns personalized
    suggestions with verified nutrition from NutriSense's food database.
    """
    try:
        svc = AIChatService(db)
        return svc.chat(user, body.message)
    except DomainError:
        raise
    except Exception as exc:
        raise AIProviderError(f"AI Assistant service error: {exc}") from exc

