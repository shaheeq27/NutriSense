# NutriSense

### Nutrition That Makes Sense. 🥗

> **Understand your food. Build your better day.**

Imagine eating healthy every day, but not having the time to count calories, understand what's on your plate, plan your meals, or figure out what actually fits your goals.

**NutriSense brings all of that into one intelligent nutrition companion.**

Search for food. Scan it with AI. Understand its nutrition. Plan your meals. Track your progress. And when you don't know what to cook — just ask.

---

## ✨ What is NutriSense?

**NutriSense** is an AI-powered nutrition platform that helps users understand, plan, and improve their everyday eating habits.

It combines **computer vision, conversational AI, verified nutrition databases, personalized calorie targets, meal planning, tracking, and progress insights** into a single experience.

The goal isn't to tell you what you *shouldn't* eat.

It's to help you understand what you're eating and make better decisions.

---

## 🚀 Features

### 📷 AI Food Recognition

Take a picture of your food and let NutriSense identify what's on your plate.

The vision pipeline identifies food first and then resolves it against verified nutrition data.

**AI identifies the food.  
Trusted nutrition data provides the numbers.**

---

### 🤖 NutriSense AI

Your personal conversational nutrition assistant.

Ask things like:

> *"Suggest me a 600 calorie meal."*

> *"I have rice, eggs and paneer. What can I cook around 700 calories?"*

> *"Suggest a high-protein dinner."*

NutriSense AI understands your context and generates meal suggestions using your:

- Nutrition targets
- Dietary preferences
- Allergies
- Current nutrition intake
- Available food data

Nutrition values are resolved through NutriSense's verified food services rather than being invented by the AI.

---

### 🔍 Smart Food Search

Don't want to use the camera?

Just search.

Search for:

- Individual foods
- Ingredients
- Meals
- Common dishes
- Packaged foods

Whole-food nutrition is powered by **USDA FoodData Central**, while packaged products can be resolved through **Open Food Facts**.

---

### 🎯 Personalized Nutrition

NutriSense calculates personalized nutrition targets using user profile information such as:

- Age
- Biological sex
- Height
- Weight
- Activity level
- Goal

Targets dynamically adapt as the user's profile changes.

---

### 🍱 Intelligent Meal Planning

Build a meal plan around your actual goals.

NutriSense considers:

- Daily calorie targets
- Macronutrient targets
- Dietary preferences
- Allergies
- Planned meals
- Current progress

Users can also swap meals or add their own foods.

---

### 📊 Nutrition Tracking

Log what you actually eat and see how it fits into your day.

Track:

- Calories
- Protein
- Carbohydrates
- Fat
- Fiber
- Sugar
- Sodium

Planning and tracking remain separate, so adding something to your meal plan doesn't automatically pretend that you ate it.

---

### 🔥 Streaks & Progress

NutriSense focuses on **consistency rather than perfection**.

Track:

- Current streak
- Best streak
- Logged days
- Nutrition progress
- Weekly activity

> **Your streak can reset. Your progress doesn't.**

---

## 🧠 How NutriSense Works

```text
                         USER
                           │
            ┌──────────────┴──────────────┐
            │                             │
        Search Food                  Scan Food
            │                             │
            ▼                             ▼
      Food Service                 Vision Service
            │                             │
            └──────────────┬──────────────┘
                           ▼
                    Food Resolution
                           │
                           ▼
                  Verified Nutrition
                    ┌──────┴──────┐
                    │             │
                  USDA       Open Food Facts
                    │             │
                    └──────┬──────┘
                           ▼
                 Nutrition Engine
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
      Meal Logs       Meal Planner      Insights
          │                │                │
          └────────────────┼────────────────┘
                           ▼
                     Progress & Streaks
```

---

## 🧠 AI & Machine Learning

### Food Classification

NutriSense includes a custom food-classification model built using:

- **PyTorch**
- **EfficientNet-B0**

The trained model currently supports **66 food categories**.

The category mapping is maintained in:

```text
apps/api/app/providers/vision/models/class_to_idx.json
```

The trained model weights are kept locally and are intentionally excluded from the Git repository because of their size.

### Conversational AI

NutriSense AI uses **Google Gemini** for natural-language understanding and conversational interaction.

Gemini is not treated as the nutrition database.

Instead:

```text
User Request
     │
     ▼
   Gemini
     │
     ▼
Intent + Meal Understanding
     │
     ▼
NutriSense Services
     │
     ▼
Verified Food Data
     │
     ▼
Nutrition Response
```

This keeps the AI conversational while keeping nutrition calculations grounded in actual food data.

---

## 🎨 Product Experience

NutriSense is designed as a modern, mobile-friendly consumer nutrition application.

### Core Screens

- 🏠 Landing
- 🔍 Food Search
- 📷 AI Food Scanner
- 🥗 Nutrition Results
- ⚖️ BMI Calculator
- 🔐 Authentication
- 🌱 Onboarding
- 📊 Dashboard
- 🍱 Meal Planner
- 🤖 NutriSense AI
- 🔥 Progress & Streaks
- 👤 Profile

The product is built around a simple journey:

```text
What am I eating?
        ↓
Is it right for me?
        ↓
What should I eat?
        ↓
How am I doing?
        ↓
What should I eat next?
```

---

## ⚙️ Tech Stack

| Area | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Python, FastAPI, SQLAlchemy, Pydantic |
| AI | Google Gemini |
| Computer Vision | PyTorch, EfficientNet-B0 |
| Nutrition Data | USDA FoodData Central, Open Food Facts |
| Database | SQLite / PostgreSQL-ready architecture |
| Authentication | JWT |
| Testing | Pytest, Playwright |
| Development | Figma, VS Code |

---

## 🏗️ Project Structure

```text
NutriSense/
│
├── apps/
│   ├── api/              # FastAPI backend
│   └── web/              # Next.js application
│
├── src/
│   ├── App.tsx           # Main product UI / prototype
│   ├── nl/               # NutriSense UI components
│   └── assets/           # Product assets
│
├── docs/
├── .figma/
├── package.json
├── pnpm-lock.yaml
└── README.md
```

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/shaheeq27/NutriSense.git
cd NutriSense
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Backend

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

Create your environment file from:

```text
apps/api/.env.example
```

Then start the API:

```bash
uvicorn app.main:app --reload
```

### 4. Frontend

From the project root:

```bash
pnpm dev
```

> **Never commit real API keys or environment files.**

---

## 🌱 Our Philosophy

NutriSense is built around a few simple ideas:

- **AI should assist, not invent.**
- **Nutrition should be personalized.**
- **Planning and tracking should remain separate.**
- **Consistency matters more than perfection.**

---

## 👨‍💻 Built By

### Shaheeq Shaik

**AI/ML Engineer & Full-Stack Developer**

Interested in:

- Artificial Intelligence
- Machine Learning
- Computer Vision
- Full-Stack Development
- Product Design

[GitHub](https://github.com/shaheeq27)

---

# 🥗 NutriSense

### Nutrition That Makes Sense.

**Understand your food. Build your better day.**
