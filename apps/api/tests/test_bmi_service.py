import pytest

from app.services import bmi_service


def test_bmi_value_and_category():
    r = bmi_service.calculate(170, 65)
    assert r.bmi == 22.5
    assert r.category == "normal"


@pytest.mark.parametrize("bmi,cat", [(18.4, "underweight"), (18.5, "normal"), (24.9, "normal"),
                                     (25.0, "overweight"), (29.9, "overweight"), (30.0, "obese")])
def test_who_boundaries(bmi, cat):
    assert bmi_service.category(bmi) == cat


def test_healthy_range():
    lo, hi = bmi_service.healthy_range(170)
    assert lo == 53.5 and hi == 72.0
