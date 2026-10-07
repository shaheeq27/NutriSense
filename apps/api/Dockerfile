FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Create dedicated non-root application user and group
RUN groupadd -r nutrisense && useradd -r -g nutrisense -m -d /home/nutrisense nutrisense \
    && chown -R nutrisense:nutrisense /app

# Install project dependencies (using CPU-optimized PyTorch wheel to keep container lean)
COPY --chown=nutrisense:nutrisense apps/api/pyproject.toml ./
COPY --chown=nutrisense:nutrisense apps/api/app ./app
RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu .

# Copy database migration files and alembic configuration
COPY --chown=nutrisense:nutrisense apps/api/alembic ./alembic
COPY --chown=nutrisense:nutrisense apps/api/alembic.ini ./

# Ensure /app remains writable by nutrisense user (essential for SQLite database creation / migrations)
RUN chown -R nutrisense:nutrisense /app

USER nutrisense

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
