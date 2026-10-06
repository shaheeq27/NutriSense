from pydantic import BaseModel, Field, model_validator

from app.schemas.food import FoodOut


class CalculateRequest(BaseModel):
    food_id: int | None = None
    slug: str | None = Field(default=None, min_length=1)
    servings: float = Field(default=1, gt=0, le=50)
    portion_grams: float | None = Field(default=None, gt=0, le=5000)

    @model_validator(mode="before")
    @classmethod
    def check_exclusive(cls, data: dict):
        if isinstance(data, dict):
            food_id = data.get("food_id")
            if isinstance(food_id, str):
                if food_id.isdigit():
                    data["food_id"] = int(food_id)
                elif not data.get("slug"):
                    data["slug"] = food_id
                    data["food_id"] = None
        if "servings" in data and "portion_grams" in data and data["portion_grams"] is not None:
            raise ValueError("Cannot explicitly provide both servings and portion_grams")
        return data

    @model_validator(mode="after")
    def check_id_or_slug(self):
        n = sum(x is not None for x in (self.food_id, self.slug))
        if n != 1:
            raise ValueError("Provide exactly one of food_id or slug")
        return self


class NutritionFacts(BaseModel):
    kcal: float
    protein: float
    carbs: float
    fat: float
    fiber: float
    sugar: float
    sodium: float
    servings: float
    unit: str
    portion_grams: float | None = None
    daily_values: dict[str, float]  # percent of reference daily value


class ParseRequest(BaseModel):
    text: str = Field(min_length=1, max_length=500)


class ParsedItem(BaseModel):
    food: FoodOut
    quantity: float
    nutrition: NutritionFacts


class Totals(BaseModel):
    kcal: float
    protein: float
    carbs: float
    fat: float
    fiber: float
    sugar: float
    sodium: float


class ParseResponse(BaseModel):
    items: list[ParsedItem]
    totals: Totals


class Targets(BaseModel):
    kcal: int
    protein: int
    carbs: int
    fat: int
    fiber: int
    bmr: int
    tdee: int
