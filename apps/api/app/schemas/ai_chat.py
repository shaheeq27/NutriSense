"""Schemas for the AI Meal Assistant chat endpoint."""

from __future__ import annotations

from pydantic import BaseModel, Field


class AIChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)


class MealSuggestion(BaseModel):
    """Structured meal suggestion with verified nutrition from NutriSense."""

    name: str
    description: str
    calories: int
    protein: float
    carbs: float
    fat: float
    fiber: float
    ingredients: list[str]
    meal_type: str  # breakfast, lunch, snack, dinner
    # For "add to plan" — one of food_id or slug will be set when the meal
    # maps to a known NutriSense food item.
    food_id: int | None = None
    slug: str | None = None


class AIChatResponse(BaseModel):
    """Response from the AI Meal Assistant.

    Always has a conversational `message`.
    Optionally includes a structured `meal` when the assistant suggests a meal.
    """

    message: str
    meal: MealSuggestion | None = None


# ── Internal: structured intent from the LLM ────────────────────────────

class ParsedIntent(BaseModel):
    """Structured representation of the user's meal request, extracted by the LLM."""

    intent: str  # meal_suggestion | greeting | clarification | out_of_scope
    meal_type: str | None = None  # breakfast, lunch, snack, dinner
    calorie_target: int | None = None
    ingredients: list[str] = []
    preferences: list[str] = []  # e.g. high_protein, low_carb, light
    uses_remaining_calories: bool = False  # "I have X calories left" or "what should I eat"
