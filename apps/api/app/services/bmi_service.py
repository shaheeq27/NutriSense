"""BMI with WHO adult categories."""

from app.schemas.bmi import BmiResponse

HEALTHY_MIN = 18.5
HEALTHY_MAX = 24.9

_MESSAGES = {
    "underweight": "Your BMI sits below the healthy reference range. A personal plan can help you build steadily.",
    "normal": "Your BMI falls within the healthy reference range.",
    "overweight": "Your BMI sits above the healthy reference range. Small, steady changes add up.",
    "obese": "Your BMI sits well above the healthy reference range. A gradual plan, ideally with a "
    "professional, can make a real difference.",
}


def bmi_value(height_cm: float, weight_kg: float) -> float:
    m = height_cm / 100
    return round(weight_kg / (m * m), 1)


def category(bmi: float) -> str:
    if bmi < 18.5:
        return "underweight"
    if bmi < 25:
        return "normal"
    if bmi < 30:
        return "overweight"
    return "obese"


def healthy_range(height_cm: float) -> tuple[float, float]:
    m2 = (height_cm / 100) ** 2
    return round(HEALTHY_MIN * m2, 1), round(HEALTHY_MAX * m2, 1)


def calculate(height_cm: float, weight_kg: float) -> BmiResponse:
    b = bmi_value(height_cm, weight_kg)
    cat = category(b)
    lo, hi = healthy_range(height_cm)
    return BmiResponse(bmi=b, category=cat, healthy_weight_min_kg=lo, healthy_weight_max_kg=hi, message=_MESSAGES[cat])
