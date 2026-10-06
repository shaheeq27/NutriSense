# NutriSense Architecture

**NutriSense — Nutrition That Makes Sense.**

The project is one monorepo with one frontend and one backend. It is a modular monolith, not microservices: every domain is a module inside a single deployable API. A domain can be split out later if a concrete need appears, such as heavy vision inference.

```
nutrisense/
├── apps/
│   ├── web/          Next.js (App Router, TypeScript): product UI
│   └── api/          FastAPI: versioned REST API, business logic, persistence
├── docs/
│   ├── architecture.md   (this file)
│   └── figma-structure.md Figma page structure and design-to-code handoff
└── src/, index.html, vite.config.ts
                      Clickable Vite prototype (design reference; powers the Figma Make preview)
```

## Request flow

```
Next.js page ─▶ feature component ─▶ feature hook (TanStack Query) ─▶ lib/api client
                                                                         │ HTTP /api/v1
FastAPI route (thin) ─▶ service (business rules) ─▶ repository (SQLAlchemy) ─▶ DB
                               └──▶ provider (USDA food data, vision model)
```

## Domain ownership

Each responsibility has exactly one owner. Other code calls that owner instead of copying its logic.

| Domain | Backend owner | Frontend feature | Notes |
|---|---|---|---|
| Food identification | `services/scan_service.py` + `providers/vision` | `features/food-analysis` (scan) | Returns candidates + confidence only |
| Food search | `services/food_service.py` + `providers/food_data` | `features/food-analysis` (search) | Ranking, aliases, plurals |
| Nutrition data & math | `services/nutrition_service.py` | `features/food-analysis` (result) | Serving scaling, %DV, estimates, NL parsing, targets |
| BMI | `services/bmi_service.py` | `features/bmi` | WHO categories, healthy range |
| Meal planning | `services/meal_planning_service.py` | `features/meal-planning` | 3-day window (today + 2), swaps |
| Daily tracking | `services/tracking_service.py` | `features/tracking`, `features/dashboard` | Logging allowed for today only |
| Progress | `services/progress_service.py` | `features/progress` | 7d / 30d / 90d aggregates |
| Recommendations | `services/recommendation_service.py` | `features/recommendations` | Rule-based insights from summary + profile |
| Auth & profile | `services/auth_service.py`, `user_service.py` | `features/auth`, `features/onboarding`, `features/profile` | JWT bearer tokens |

## Rules

1. **No business logic in route handlers or pages.** Routes validate, call one service, and return a schema. Pages compose feature components.
2. **Services own the rules. Repositories own data access. Providers own external I/O.** Services never build SQL or HTTP calls themselves.
3. **The server is the source of truth for rules** such as the planning window and today-only logging. The UI mirrors them for a good user experience, but never relies on that alone.
4. **The API contract is shared.** Pydantic response schemas in `apps/api/app/schemas` mirror the TypeScript models in `apps/web/src/types`. Change both in the same PR.
5. **UI primitives live once**, in `apps/web/src/components/ui`. Features compose them and never fork them.
6. **Public and member features.** Search, natural-language input, scan, nutrition results and BMI work without login. Onboarding, plans, dashboard, tracking, progress and profile require a bearer token.

## Environments

| | Web | API |
|---|---|---|
| Local | `pnpm dev` (port 3001) | `uvicorn app.main:app --reload` (port 8000), SQLite |
| Production | Vercel / any Node host | Docker image, PostgreSQL via `DATABASE_URL`, `alembic upgrade head` on deploy |
