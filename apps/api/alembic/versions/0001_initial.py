"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-10-02
"""
import sqlalchemy as sa

from alembic import op

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "user_profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False,
                  unique=True),
        sa.Column("goal", sa.String(20), nullable=False),
        sa.Column("sex", sa.String(10), nullable=False),
        sa.Column("birth_year", sa.Integer(), nullable=True),
        sa.Column("height_cm", sa.Float(), nullable=False),
        sa.Column("weight_kg", sa.Float(), nullable=False),
        sa.Column("activity_level", sa.String(20), nullable=False),
        sa.Column("diet_style", sa.String(20), nullable=False),
        sa.Column("allergies", sa.JSON(), nullable=False),
    )

    op.create_table(
        "foods",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("slug", sa.String(120), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("tag", sa.String(120), nullable=False),
        sa.Column("unit", sa.String(60), nullable=False),
        sa.Column("kcal", sa.Float(), nullable=False),
        sa.Column("protein", sa.Float(), nullable=False),
        sa.Column("carbs", sa.Float(), nullable=False),
        sa.Column("fat", sa.Float(), nullable=False),
        sa.Column("fiber", sa.Float(), nullable=False),
        sa.Column("sugar", sa.Float(), nullable=False),
        sa.Column("sodium", sa.Float(), nullable=False),
        sa.Column("emoji", sa.String(16), nullable=False),
        sa.Column("aliases", sa.String(255), nullable=False),
        sa.Column("image_url", sa.String(500), nullable=True),
        sa.Column("source", sa.String(20), nullable=False),
    )
    op.create_index("ix_foods_slug", "foods", ["slug"], unique=True)
    op.create_index("ix_foods_name", "foods", ["name"])

    op.create_table(
        "meal_templates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("slot", sa.String(20), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("tags", sa.String(160), nullable=False),
        sa.Column("why", sa.String(300), nullable=False),
        sa.Column("kcal", sa.Float(), nullable=False),
        sa.Column("protein", sa.Float(), nullable=False),
        sa.Column("carbs", sa.Float(), nullable=False),
        sa.Column("fat", sa.Float(), nullable=False),
        sa.Column("diet", sa.String(20), nullable=False),
        sa.Column("allergens", sa.JSON(), nullable=False),
        sa.Column("image_url", sa.String(500), nullable=True),
    )
    op.create_index("ix_meal_templates_slot", "meal_templates", ["slot"])

    op.create_table(
        "meal_plan_days",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.UniqueConstraint("user_id", "date", name="uq_plan_user_date"),
    )
    op.create_index("ix_meal_plan_days_user_id", "meal_plan_days", ["user_id"])

    op.create_table(
        "planned_meals",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("day_id", sa.Integer(), sa.ForeignKey("meal_plan_days.id", ondelete="CASCADE"), nullable=False),
        sa.Column("slot", sa.String(20), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("kcal", sa.Float(), nullable=False),
        sa.Column("protein", sa.Float(), nullable=False),
        sa.Column("carbs", sa.Float(), nullable=False),
        sa.Column("fat", sa.Float(), nullable=False),
        sa.Column("servings", sa.Float(), nullable=False),
        sa.Column("template_id", sa.Integer(), sa.ForeignKey("meal_templates.id", ondelete="SET NULL"),
                  nullable=True),
        sa.Column("custom", sa.Boolean(), nullable=False),
        sa.Column("eaten", sa.Boolean(), nullable=False),
    )
    op.create_index("ix_planned_meals_day_id", "planned_meals", ["day_id"])

    op.create_table(
        "food_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("slot", sa.String(20), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("food_id", sa.Integer(), sa.ForeignKey("foods.id", ondelete="SET NULL"), nullable=True),
        sa.Column("planned_meal_id", sa.Integer(), sa.ForeignKey("planned_meals.id", ondelete="SET NULL"),
                  nullable=True),
        sa.Column("servings", sa.Float(), nullable=False),
        sa.Column("kcal", sa.Float(), nullable=False),
        sa.Column("protein", sa.Float(), nullable=False),
        sa.Column("carbs", sa.Float(), nullable=False),
        sa.Column("fat", sa.Float(), nullable=False),
        sa.Column("fiber", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_food_logs_user_id", "food_logs", ["user_id"])
    op.create_index("ix_food_logs_date", "food_logs", ["date"])


def downgrade() -> None:
    for t in ("food_logs", "planned_meals", "meal_plan_days", "meal_templates", "foods", "user_profiles", "users"):
        op.drop_table(t)
