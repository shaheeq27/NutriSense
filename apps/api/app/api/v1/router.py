from fastapi import APIRouter

from app.api.v1.routes import (
    ai_chat,
    auth,
    bmi,
    foods,
    meal_plans,
    nutrition,
    progress,
    recommendations,
    scan,
    tracking,
    users,
)

api_router = APIRouter(prefix="/api/v1")
for r in (auth, users, foods, scan, nutrition, bmi, meal_plans, tracking, progress, recommendations, ai_chat):
    api_router.include_router(r.router)
