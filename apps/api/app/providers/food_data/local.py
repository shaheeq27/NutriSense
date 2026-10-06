from sqlalchemy.orm import Session

from app.models.food import Food
from app.repositories.food_repo import FoodRepository
from app.schemas.food import FoodOut


def food_to_out(f: Food) -> FoodOut:
    return FoodOut(
        id=f.id, slug=f.slug, name=f.name, tag=f.tag, unit=f.unit, kcal=f.kcal, protein=f.protein,
        carbs=f.carbs, fat=f.fat, fiber=f.fiber, sugar=f.sugar, sodium=f.sodium, emoji=f.emoji,
        image_url=f.image_url, source=f.source,
    )


class LocalFoodProvider:
    """Serves the seeded food library from the database (whole library; ~110 rows, ranked in memory)."""

    name = "local"

    def __init__(self, db: Session):
        self.repo = FoodRepository(db)

    def candidates(self, query: str) -> list[FoodOut]:
        return [food_to_out(f) for f in self.repo.all()]

    def aliases(self) -> dict[int, str]:
        return {f.id: f.aliases for f in self.repo.all()}

    def get(self, food_id: int) -> FoodOut | None:
        f = self.repo.get(food_id)
        return food_to_out(f) if f else None

    def get_by_slug(self, slug: str) -> FoodOut | None:
        f = self.repo.get_by_slug(slug)
        return food_to_out(f) if f else None

    def get_curated(self, slug: str) -> FoodOut | None:
        return None
        
    def get_curated_slugs(self) -> list[str]:
        return []

    def best_candidate(self, query: str) -> FoodOut | None:
        return None
