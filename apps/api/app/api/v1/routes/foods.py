from fastapi import APIRouter, Query

from app.api.deps import DB
from app.schemas.food import FoodOut, FoodSearchResponse
from app.services.food_service import FoodService

router = APIRouter(prefix="/foods", tags=["foods"])


@router.get("/search", response_model=FoodSearchResponse)
def search(db: DB, q: str = Query("", max_length=120), limit: int = Query(10, ge=1, le=50)):
    return FoodService(db).search(q, limit)


@router.get("/packaged/search", response_model=list[FoodOut])
def search_packaged(db: DB, q: str = Query("", max_length=120)):
    return FoodService(db).search_packaged_food(q)


@router.get("/barcode/{barcode}", response_model=FoodOut)
def get_barcode(barcode: str, db: DB):
    from app.core.exceptions import NotFound
    result = FoodService(db).resolve_barcode(barcode)
    if result is None:
        raise NotFound(message="Barcode not found", code="barcode_not_found")
    return result


@router.get("/{food_id}", response_model=FoodOut)
def get_food(food_id: str, db: DB):
    if food_id.isdigit():
        return FoodService(db).get(int(food_id))
    return FoodService(db).resolve_target(slug=food_id)
