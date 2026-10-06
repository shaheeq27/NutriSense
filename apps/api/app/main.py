import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1.router import api_router
from app.core.config import Settings, get_settings
from app.core.exceptions import DomainError
from app.core.logging import RequestIdMiddleware, setup_logging

log = logging.getLogger("nutrisense")


def _error(status: int, code: str, message: str, details=None) -> JSONResponse:
    body: dict = {"error": {"code": code, "message": message}}
    if details is not None:
        body["error"]["details"] = details
    return JSONResponse(status_code=status, content=body)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def _domain(_: Request, exc: DomainError):
        headers = {"WWW-Authenticate": "Bearer"} if exc.status_code == 401 else None
        resp = _error(exc.status_code, exc.code, exc.message)
        if headers:
            resp.headers.update(headers)
        return resp

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError):
        details = [{"loc": list(e["loc"]), "msg": e["msg"]} for e in exc.errors()]
        return _error(422, "validation_error", "Request validation failed", details)

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, exc: StarletteHTTPException):
        return _error(exc.status_code, "http_error", str(exc.detail))

    @app.exception_handler(Exception)
    async def _unhandled(_: Request, exc: Exception):
        log.exception("unhandled error")
        return _error(500, "internal_error", "Something went wrong")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    setup_logging(settings.LOG_LEVEL)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        if settings.SEED_ON_STARTUP:
            from app.db.seed import seed
            from app.db.session import SessionLocal

            try:
                with SessionLocal() as db:
                    seed(db)
            except Exception:  # tables may not exist yet (run `alembic upgrade head`)
                log.exception("seeding skipped")
        yield

    app = FastAPI(title=settings.APP_NAME, description="Nutrition That Makes Sense", version="0.1.0",
                  lifespan=lifespan)
    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(CORSMiddleware, allow_origins=settings.CORS_ORIGINS, allow_credentials=True,
                       allow_methods=["*"], allow_headers=["*"], expose_headers=["X-Request-ID"])
    register_exception_handlers(app)
    app.include_router(api_router)

    @app.get("/health", tags=["meta"])
    def health():
        return {"status": "ok", "env": settings.ENV}

    return app


app = create_app()
