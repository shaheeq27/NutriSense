from datetime import date

from pydantic import BaseModel, Field, model_validator

from app.schemas.common import ORMModel


class PlannedMealOut(ORMModel):
    id: int
    slot: str
    name: str
    food_id: int | None = None
    slug: str | None = None
    kcal: float
    protein: float
    carbs: float
    fat: float
    servings: float
    template_id: int | None
    custom: bool
    eaten: bool


class MealPlanDayOut(BaseModel):
    date: date
    meals: list[PlannedMealOut]
    total_kcal: float
    target_kcal: int


class MealPlanWindow(BaseModel):
    days: list[MealPlanDayOut]
    window_start: date
    window_end: date


class MealOption(ORMModel):
    template_id: int = Field(validation_alias="id")
    slot: str
    name: str
    description: str
    tags: str
    why: str
    kcal: float
    protein: float
    carbs: float
    fat: float
    image_url: str | None = None


class SwapRequest(BaseModel):
    template_id: int


class AddItemRequest(BaseModel):
    food_id: int | None = None
    slug: str | None = Field(default=None, min_length=1)
    servings: float = Field(default=1, gt=0, le=20)
    portion_grams: float | None = Field(default=None, gt=0, le=5000)

    @model_validator(mode="before")
    @classmethod
    def check_exclusive(cls, data: dict):
        if "servings" in data and "portion_grams" in data and data["portion_grams"] is not None:
            raise ValueError("Cannot explicitly provide both servings and portion_grams")
        return data

    @model_validator(mode="after")
    def check_id_or_slug(self):
        n = sum(x is not None for x in (self.food_id, self.slug))
        if n != 1:
            raise ValueError("Provide exactly one of food_id or slug")
        return self
