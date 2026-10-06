from datetime import date
from typing import Literal

from pydantic import BaseModel

ProgressRange = Literal["7d", "30d", "90d"]


class DailyPoint(BaseModel):
    date: date
    kcal: float
    protein: float
    logged: bool
    on_target: bool


class ProgressAverages(BaseModel):
    kcal: float
    protein: float


class ProgressResponse(BaseModel):
    range: ProgressRange
    start: date
    end: date
    days: list[DailyPoint]
    points: list[DailyPoint] = []
    avg_kcal: float
    avg_protein: float
    averages: ProgressAverages | None = None
    days_logged: int
    total_meals_logged: int = 0
    top_slot: str | None = None
    adherence_pct: float
    current_streak: int
    streak_days: int = 0
    best_streak: int = 0
    lifetime_logged_days: int = 0
    shields_available: int = 1
    target_kcal: int
    target_protein: int
