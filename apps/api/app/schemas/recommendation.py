from typing import Literal

from pydantic import BaseModel


class Insight(BaseModel):
    code: str
    severity: Literal["info", "tip", "warning"]
    title: str
    message: str


class RecommendationsResponse(BaseModel):
    insights: list[Insight]
