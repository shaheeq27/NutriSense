from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.food import Food


class FoodRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, food_id: int) -> Food | None:
        return self.db.get(Food, food_id)

    def get_by_slug(self, slug: str) -> Food | None:
        return self.db.scalar(select(Food).where(Food.slug == slug))

    def all(self) -> list[Food]:
        return list(self.db.scalars(select(Food).order_by(Food.id)))

    def count(self) -> int:
        return len(self.db.scalars(select(Food.id)).all())

    def add_many(self, foods: list[Food]) -> None:
        self.db.add_all(foods)
        self.db.commit()
