from fastapi import APIRouter

from app.api.deps import DB
from app.schemas.nutrition import CalculateRequest, NutritionFacts, ParseRequest, ParseResponse
from app.services import nutrition_service
from app.services.food_service import FoodService

router = APIRouter(prefix="/nutrition", tags=["nutrition"])


@router.post("/calculate", response_model=NutritionFacts)
def calculate(body: CalculateRequest, db: DB):
    return nutrition_service.scale(
        FoodService(db).resolve_target(food_id=body.food_id, slug=body.slug),
        body.servings,
        body.portion_grams
    )


@router.post("/parse", response_model=ParseResponse)
def parse(body: ParseRequest, db: DB):
    return nutrition_service.parse_meal_text(body.text, FoodService(db).best_match)
