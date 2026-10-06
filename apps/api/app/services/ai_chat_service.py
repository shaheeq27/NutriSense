"""AI Meal Assistant service.

Understands natural-language meal requests, extracts constraints via Gemini,
then uses existing NutriSense food/nutrition services to produce verified
meal suggestions.  Never invents nutrition values.
"""

from __future__ import annotations

import json
import logging
import re

import httpx
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import BusinessRuleViolation
from app.models.user import User
from app.schemas.ai_chat import AIChatResponse, MealSuggestion, ParsedIntent
from app.schemas.common import SLOTS
from app.services import nutrition_service
from app.services.food_service import FoodService
from app.services.tracking_service import TrackingService

logger = logging.getLogger(__name__)

# ── Gemini prompt for intent parsing ────────────────────────────────────

_INTENT_SYSTEM_PROMPT = """\
You are a meal-request parser for a nutrition app.

Given a user message, extract a structured JSON intent.

Return ONLY a JSON object with these keys:
- "intent": one of "meal_suggestion", "greeting", "clarification", "out_of_scope"
- "meal_type": one of "breakfast", "lunch", "snack", "dinner", or null
- "calorie_target": integer or null (explicit calorie number the user mentioned)
- "ingredients": list of ingredient strings the user says they have (empty list if none)
- "preferences": list of tags like "high_protein", "low_carb", "light", "quick", \
"healthy", "filling" (empty list if none)
- "uses_remaining_calories": true if the user is asking about remaining/leftover \
calories for the day, false otherwise

Examples:
User: "Suggest me a 600 calorie dinner"
→ {"intent":"meal_suggestion","meal_type":"dinner","calorie_target":600,\
"ingredients":[],"preferences":[],"uses_remaining_calories":false}

User: "I have rice, eggs and paneer. What can I cook?"
→ {"intent":"meal_suggestion","meal_type":null,"calorie_target":null,\
"ingredients":["rice","eggs","paneer"],"preferences":[],"uses_remaining_calories":false}

User: "I have 800 calories left today. What should I eat?"
→ {"intent":"meal_suggestion","meal_type":null,"calorie_target":800,\
"ingredients":[],"preferences":[],"uses_remaining_calories":true}

User: "Give me a high protein meal"
→ {"intent":"meal_suggestion","meal_type":null,"calorie_target":null,\
"ingredients":[],"preferences":["high_protein"],"uses_remaining_calories":false}

User: "Hello!"
→ {"intent":"greeting","meal_type":null,"calorie_target":null,\
"ingredients":[],"preferences":[],"uses_remaining_calories":false}

User: "What's the weather today?"
→ {"intent":"out_of_scope","meal_type":null,"calorie_target":null,\
"ingredients":[],"preferences":[],"uses_remaining_calories":false}

Return ONLY the JSON object — no markdown fences, no commentary.
"""

_RESPONSE_SYSTEM_PROMPT = """\
You are a friendly, concise meal assistant for a nutrition tracking app called NutriSense.

You will receive:
1. A user's meal request.
2. A verified meal suggestion with real nutrition data from our database.
3. The user's dietary context (diet style, allergies, calorie target).

Your job is to write a short, warm, helpful response (2-4 sentences) that:
- Presents the suggested meal naturally
- Mentions key nutrition highlights (calories, protein if relevant)
- References the user's context if appropriate (e.g. "Since you're vegetarian...")
- Encourages the user to add it to their plan if they like it

Do NOT invent or modify any nutrition numbers. Use ONLY the numbers provided.
Do NOT suggest cooking instructions unless the user asked.
Keep it brief and conversational.
"""


class AIChatService:
    """Handles AI meal assistant chat interactions."""

    def __init__(self, db: Session):
        self.db = db
        self.foods = FoodService(db)
        self.tracking = TrackingService(db)
        settings = get_settings()
        self._api_key = settings.GEMINI_API_KEY
        self._model = settings.GEMINI_MODEL

    # ────────────────────────────────────────────────────── public API

    def chat(self, user: User, message: str) -> AIChatResponse:
        """Process a user message and return a response with optional meal suggestion."""
        intent = self._parse_intent(message)

        if intent.intent == "greeting":
            return AIChatResponse(
                message=self._greeting_message(user),
            )

        if intent.intent == "out_of_scope":
            return AIChatResponse(
                message="I'm your meal assistant — I can help you find meals that "
                "fit your nutrition goals! Try asking me something like "
                "\"Suggest a high protein dinner\" or \"I have rice and eggs, "
                "what can I cook?\"",
            )

        if intent.intent == "clarification":
            return AIChatResponse(
                message="Could you tell me a bit more? For example, what meal "
                "type you're looking for, any ingredients you have, or a "
                "calorie target.",
            )

        # intent == "meal_suggestion"
        return self._handle_meal_suggestion(user, message, intent)

    # ────────────────────────────────────────────────────── intent parsing

    def _parse_intent(self, message: str) -> ParsedIntent:
        """Extract structured intent from the user's message.

        Uses Gemini when available; falls back to deterministic parsing.
        """
        if self._api_key:
            try:
                return self._parse_intent_llm(message)
            except Exception:
                logger.warning("LLM intent parsing failed, falling back to deterministic", exc_info=True)

        return self._parse_intent_deterministic(message)

    def _parse_intent_llm(self, message: str) -> ParsedIntent:
        """Use Gemini to extract structured intent."""
        raw = self._call_gemini(_INTENT_SYSTEM_PROMPT, message)
        cleaned = re.sub(r"```(?:json)?", "", raw).strip().strip("`")
        data = json.loads(cleaned)
        return ParsedIntent(**data)

    @staticmethod
    def _parse_intent_deterministic(message: str) -> ParsedIntent:
        """Simple deterministic parsing as fallback when no LLM is available."""
        msg = message.lower().strip()
        # Strip trailing punctuation for greeting matching
        msg_clean = msg.rstrip("!?.,:; ")

        # Greetings
        if msg_clean in ("hi", "hello", "hey", "hola", "namaste"):
            return ParsedIntent(intent="greeting")

        # Out of scope — no food/meal keywords at all
        food_words = {"meal", "eat", "food", "cook", "suggest", "calorie", "calories",
                      "kcal", "protein", "dinner", "lunch", "breakfast", "snack",
                      "hungry", "recipe", "diet", "vegetarian", "vegan", "healthy",
                      "ingredient", "carb", "carbs", "fat", "fiber"}
        msg_words = set(re.split(r"\W+", msg))
        if not (food_words & msg_words):
            return ParsedIntent(intent="out_of_scope")

        # Meal type detection
        meal_type = None
        for slot in SLOTS:
            if slot in msg:
                meal_type = slot
                break

        # Calorie target extraction
        calorie_target = None
        uses_remaining = False
        cal_match = re.search(r"(\d{2,4})\s*(?:cal(?:orie)?s?|kcal)", msg)
        if cal_match:
            calorie_target = int(cal_match.group(1))
        remaining_match = re.search(r"(\d{2,4})\s*(?:cal(?:orie)?s?|kcal)?\s*(?:left|remaining)", msg)
        if remaining_match:
            calorie_target = int(remaining_match.group(1))
            uses_remaining = True

        # Preferences
        prefs = []
        if "high protein" in msg or "high-protein" in msg:
            prefs.append("high_protein")
        if "low carb" in msg or "low-carb" in msg:
            prefs.append("low_carb")
        if "light" in msg:
            prefs.append("light")
        if "healthy" in msg:
            prefs.append("healthy")

        # Ingredients — look for "I have X, Y and Z" pattern
        ingredients: list[str] = []
        have_match = re.search(r"i have\s+(.+?)(?:\.\s*|$)", msg)
        if have_match:
            raw = have_match.group(1)
            # Remove trailing question/intent phrases
            raw = re.sub(r"\s*(?:what|how|can|should|make|cook|suggest).*$", "", raw)
            parts = re.split(r"\s*(?:,|and|&)\s*", raw)
            ingredients = [p.strip() for p in parts if p.strip() and "calorie" not in p]

        return ParsedIntent(
            intent="meal_suggestion",
            meal_type=meal_type,
            calorie_target=calorie_target,
            ingredients=ingredients,
            preferences=prefs,
            uses_remaining_calories=uses_remaining,
        )

    # ────────────────────────────────────────────────────── meal suggestion

    def _handle_meal_suggestion(
        self, user: User, original_message: str, intent: ParsedIntent
    ) -> AIChatResponse:
        """Build a meal suggestion using NutriSense food/nutrition services."""
        profile = user.profile
        targets = nutrition_service.targets_for_profile(profile)
        diet_style = profile.diet_style if profile else "any"
        allergies = list(profile.allergies or []) if profile else []

        # Determine effective calorie target for this suggestion
        calorie_target = intent.calorie_target
        if intent.uses_remaining_calories:
            # Use actual remaining calories from tracking
            summary = self.tracking.summary(user)
            calorie_target = max(0, round(summary.remaining_kcal))
        elif calorie_target is None:
            # Default: use slot share of daily target
            from app.services.meal_planning_service import SLOT_SHARE
            slot = intent.meal_type or "lunch"
            calorie_target = round(targets.kcal * SLOT_SHARE.get(slot, 0.30))

        # Find a matching food from the NutriSense database
        meal = self._find_meal(intent, calorie_target, diet_style, allergies)

        if meal is None:
            return AIChatResponse(
                message="I couldn't find a good match in our food database for "
                "that request. Try being more specific about what you'd like, "
                "or check out your personalized meal plan for today!",
            )

        # Generate a conversational response
        response_message = self._format_response(
            user, original_message, meal, diet_style, allergies, calorie_target,
        )

        return AIChatResponse(message=response_message, meal=meal)

    def _find_meal(
        self,
        intent: ParsedIntent,
        calorie_target: int,
        diet_style: str,
        allergies: list[str],
    ) -> MealSuggestion | None:
        """Search NutriSense food database for a meal matching the intent.

        All nutrition data comes from FoodService/NutritionService — never invented.
        """
        from app.services.meal_planning_service import (
            DIET_RANK,
            extract_allergens,
            normalize_allergen,
        )

        # Build search queries from intent
        search_queries = self._build_search_queries(intent)
        blocked_allergens = extract_allergens(allergies)

        best_match = None
        best_distance = float("inf")

        for query in search_queries:
            try:
                results = self.foods.search(query, limit=20)
            except Exception:
                logger.warning("Food search failed for query %s", query, exc_info=True)
                continue
            for food in results.items:
                # Check diet compatibility
                food_tag_lower = food.tag.lower() if food.tag else ""
                # Skip non-vegetarian foods for vegetarian/vegan users
                if diet_style in ("vegetarian", "vegan"):
                    meat_terms = {"chicken", "mutton", "beef", "pork", "lamb",
                                  "fish", "prawn", "shrimp", "meat", "kebab"}
                    if any(t in food.name.lower() for t in meat_terms):
                        continue
                if diet_style == "vegan":
                    animal_terms = {"egg", "paneer", "cheese", "curd", "yogurt",
                                    "milk", "butter", "ghee", "cream"}
                    if any(t in food.name.lower() for t in animal_terms):
                        continue

                # Check allergen safety
                food_name_lower = food.name.lower()
                food_allergens = set()
                for word in food_name_lower.split():
                    normalized = normalize_allergen(word)
                    food_allergens.add(normalized)
                if blocked_allergens & food_allergens:
                    continue

                # Skip estimates — we want verified nutrition only
                if food.estimated:
                    continue

                # Score by calorie proximity
                distance = abs(food.kcal - calorie_target)
                if distance < best_distance:
                    best_distance = distance
                    best_match = food

        if best_match is None:
            return None

        # Scale servings to approach calorie target
        if best_match.kcal > 0:
            ratio = calorie_target / best_match.kcal
            # Snap to reasonable serving steps
            serving_steps = (0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0)
            servings = min(serving_steps, key=lambda s: abs(s - ratio))
        else:
            servings = 1.0

        facts = nutrition_service.scale(best_match, servings)
        slot = intent.meal_type or self._infer_meal_type(best_match)

        # Build ingredient list from food name
        ingredients = [best_match.name]
        if intent.ingredients:
            ingredients = intent.ingredients

        return MealSuggestion(
            name=best_match.name,
            description=f"{servings:g} {best_match.unit} of {best_match.name}",
            calories=facts.kcal,
            protein=facts.protein,
            carbs=facts.carbs,
            fat=facts.fat,
            fiber=facts.fiber,
            ingredients=ingredients,
            meal_type=slot,
            food_id=best_match.id,
            slug=best_match.slug,
        )

    def _build_search_queries(self, intent: ParsedIntent) -> list[str]:
        """Build food search queries from the parsed intent."""
        queries: list[str] = []

        # Ingredient-based queries
        if intent.ingredients:
            # Search for each ingredient individually
            queries.extend(intent.ingredients)
            # Also try combined
            if len(intent.ingredients) <= 3:
                queries.append(" ".join(intent.ingredients))

        # Preference-based queries
        if "high_protein" in intent.preferences:
            protein_foods = ["chicken breast", "eggs", "paneer", "dal", "greek yogurt",
                             "tofu", "fish", "chickpeas"]
            queries.extend(protein_foods[:4])
        if "low_carb" in intent.preferences:
            queries.extend(["salad", "chicken", "eggs", "paneer"])

        # Meal-type based defaults
        if not queries:
            slot = intent.meal_type or "lunch"
            defaults = {
                "breakfast": ["oats", "eggs", "idli", "poha"],
                "lunch": ["rice", "dal", "roti", "chicken"],
                "snack": ["fruit", "nuts", "yogurt"],
                "dinner": ["roti", "paneer", "dal", "chicken"],
            }
            queries.extend(defaults.get(slot, defaults["lunch"]))

        return queries

    @staticmethod
    def _infer_meal_type(food) -> str:
        """Infer meal type from food tags/name."""
        name_lower = food.name.lower()
        tag_lower = (food.tag or "").lower()
        if any(w in name_lower or w in tag_lower for w in ("oats", "cereal", "idli", "poha", "upma", "dosa", "paratha")):
            return "breakfast"
        if any(w in name_lower or w in tag_lower for w in ("fruit", "nut", "snack", "cookie", "biscuit")):
            return "snack"
        return "lunch"

    # ────────────────────────────────────────────────────── response formatting

    def _format_response(
        self,
        user: User,
        original_message: str,
        meal: MealSuggestion,
        diet_style: str,
        allergies: list[str],
        calorie_target: int,
    ) -> str:
        """Generate a conversational response for the meal suggestion.

        Uses Gemini when available; falls back to a template.
        """
        if self._api_key:
            try:
                return self._format_response_llm(
                    user, original_message, meal, diet_style, allergies, calorie_target,
                )
            except Exception:
                logger.warning("LLM response formatting failed, using template", exc_info=True)

        return self._format_response_template(user, meal, diet_style, calorie_target)

    def _format_response_llm(
        self,
        user: User,
        original_message: str,
        meal: MealSuggestion,
        diet_style: str,
        allergies: list[str],
        calorie_target: int,
    ) -> str:
        """Use Gemini to create a friendly conversational response."""
        context = (
            f"User request: {original_message}\n\n"
            f"Suggested meal: {meal.name}\n"
            f"Description: {meal.description}\n"
            f"Calories: {meal.calories} kcal\n"
            f"Protein: {meal.protein}g | Carbs: {meal.carbs}g | Fat: {meal.fat}g\n"
            f"Meal type: {meal.meal_type}\n\n"
            f"User context:\n"
            f"- Name: {user.name}\n"
            f"- Diet style: {diet_style}\n"
            f"- Allergies: {', '.join(allergies) if allergies else 'none'}\n"
            f"- Calorie target for this meal: {calorie_target} kcal"
        )
        return self._call_gemini(_RESPONSE_SYSTEM_PROMPT, context)

    @staticmethod
    def _format_response_template(
        user: User,
        meal: MealSuggestion,
        diet_style: str,
        calorie_target: int,
    ) -> str:
        """Deterministic template-based response formatting."""
        parts = [f"How about **{meal.name}**?"]
        parts.append(
            f"It comes in at {meal.calories} kcal with {meal.protein}g protein, "
            f"{meal.carbs}g carbs, and {meal.fat}g fat."
        )
        if diet_style not in ("any", ""):
            parts.append(f"This works with your {diet_style} preference.")
        parts.append(
            "If it looks good, you can add it to your meal plan!"
        )
        return " ".join(parts)

    def _greeting_message(self, user: User) -> str:
        name = user.name or "there"
        return (
            f"Hey {name}! 👋 I'm your NutriSense meal assistant. "
            "Tell me what you're in the mood for, what ingredients you have, "
            "or a calorie target — and I'll find something that fits your goals!"
        )

    # ────────────────────────────────────────────────────── Gemini API call

    def _call_gemini(self, system_prompt: str, user_message: str) -> str:
        """Make a text-only Gemini API call. Raises on failure."""
        endpoint = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self._model}:generateContent"
        )
        url = f"{endpoint}?key={self._api_key}"
        payload = {
            "systemInstruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"parts": [{"text": user_message}]}],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 1024,
            },
        }

        resp = httpx.post(url, json=payload, timeout=30.0)
        resp.raise_for_status()

        data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
