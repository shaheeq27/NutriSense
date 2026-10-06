"""Rule-based personal insights. Reads data through other services only."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.core import clock
from app.models.user import User
from app.schemas.recommendation import Insight, RecommendationsResponse
from app.schemas.tracking import DailySummary
from app.services import bmi_service
from app.services.tracking_service import TrackingService


def build_insights(s: DailySummary, user: User, hour: int) -> list[Insight]:
    out: list[Insight] = []
    t, tg = s.totals, s.targets
    if t.kcal == 0:
        out.append(Insight(code="nothing_logged", severity="info", title="Your day is still wide open",
                           message="Log your first meal to get personal insights."))
        return out
    kcal_frac = t.kcal / tg.kcal if tg.kcal else 0
    protein_frac = t.protein / tg.protein if tg.protein else 0
    if s.remaining_kcal < 0:
        out.append(Insight(code="over_target", severity="warning", title="Above today's calorie target",
                           message=f"You're {abs(round(s.remaining_kcal))} kcal over. A lighter dinner or a "
                                   "walk can balance things out."))
    else:
        out.append(Insight(code="remaining_kcal", severity="info", title=f"{round(s.remaining_kcal)} kcal to go",
                           message=f"You've reached {round(kcal_frac * 100)}% of today's energy target."))
    if protein_frac >= 0.9:
        out.append(Insight(code="protein_on_track", severity="info", title="Protein on track",
                           message=f"You've already reached {round(protein_frac * 100)}% of today's protein "
                                   "target. Remaining meals can focus on vegetables and fiber."))
    elif protein_frac + 0.15 < kcal_frac:
        gap = round(tg.protein - t.protein)
        out.append(Insight(code="protein_gap", severity="tip", title="Protein is lagging",
                           message=f"About {gap} g of protein left. Try Greek yogurt, paneer, eggs, dal or "
                                   "grilled chicken in your next meal."))
    if hour >= 15 and tg.fiber and t.fiber < tg.fiber * 0.5:
        out.append(Insight(code="low_fiber", severity="tip", title="Add some fiber",
                           message=f"{t.fiber:g} g of {tg.fiber} g fiber so far. Fruit, vegetables, oats or "
                                   "lentils help."))
    if t.carbs and tg.carbs and t.carbs > tg.carbs * 1.1:
        out.append(Insight(code="high_carbs", severity="tip", title="Carb-heavy day",
                           message="Balance your next meal with protein and vegetables."))
    p = user.profile
    if p and p.goal == "lose" and bmi_service.category(bmi_service.bmi_value(p.height_cm, p.weight_kg)) == "underweight":
        out.append(Insight(code="goal_check", severity="warning", title="Check your goal",
                           message="Your BMI is below the healthy range; consider a maintain or gain goal."))
    return out


class RecommendationService:
    def __init__(self, db: Session):
        self.tracking = TrackingService(db)

    def today(self, user: User) -> RecommendationsResponse:
        summary = self.tracking.summary(user)
        return RecommendationsResponse(insights=build_insights(summary, user, clock.now().hour))
