from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")

Slot = Literal["breakfast", "lunch", "snack", "dinner"]
SLOTS: tuple[str, ...] = ("breakfast", "lunch", "snack", "dinner")


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    limit: int
    offset: int = 0


class ErrorBody(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorBody


class Macros(BaseModel):
    kcal: float
    protein: float
    carbs: float
    fat: float
