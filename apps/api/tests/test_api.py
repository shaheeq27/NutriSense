from unittest.mock import patch

API = "/api/v1"


def test_health(client):
    assert client.get("/health").json()["status"] == "ok"


def test_auth_flow(client):
    r = client.post(f"{API}/auth/register", json={"email": "A@x.com", "password": "password1", "name": "A"})
    assert r.status_code == 201
    body = r.json()
    assert body["token_type"] == "bearer" and body["user"]["email"] == "a@x.com"
    dup = client.post(f"{API}/auth/register", json={"email": "a@x.com", "password": "password1", "name": "A"})
    assert dup.status_code == 409 and dup.json()["error"]["code"] == "email_taken"
    bad = client.post(f"{API}/auth/login", json={"email": "a@x.com", "password": "nope-nope"})
    assert bad.status_code == 401 and bad.json()["error"]["code"] == "invalid_credentials"
    ok = client.post(f"{API}/auth/login", json={"email": "a@x.com", "password": "password1"})
    token = ok.json()["access_token"]
    me = client.get(f"{API}/users/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200 and me.json()["name"] == "A"
    assert client.get(f"{API}/users/me").status_code == 401
    assert client.get(f"{API}/users/me", headers={"Authorization": "Bearer junk"}).status_code == 401


def test_profile_onboarding_returns_targets(client, auth):
    r = client.put(f"{API}/users/me/profile", headers=auth, json={
        "goal": "lose", "sex": "female", "age": 28, "height_cm": 162, "weight_kg": 64,
        "activity_level": "light", "diet_style": "vegetarian", "allergies": ["Peanut"]})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["profile"]["birth_year"] == 1998 and body["profile"]["allergies"] == ["peanut"]
    assert body["targets"]["kcal"] > 1200


def test_search(client):
    from app.schemas.food import FoodOut
    with patch("app.providers.food_data.usda.UsdaFoodProvider.candidates") as mock_search, \
         patch("app.providers.food_data.usda.UsdaFoodProvider.get") as mock_get:
        
        mock_search.return_value = [
            FoodOut(id=8, slug="usda-8", name="Pizza", kcal=200, protein=10, carbs=20, fat=5, fiber=1, sugar=1, sodium=100, tag="Pizza", unit="serving", source="usda", estimated=False)
        ]
        mock_get.side_effect = lambda id: mock_search.return_value[0] if id == "usda-8" else None
        
        r = client.get(f"{API}/foods/search", params={"q": "pizzas", "limit": 5})
        assert r.status_code == 200
        data = r.json()
        assert len(data["items"]) <= 5 and "Pizza" in data["items"][0]["name"]
        fid = data["items"][0]["id"]
        
        # Test fetching specific food
        assert client.get(f"{API}/foods/{fid}").json()["id"] == fid
        
        # Test not found
        nf = client.get(f"{API}/foods/99999")
        assert nf.status_code == 404 and nf.json()["error"]["code"] == "food_not_found"


def test_bmi(client):
    r = client.post(f"{API}/bmi", json={"height_cm": 170, "weight_kg": 65})
    assert r.json()["bmi"] == 22.5 and r.json()["category"] == "normal"
    assert client.post(f"{API}/bmi", json={"height_cm": 0, "weight_kg": 65}).json()["error"]["code"] == \
        "validation_error"


def test_nutrition_endpoints(client):
    r = client.post(f"{API}/nutrition/calculate", json={"food_id": 1, "servings": 0.5})
    assert r.json()["kcal"] == 340 and "daily_values" in r.json()
    p = client.post(f"{API}/nutrition/parse", json={"text": "2 eggs and 2 rotis"}).json()
    assert len(p["items"]) == 2 and p["totals"]["kcal"] == 356


def test_scan(client):
    import base64

    from app.schemas.food import FoodOut
    valid_jpg = base64.b64decode(b"/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDi6KKK+ZP3E//Z")
    
    with patch("app.providers.vision.gemini.GeminiVisionProvider.identify") as mock_gemini, \
         patch("app.providers.food_data.usda.UsdaFoodProvider.get_curated") as mock_usda:
        from app.providers.vision.base import VisionGuess
        mock_gemini.return_value = [VisionGuess(label="miso-soup", confidence=0.9)]
        mock_usda.return_value = FoodOut(id=9, slug="miso-soup", name="Miso Soup", kcal=100, protein=5, carbs=10, fat=2, fiber=1, sugar=1, sodium=50, tag="Soup", unit="serving", source="usda", estimated=False)
        
        r = client.post(f"{API}/scan/identify", files={"image": ("pizza.jpg", valid_jpg, "image/jpeg")})
        assert r.status_code == 200
        c = r.json()["candidates"]
        assert "miso-soup" in c[0]["food"]["slug"]


def test_logging_updates_summary(client, auth):
    s0 = client.get(f"{API}/tracking/today", headers=auth).json()
    assert s0["totals"]["kcal"] == 0
    r = client.post(f"{API}/tracking/logs", headers=auth, json={"slot": "breakfast", "food_id": 1, "servings": 1})
    assert r.status_code == 201
    client.post(f"{API}/tracking/logs", headers=auth,
                json={"slot": "snack", "custom": {"name": "Chai", "kcal": 100, "protein": 3}})
    s1 = client.get(f"{API}/tracking/today", headers=auth).json()
    assert s1["totals"]["kcal"] == 780
    assert s1["remaining_kcal"] == s1["targets"]["kcal"] - 780
    breakfast = next(x for x in s1["slots"] if x["slot"] == "breakfast")
    assert breakfast["entries"][0]["name"] == "Chicken Biryani"
    assert client.delete(f"{API}/tracking/logs/{r.json()['id']}", headers=auth).status_code == 204
    assert client.get(f"{API}/tracking/today", headers=auth).json()["totals"]["kcal"] == 100
    prog = client.get(f"{API}/progress", params={"range": "7d"}, headers=auth).json()
    assert prog["days_logged"] == 1 and prog["current_streak"] == 1 and len(prog["days"]) == 7
    recs = client.get(f"{API}/recommendations/today", headers=auth).json()
    assert any(i["code"] == "remaining_kcal" for i in recs["insights"])


def test_logging_future_rejected(client, auth):
    r = client.post(f"{API}/tracking/logs", headers=auth,
                    json={"slot": "lunch", "food_id": 1, "date": "2026-10-03"})
    assert r.status_code == 422 and r.json()["error"]["code"] == "logging_not_allowed_for_date"


def test_meal_plan_api(client, auth):
    w = client.get(f"{API}/meal-plans", headers=auth).json()
    assert len(w["days"]) == 3
    r = client.post(f"{API}/meal-plans/2026-10-05/generate", headers=auth)
    assert r.status_code == 422 and r.json()["error"]["code"] == "planning_window_exceeded"
    opts = client.get(f"{API}/meal-plans/2026-10-03/slots/dinner/options", headers=auth).json()
    sw = client.post(f"{API}/meal-plans/2026-10-03/slots/dinner/swap", headers=auth,
                     json={"template_id": opts[0]["template_id"]})
    assert sw.status_code == 200
    add = client.post(f"{API}/meal-plans/2026-10-03/slots/snack/items", headers=auth, json={"food_id": 2})
    assert any(m["custom"] for m in add.json()["meals"])
    assert client.get(f"{API}/meal-plans/2026-10-03/slots/brunch/options", headers=auth).status_code == 422
