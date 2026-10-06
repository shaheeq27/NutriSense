"""Food logging (today only) and the daily summary."""

from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from app.core import clock
from app.core.exceptions import BusinessRuleViolation, NotFound
from app.models.tracking import FoodLog
from app.models.user import User
from app.repositories.meal_plan_repo import MealPlanRepository
from app.repositories.tracking_repo import TrackingRepository
from app.schemas.common import SLOTS
from app.schemas.tracking import DailySummary, DailyTotals, LogCreate, LogOut, SlotSummary
from app.services import nutrition_service
from app.services.food_service import FoodService


def ensure_loggable(d: date) -> None:
    today = clock.today()
    if d > today:
        raise BusinessRuleViolation("You can only log food for today - future days can't be logged.",
                                    code="logging_not_allowed_for_date")
    if d < today:
        raise BusinessRuleViolation("You can only log food for today - past days are read-only.",
                                    code="logging_not_allowed_for_date")


class TrackingService:
    def __init__(self, db: Session):
        self.repo = TrackingRepository(db)
        self.plans = MealPlanRepository(db)
        self.foods = FoodService(db)

    def log(self, user: User, data: LogCreate) -> LogOut:
        d = data.date or clock.today()
        ensure_loggable(d)
        log = FoodLog(user_id=user.id, date=d, slot=data.slot, servings=data.servings)
        if data.food_id is not None or data.slug is not None:
            food = self.foods.resolve_target(food_id=data.food_id, slug=data.slug)
            f = nutrition_service.scale(food, data.servings, data.portion_grams)
            log.name, log.food_id = food.name, food.id
            log.slug, log.image_url = food.slug, food.image_url
            log.kcal, log.protein, log.carbs, log.fat, log.fiber = f.kcal, f.protein, f.carbs, f.fat, f.fiber
            if data.portion_grams:
                log.servings = f.servings  # Store scaled servings if portion_grams was used
        elif data.planned_meal_id is not None:
            pm = self.plans.get_planned_meal(data.planned_meal_id)
            if pm is None or pm.day.user_id != user.id:
                raise NotFound("Planned meal not found", code="planned_meal_not_found")
            if pm.day.date != d:
                raise BusinessRuleViolation("Only today's planned meals can be logged",
                                            code="logging_not_allowed_for_date")
            s = data.servings
            log.name, log.planned_meal_id = pm.name, pm.id
            log.food_id, log.slug = pm.food_id, pm.slug
            log.kcal, log.protein = round(pm.kcal * s), round(pm.protein * s, 1)
            log.carbs, log.fat = round(pm.carbs * s, 1), round(pm.fat * s, 1)
            pm.eaten = True
        else:
            c, s = data.custom, data.servings
            log.name = c.name
            log.kcal, log.protein = round(c.kcal * s), round(c.protein * s, 1)
            log.carbs, log.fat = round(c.carbs * s, 1), round(c.fat * s, 1)
        return LogOut.model_validate(self.repo.add(log))

    def delete(self, user: User, log_id: int) -> None:
        log = self.repo.get(log_id)
        if log is None or log.user_id != user.id:
            raise NotFound("Log entry not found", code="log_not_found")
        ensure_loggable(log.date)
        pm_id = log.planned_meal_id
        self.repo.delete(log)
        if pm_id and self.repo.count_for_planned_meal(pm_id) == 0:
            pm = self.plans.get_planned_meal(pm_id)
            if pm:
                pm.eaten = False
                self.plans.commit()

    def summary(self, user: User, d: date | None = None) -> DailySummary:
        d = d or clock.today()
        logs = self.repo.for_day(user.id, d)
        targets = nutrition_service.targets_for_profile(user.profile)
        t = DailyTotals(
            kcal=round(sum(x.kcal for x in logs)),
            protein=round(sum(x.protein for x in logs), 1),
            carbs=round(sum(x.carbs for x in logs), 1),
            fat=round(sum(x.fat for x in logs), 1),
            fiber=round(sum(x.fiber for x in logs), 1),
        )
        pct = {k: round(getattr(t, k) / getattr(targets, k) * 100) if getattr(targets, k) else 0
               for k in ("kcal", "protein", "carbs", "fat", "fiber")}
        slots = []
        for s in SLOTS:
            entries = [LogOut.model_validate(x) for x in logs if x.slot == s]
            slots.append(SlotSummary(slot=s, entries=entries, kcal=round(sum(e.kcal for e in entries))))
        return DailySummary(date=d, totals=t, targets=targets, remaining_kcal=targets.kcal - t.kcal,
                            percent=pct, slots=slots)
