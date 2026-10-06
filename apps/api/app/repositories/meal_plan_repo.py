from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.meal import MealPlanDay, MealTemplate, PlannedMeal


class MealPlanRepository:
    def __init__(self, db: Session):
        self.db = db

    def templates(self, slot: str | None = None) -> list[MealTemplate]:
        stmt = select(MealTemplate).order_by(MealTemplate.id)
        if slot:
            stmt = stmt.where(MealTemplate.slot == slot)
        return list(self.db.scalars(stmt))

    def get_template(self, template_id: int) -> MealTemplate | None:
        return self.db.get(MealTemplate, template_id)

    def count_templates(self) -> int:
        return len(self.db.scalars(select(MealTemplate.id)).all())

    def add_templates(self, items: list[MealTemplate]) -> None:
        self.db.add_all(items)
        self.db.commit()

    def get_day(self, user_id: int, d: date) -> MealPlanDay | None:
        return self.db.scalar(select(MealPlanDay).where(MealPlanDay.user_id == user_id, MealPlanDay.date == d))

    def get_planned_meal(self, meal_id: int) -> PlannedMeal | None:
        return self.db.get(PlannedMeal, meal_id)

    def replace_day(self, user_id: int, d: date, meals: list[PlannedMeal]) -> MealPlanDay:
        day = self.get_day(user_id, d)
        if day is None:
            day = MealPlanDay(user_id=user_id, date=d)
            self.db.add(day)
        day.meals.clear()
        self.db.flush()
        day.meals.extend(meals)
        self.db.commit()
        self.db.refresh(day)
        return day

    def commit(self) -> None:
        self.db.commit()

    def add_meal(self, day: MealPlanDay, meal: PlannedMeal) -> PlannedMeal:
        day.meals.append(meal)
        self.db.commit()
        self.db.refresh(meal)
        return meal
