from pydantic import BaseModel


class FoodOut(BaseModel):
    """Food per 1 serving of `unit`. `id` is null for estimates (not in the library)."""

    id: int | None
    slug: str
    name: str
    tag: str
    unit: str
    kcal: float
    protein: float
    carbs: float
    fat: float
    fiber: float
    sugar: float
    sodium: float
    emoji: str = ""
    image_url: str | None = None
    source: str = "local"
    estimated: bool = False


class FoodSearchResponse(BaseModel):
    items: list[FoodOut]
    estimate: FoodOut | None
