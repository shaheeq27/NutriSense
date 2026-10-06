from fastapi import APIRouter

from app.schemas.bmi import BmiRequest, BmiResponse
from app.services import bmi_service

router = APIRouter(prefix="/bmi", tags=["bmi"])


@router.post("", response_model=BmiResponse)
def bmi(body: BmiRequest):
    return bmi_service.calculate(body.height_cm, body.weight_kg)
