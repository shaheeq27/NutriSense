from pydantic import BaseModel, Field


class BmiRequest(BaseModel):
    height_cm: float = Field(gt=50, lt=272)
    weight_kg: float = Field(gt=10, lt=400)


class BmiResponse(BaseModel):
    bmi: float
    category: str
    healthy_weight_min_kg: float
    healthy_weight_max_kg: float
    message: str
