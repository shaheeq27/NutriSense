from pydantic import BaseModel

from app.schemas.food import FoodOut


class ScanCandidate(BaseModel):
    food: FoodOut
    confidence: float


class ScanResponse(BaseModel):
    candidates: list[ScanCandidate]
    provider: str
