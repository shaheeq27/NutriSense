# NutriSense

**Nutrition That Makes Sense.** A personal AI nutrition platform: goals → daily plan → actual food → nutrition data → progress → insights.

| Path | What it is |
|---|---|
| `apps/web` | Next.js App Router frontend (TypeScript, Tailwind v4, TanStack Query, Zustand, Zod) |
| `apps/api` | FastAPI backend (Pydantic v2, SQLAlchemy 2, Alembic, JWT, pytest) |
| `docs/` | [Architecture](docs/architecture.md) · [Figma structure & handoff](docs/figma-structure.md) |
| `src/` (root) | Clickable Vite prototype, used as the design reference and for the Figma Make preview |

## Quick start

```bash
# API
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
alembic upgrade head && python -m app.db.seed
uvicorn app.main:app --reload          # http://localhost:8000/docs

# Web (new terminal)
cd apps/web
pnpm install
cp .env.example .env.local             # NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
pnpm dev                               # http://localhost:3001
```

Tests: `cd apps/api && pytest` · `cd apps/web && pnpm test`

See each app's README for its structure and conventions.
