# NutriSense API

*Nutrition That Makes Sense.* One FastAPI app with layered modules: no microservices.

## Setup

```bash
cd apps/api
python3 -m venv .venv && . .venv/bin/activate   # if ensurepip is missing: python3 -m venv --without-pip .venv + get-pip.py
pip install -e '.[dev]'
cp .env.example .env
alembic upgrade head          # create schema
python -m app.db.seed         # optional; the app also seeds on startup when SEED_ON_STARTUP=true
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
# Docs: http://localhost:8000/docs   Health: GET /health
```

Docker: `docker build -t nutrisense-api . && docker run -p 8000:8000 -e JWT_SECRET=... nutrisense-api`

## Test and lint

```bash
pytest
ruff check .
```

Tests use in-memory SQLite and a fixed clock (`app/core/clock.py`), so date rules are deterministic.

## Layout

```
app/
  main.py            create_app(): CORS, request-id logging, error handlers, routers
  core/              config, security (bcrypt + JWT), logging, exceptions, clock
  db/                Base, session, seed + food_data (ported from src/nl/foods.ts)
  models/            SQLAlchemy 2.0 models (user, food, meal, tracking)
  schemas/           Pydantic v2 request/response models
  repositories/      data access only
  providers/         food_data (local DB, USDA FDC) and vision (stub placeholder)
  services/          ALL business logic
  api/               deps (auth) + v1 routes (thin)
alembic/             migrations (0001_initial written by hand, verified with `alembic check`)
tests/               unit tests (services) and API tests
```

## Where logic lives

- **Routes** validate input, call one service method and return a schema. They contain no logic.
- **Services** own every rule and calculation. They raise domain errors (`NotFound`, `Conflict`,
  `BusinessRuleViolation`, `Unauthorized`), which `main.py` maps to `{"error": {"code", "message"}}`.
- **Repositories** only read and write the DB. **Providers** wrap external or replaceable sources.
- Get dates from `core.clock.today()` and never call `date.today()` directly.

Key rules:
- Planning window: dates must fall in `[today, today+2]` (`PLANNING_WINDOW_DAYS = 3`). Otherwise the API returns 422 with `planning_window_exceeded`.
- Logging is for today only. Past and future dates return 422 with `logging_not_allowed_for_date`.
- Targets use Mifflin-St Jeor x activity factor, plus a goal delta (lose -500, gain +300), with a 1200 kcal floor.
- The estimator uses whole-word, plural-aware keyword categories. When several categories match it averages them, and it scales by a leading quantity.

## Placeholders

- `providers/vision/stub.py` is **not** a real model. It returns deterministic candidates based on the filename and an image hash.
- The USDA provider is used only when `FOOD_PROVIDER=usda` and `USDA_API_KEY` is set. It has no automated tests.
