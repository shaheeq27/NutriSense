from typing import Protocol

from app.schemas.food import FoodOut


class FoodDataProvider(Protocol):
    """Source of candidate foods for a text query. Ranking is done by food_service."""

    name: str

    def candidates(self, query: str) -> list[FoodOut]: ...

    def get(self, food_id: int) -> FoodOut | None: ...

    def get_curated(self, slug: str) -> FoodOut | None: ...
    
    def get_curated_slugs(self) -> list[str]: ...

    def best_candidate(self, query: str) -> FoodOut | None: ...
