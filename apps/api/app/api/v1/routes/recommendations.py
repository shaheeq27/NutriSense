from fastapi import APIRouter

from app.api.deps import DB, CurrentUser
from app.schemas.recommendation import RecommendationsResponse
from app.services.recommendation_service import RecommendationService

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("/today", response_model=RecommendationsResponse)
def today(user: CurrentUser, db: DB):
    return RecommendationService(db).today(user)
