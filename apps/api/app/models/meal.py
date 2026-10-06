from datetime import date

from sqlalchemy import JSON, Boolean, Date, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class MealTemplate(Base):
    __tablename__ = "meal_templates"

    id: Mapped[int] = mapped_column(primary_key=True)
    slot: Mapped[str] = mapped_column(String(20), index=True)
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(String(500), default="")
    tags: Mapped[str] = mapped_column(String(160), default="")
    why: Mapped[str] = mapped_column(String(300), default="")
    kcal: Mapped[float] = mapped_column(Float)
    protein: Mapped[float] = mapped_column(Float)
    carbs: Mapped[float] = mapped_column(Float)
    fat: Mapped[float] = mapped_column(Float)
    diet: Mapped[str] = mapped_column(String(20), default="any")  # vegan|vegetarian|eggetarian|any(=contains meat)
    allergens: Mapped[list[str]] = mapped_column(JSON, default=list)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)


class MealPlanDay(Base):
    __tablename__ = "meal_plan_days"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_plan_user_date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    date: Mapped[date] = mapped_column(Date)

    meals: Mapped[list["PlannedMeal"]] = relationship(
        back_populates="day", cascade="all, delete-orphan", order_by="PlannedMeal.id", lazy="selectin"
    )


class PlannedMeal(Base):
    __tablename__ = "planned_meals"

    id: Mapped[int] = mapped_column(primary_key=True)
    day_id: Mapped[int] = mapped_column(ForeignKey("meal_plan_days.id", ondelete="CASCADE"), index=True)
    slot: Mapped[str] = mapped_column(String(20))
    name: Mapped[str] = mapped_column(String(160))
    food_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("foods.id", ondelete="SET NULL"), nullable=True)
    slug: Mapped[str | None] = mapped_column(String(120), nullable=True)
    kcal: Mapped[float] = mapped_column(Float)
    protein: Mapped[float] = mapped_column(Float)
    carbs: Mapped[float] = mapped_column(Float)
    fat: Mapped[float] = mapped_column(Float)
    servings: Mapped[float] = mapped_column(Float, default=1)
    template_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("meal_templates.id", ondelete="SET NULL"), nullable=True
    )
    custom: Mapped[bool] = mapped_column(Boolean, default=False)
    eaten: Mapped[bool] = mapped_column(Boolean, default=False)

    day: Mapped[MealPlanDay] = relationship(back_populates="meals")
