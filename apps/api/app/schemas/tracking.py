import datetime as dt
from datetime import date, datetime

from pydantic import BaseModel, Field, model_validator

from app.schemas.common import ORMModel, Slot
from app.schemas.nutrition import Targets


class CustomFood(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    kcal: float = Field(ge=0, le=10000)
    protein: float = Field(default=0, ge=0)
    carbs: float = Field(default=0, ge=0)
    fat: float = Field(default=0, ge=0)


class LogCreate(BaseModel):
    slot: Slot
    food_id: int | None = None
    slug: str | None = Field(default=None, min_length=1)
    planned_meal_id: int | None = None
    custom: CustomFood | None = None
    servings: float = Field(default=1, gt=0, le=50)
    portion_grams: float | None = Field(default=None, gt=0, le=5000)
    date: dt.date | None = Field(default=None, description="Defaults to today; any other date is rejected")

    @model_validator(mode="before")
    @classmethod
    def check_exclusive_portion(cls, data: dict):
        if "servings" in data and "portion_grams" in data and data["portion_grams"] is not None:
            raise ValueError("Cannot explicitly provide both servings and portion_grams")
        return data

    @model_validator(mode="after")
    def _exactly_one_source(self):
        n = sum(x is not None for x in (self.food_id, self.slug, self.planned_meal_id, self.custom))
        if n != 1:
            raise ValueError("Provide exactly one of food_id, slug, planned_meal_id or custom")
        return self


class LogOut(ORMModel):
    id: int
    date: date
    slot: str
    name: str
    food_id: int | None = None
    slug: str | None = None
    image_url: str | None = None
    planned_meal_id: int | None = None
    servings: float
    kcal: float
    protein: float
    carbs: float
    fat: float
    fiber: float
    created_at: datetime | None = None


class SlotSummary(BaseModel):
    slot: str
    entries: list[LogOut]
    kcal: float


class DailyTotals(BaseModel):
    kcal: float
    protein: float
    carbs: float
    fat: float
    fiber: float


class DailySummary(BaseModel):
    date: date
    totals: DailyTotals
    targets: Targets
    remaining_kcal: float
    percent: dict[str, float]
    slots: list[SlotSummary]
