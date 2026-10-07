"""Idempotent seed of the food library and meal templates (ported from src/nl/foods.ts + data.ts).

Run manually: `python -m app.db.seed`
"""

import logging

from sqlalchemy.orm import Session

from app.db.food_data import FOOD_ROWS
from app.models.food import Food
from app.models.meal import MealTemplate
from app.repositories.food_repo import FoodRepository
from app.repositories.meal_plan_repo import MealPlanRepository
from app.services.text import slugify

log = logging.getLogger(__name__)

_U = "https://images.unsplash.com/photo-{}?w=800&h=600&fit=crop&auto=format"
_IMG = {
    "chicken-biryani": "https://authenticroyal.com/wp-content/uploads/2024/10/royal-rice-may-220461.jpg",
    "banana": _U.format("1571771894821-ce9b6c11b08e"),
    "chicken-tikka": _U.format("1599487488170-d11ec9c172f0"),
    "paneer-butter-masala": _U.format("1631452180519-c014fe946bc7"),
    "2-eggs-2-rotis": _U.format("1482049016688-2d3e1b311543"),
    "masala-dosa": "https://vismaifood.com/storage/app/uploads/public/8b4/19e/427/thumb__1200_0_0_0_auto.jpg",
    "mutton-biryani": "https://www.foodiaq.com/wp-content/uploads/2025/05/Mutton-biryani.jpg",
    "idli-sambar": "https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto/InstamartAssets/Receipes/sambhar_idli.webp",
    "aloo-paratha": _U.format("1589301760014-d929f3979dbc"),
    "pani-puri": "https://cdn1.foodviva.com/static-content/food-images/snacks-recipes/pani-puri/pani-puri.jpg",
    "samosa": _U.format("1601050690597-df0568f70950"),
    "pasta-alfredo": "https://girlwiththeironcast.com/wp-content/uploads/2022/04/blackened-chicken-alfredo-9.jpg",
    "chicken-momos": "https://www.pillsbury.in/wp-content/uploads/2023/11/Recipe.jpg",
    "veg-momos": "https://www.pillsbury.in/wp-content/uploads/2023/11/Recipe.jpg",
    "brown-rice": "https://img.etimg.com/thumb/msid-120284885,width-650,height-488,imgsize-242102,resizemode-75/brown-rice.jpg",
    "plain-rice": "https://bitesofindiaevan.com/wp-content/uploads/2024/11/Plain-Rice.png",
    "chicken-curry": "https://www.tamingtwins.com/wp-content/uploads/2026/07/EasyChickenCurry3.jpg",
    "vada-pav": "https://www.cookwithmanali.com/wp-content/uploads/2018/04/Vada-Pav-500x500.jpg",
    "roti": "https://tandoormorni.com/wp-content/uploads/2026/08/tandoori-roti-hero-plated.jpg",
    "naan": "https://www.allrecipes.com/thmb/RCYfM95dJnmSmQMsvJxC_J_UFAQ=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/270860-garlic-naan-VAT-Beauty-2x1-4595c25d402c40969b3833ba43c99950.jpg",
    "ramen": "https://peasandcrayons.com/wp-content/uploads/2020/04/spicy-vegetarian-ramen-recipe-3.jpg",
    "upma": "https://rakskitchen.net/wp-content/uploads/2013/02/8423565854_3a8c072331_z.jpg",
    "poha": "https://www.jcookingodyssey.com/wp-content/uploads/2024/11/gujarati-bateta-poha.jpg",
    "khichdi": "https://pickyeaterblog.com/wp-content/uploads/2021/03/Indian-Fried-Rice-Khichdi-Final-2.jpg",
    "dal-tadka": "https://rainbowplantlife.com/wp-content/uploads/2024/05/Dal-Palak-cover-photo-1-of-1.jpg",
    "pav-bhaji": "https://www.cubesnjuliennes.com/wp-content/uploads/2020/07/Instant-Pot-Mumbai-Pav-Bhaji.jpg",
    "rajma-chawal": "https://indishious.com/_astro/55ad7308-9f71-4041-98a3-3e1f3d5dcdce_rajma-chawal_NyYYs.jpeg",
    "omelette": "https://shivanilovesfood.com/wp-content/uploads/2025/02/Masala-Omelette-4.jpg",
    "veg-hakka-noodles": "https://www.seriouseats.com/thmb/hmLAHsyg1riGn2Iy6u0slpXppxM=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/20260707-SEA-SpicySourNoodles-CaleyEllenburg-HERO-f780cb9174fd4a278a9441030ed82480.jpg",
    "chicken-noodle-soup": "https://www.seriouseats.com/thmb/hmLAHsyg1riGn2Iy6u0slpXppxM=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/20260707-SEA-SpicySourNoodles-CaleyEllenburg-HERO-f780cb9174fd4a278a9441030ed82480.jpg",
    "chicken-rice-bowl": _U.format("1512621776951-a57141f2eefd"),
    "chicken-curry-rice": _U.format("1603894584373-5ac82b2ae398"),
}

# (slot, name, description, tags, why, kcal, protein, carbs, fat, diet, allergens, image_id)
MEAL_TEMPLATES: list[tuple] = [
    ("breakfast", "Oats + Banana + Eggs", "Rolled oats, sliced banana and two soft-boiled eggs.",
     "Slow carbs • Protein start", "Gives you a steady morning and a head start on protein.",
     420, 24, 58, 12, "eggetarian", ["egg", "gluten"], "1517673400267-0251440c45dc"),
    ("breakfast", "Poha + Peanuts", "Flattened rice with peas, peanuts, curry leaves and lemon.",
     "Light • Vegan", "A light, easy-to-digest start.", 340, 9, 52, 11, "vegan", ["peanut"], None),
    ("breakfast", "Paneer Paratha + Curd", "Whole-wheat paratha stuffed with paneer, with a bowl of curd.",
     "Vegetarian • Protein", "Protein-rich vegetarian breakfast.", 480, 22, 52, 20, "vegetarian",
     ["dairy", "gluten"], None),
    ("breakfast", "Idli Sambar", "Three steamed idlis with lentil sambar.", "Fermented • Low fat",
     "Low fat with plant protein from the sambar.", 300, 11, 56, 3, "vegan", [], None),
    ("lunch", "Chicken Rice Bowl", "Grilled chicken, jeera rice, cucumber and mint yoghurt.",
     "Balanced • High Protein", "Fits your lunch target and supports your selected nutrition goal.",
     620, 38, 72, 18, "any", ["dairy"], "1512621776951-a57141f2eefd"),
    ("lunch", "Chicken Wrap", "Whole-wheat wrap with grilled chicken and salad.", "Lighter • Similar protein",
     "Lighter with similar protein.", 520, 34, 50, 18, "any", ["gluten"], "1626700051175-6818013e1d4f"),
    ("lunch", "Paneer Rice Bowl", "Tikka paneer, rice, peppers and onions.", "Similar calories • Vegetarian",
     "Similar calories, vegetarian.", 590, 27, 68, 22, "vegetarian", ["dairy"], "1601050690597-df0568f70950"),
    ("lunch", "Dal + Rice + Vegetables", "Yellow dal, steamed rice and seasonal sabzi.",
     "Higher fiber • Comfort pick", "Higher fiber comfort pick.", 540, 22, 88, 10, "vegan", [],
     "1585937421612-70a008356fbe"),
    ("lunch", "Grilled Chicken Bowl", "Grilled chicken, quinoa, greens and roasted veg.",
     "Fewer calories • Higher protein", "Fewer calories, higher protein.", 480, 44, 40, 14, "any", [],
     "1512621776951-a57141f2eefd"),
    ("snack", "Greek Yogurt + Fruit", "Thick yogurt with berries and a drizzle of honey.", "Light • Calcium",
     "A light protein bridge between lunch and dinner.", 220, 14, 28, 5, "vegetarian", ["dairy"],
     "1488477181946-6428a0291777"),
    ("snack", "Roasted Chana", "A handful of roasted chickpeas with a squeeze of lime.", "Crunchy • Vegan",
     "Plant protein and fiber in a small portion.", 180, 10, 27, 3, "vegan", [], None),
    ("snack", "Apple + Peanut Butter", "Sliced apple with two tablespoons of peanut butter.", "Fiber • Healthy fats",
     "Keeps you full until dinner.", 285, 8, 32, 16, "vegan", ["peanut"], None),
    ("snack", "Boiled Eggs", "Two boiled eggs with pepper and salt.", "High protein",
     "Pure protein, almost no carbs.", 156, 12, 1, 10, "eggetarian", ["egg"], None),
    ("dinner", "Paneer + Roti", "Palak paneer with two whole-wheat rotis.", "Vegetarian • Fiber",
     "Rounds out your day with fiber and iron from spinach.", 540, 26, 52, 24, "vegetarian",
     ["dairy", "gluten"], "1585937421612-70a008356fbe"),
    ("dinner", "Grilled Salmon + Veg", "Salmon fillet with broccoli and sweet potato.", "Omega-3 • Protein",
     "Omega-3 rich and satisfying.", 580, 44, 37, 28, "any", ["fish"], None),
    ("dinner", "Chicken Curry + Rice", "Home-style chicken curry with a cup of rice.", "Comfort • Protein",
     "A classic, balanced dinner.", 585, 32, 55, 25, "any", [], "1603894584373-5ac82b2ae398"),
    ("dinner", "Tofu Stir-fry + Brown Rice", "Tofu with mixed vegetables and brown rice.", "Vegan • Protein",
     "Plant protein with whole grains.", 520, 28, 62, 16, "vegan", ["soy"], None),
    ("dinner", "Khichdi + Curd", "Moong dal khichdi with a bowl of curd.", "Light • Comfort",
     "Easy on the stomach before bed.", 470, 20, 65, 14, "vegetarian", ["dairy"], None),
]


def seed(db: Session) -> None:
    foods = FoodRepository(db)
    if foods.count() == 0:
        items = []
        for name, tag, unit, kcal, p, c, f, fib, sug, sod, emoji, aliases in FOOD_ROWS:
            slug = slugify(name)
            img = _IMG.get(slug)
            image_url = img if (img and img.startswith("http")) else (_U.format(img) if img else None)
            items.append(Food(slug=slug, name=name, tag=tag, unit=unit, kcal=kcal, protein=p, carbs=c, fat=f,
                              fiber=fib, sugar=sug, sodium=sod, emoji=emoji, aliases=aliases or "",
                              image_url=image_url, source="local"))
        foods.add_many(items)
        log.info("seeded foods", extra={"count": len(items)})
    plans = MealPlanRepository(db)
    if plans.count_templates() == 0:
        plans.add_templates([
            MealTemplate(slot=s, name=n, description=d, tags=t, why=w, kcal=k, protein=p, carbs=c, fat=f,
                         diet=diet, allergens=al, image_url=_U.format(img) if img else None)
            for s, n, d, t, w, k, p, c, f, diet, al, img in MEAL_TEMPLATES
        ])


if __name__ == "__main__":
    from app.db.base import Base
    from app.db.session import SessionLocal, engine

    Base.metadata.create_all(engine)
    with SessionLocal() as s:
        seed(s)
    print("Seed complete")
