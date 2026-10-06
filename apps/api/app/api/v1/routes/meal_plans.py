from datetime import date

from fastapi import APIRouter

from app.api.deps import DB, CurrentUser
from app.schemas.common import Slot
from app.schemas.meal_plan import AddItemRequest, MealOption, MealPlanDayOut, MealPlanWindow, SwapRequest
from app.services.meal_planning_service import MealPlanningService

router = APIRouter(prefix="/meal-plans", tags=["meal-plans"])


@router.get("", response_model=MealPlanWindow)
def get_window(user: CurrentUser, db: DB, start: date | None = None):
    return MealPlanningService(db).get_window(user, start)


@router.post("/{day}/generate", response_model=MealPlanDayOut)
def generate(day: date, user: CurrentUser, db: DB):
    return MealPlanningService(db).generate(user, day)


@router.get("/{day}/slots/{slot}/options", response_model=list[MealOption])
def options(day: date, slot: Slot, user: CurrentUser, db: DB):
    return MealPlanningService(db).swap_options(user, day, slot)


@router.post("/{day}/slots/{slot}/swap", response_model=MealPlanDayOut)
def swap(day: date, slot: Slot, body: SwapRequest, user: CurrentUser, db: DB):
    return MealPlanningService(db).swap(user, day, slot, body.template_id)


@router.post("/{day}/slots/{slot}/items", response_model=MealPlanDayOut)
def add_item(day: date, slot: Slot, body: AddItemRequest, user: CurrentUser, db: DB):
    return MealPlanningService(db).add_item(
        user, day, slot, food_id=body.food_id, slug=body.slug, servings=body.servings, portion_grams=body.portion_grams
    )

@router.delete("/{day}/slots/{slot}/items/{item_id}", response_model=MealPlanDayOut)
def remove_item(day: date, slot: Slot, item_id: int, user: CurrentUser, db: DB):
    return MealPlanningService(db).remove_item(user, day, slot, item_id)
