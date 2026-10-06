from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.tracking import FoodLog


class TrackingRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, log: FoodLog) -> FoodLog:
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log

    def get(self, log_id: int) -> FoodLog | None:
        return self.db.get(FoodLog, log_id)

    def delete(self, log: FoodLog) -> None:
        self.db.delete(log)
        self.db.commit()

    def for_day(self, user_id: int, d: date) -> list[FoodLog]:
        stmt = select(FoodLog).where(FoodLog.user_id == user_id, FoodLog.date == d).order_by(FoodLog.id)
        return list(self.db.scalars(stmt))

    def for_range(self, user_id: int, start: date, end: date) -> list[FoodLog]:
        stmt = select(FoodLog).where(FoodLog.user_id == user_id, FoodLog.date >= start, FoodLog.date <= end)
        return list(self.db.scalars(stmt))

    def count_for_planned_meal(self, planned_meal_id: int) -> int:
        stmt = select(FoodLog.id).where(FoodLog.planned_meal_id == planned_meal_id)
        return len(self.db.scalars(stmt).all())

    def distinct_dates(self, user_id: int) -> set[date]:
        stmt = select(FoodLog.date).where(FoodLog.user_id == user_id).distinct()
        return set(self.db.scalars(stmt).all())
