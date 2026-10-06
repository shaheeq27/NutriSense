from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel
from app.schemas.nutrition import Targets

Goal = Literal["lose", "maintain", "gain"]
Sex = Literal["male", "female", "other"]
Activity = Literal["sedentary", "light", "moderate", "active", "very_active"]
DietStyle = Literal["any", "eggetarian", "vegetarian", "vegan"]


class ProfileIn(BaseModel):
    goal: Goal = "maintain"
    sex: Sex
    birth_year: int | None = Field(default=None, ge=1900, le=2100)
    age: int | None = Field(default=None, ge=13, le=120, description="Alternative to birth_year")
    height_cm: float = Field(gt=50, lt=272)
    weight_kg: float = Field(gt=20, lt=400)
    activity_level: Activity = "moderate"
    diet_style: DietStyle = "any"
    allergies: list[str] = Field(default_factory=list)


class ProfileOut(ORMModel):
    goal: str
    sex: str
    birth_year: int | None
    height_cm: float
    weight_kg: float
    activity_level: str
    diet_style: str
    allergies: list[str]


class ProfileWithTargets(BaseModel):
    profile: ProfileOut
    targets: Targets


class UserOut(ORMModel):
    id: int
    email: str
    name: str
    created_at: datetime | None = None


class UserMe(UserOut):
    profile: ProfileOut | None = None
    targets: Targets | None = None


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
