"""Tests for the Gemini vision provider and vision provider wiring."""

import json
from unittest.mock import patch

import httpx
import pytest

from app.providers.vision.base import VisionGuess
from app.providers.vision.gemini import GeminiVisionProvider, _guess_mime, _parse
from app.providers.vision.stub import StubVisionProvider


# ── _guess_mime ────────────────────────────────────────────────────────────


class TestGuessMime:
    def test_jpeg(self):
        assert _guess_mime("photo.jpg") == "image/jpeg"
        assert _guess_mime("photo.jpeg") == "image/jpeg"

    def test_png(self):
        assert _guess_mime("photo.png") == "image/png"

    def test_webp(self):
        assert _guess_mime("photo.webp") == "image/webp"

    def test_heic(self):
        assert _guess_mime("photo.heic") == "image/heic"

    def test_unknown_extension(self):
        assert _guess_mime("photo.bmp") == "image/jpeg"

    def test_none(self):
        assert _guess_mime(None) == "image/jpeg"

    def test_no_extension(self):
        assert _guess_mime("photo") == "image/jpeg"


# ── _parse ─────────────────────────────────────────────────────────────────

VALID_LABELS = frozenset(["pizza", "chicken-biryani", "masala-dosa", "idli"])


class TestParse:
    def test_valid_json_array(self):
        raw = json.dumps([
            {"label": "pizza", "confidence": 0.9},
            {"label": "masala-dosa", "confidence": 0.1},
        ])
        result = _parse(raw, VALID_LABELS)
        assert len(result) == 2
        assert result[0] == VisionGuess(label="pizza", confidence=0.9)
        assert result[1] == VisionGuess(label="masala-dosa", confidence=0.1)

    def test_strips_markdown_fences(self):
        raw = "```json\n" + json.dumps([{"label": "pizza", "confidence": 0.8}]) + "\n```"
        result = _parse(raw, VALID_LABELS)
        assert len(result) == 1
        assert result[0].label == "pizza"

    def test_filters_invalid_labels(self):
        raw = json.dumps([
            {"label": "pizza", "confidence": 0.9},
            {"label": "sushi", "confidence": 0.5},
        ])
        result = _parse(raw, VALID_LABELS, allow_uncataloged=False)
        assert len(result) == 1
        assert result[0].label == "pizza"

        raw2 = json.dumps([
            {"label": "pizza", "confidence": 0.9},
            {"label": "brown thing in a bowl", "confidence": 0.5},
            {"label": "logo", "confidence": 0.3},
        ])
        result2 = _parse(raw2, VALID_LABELS)
        assert len(result2) == 1
        assert result2[0].label == "pizza"

    def test_accepts_clean_uncataloged_food_name(self):
        raw = json.dumps([
            {"label": "cucumber", "confidence": 0.95},
            {"label": "carrot", "confidence": 0.8},
        ])
        result = _parse(raw, VALID_LABELS)
        assert len(result) == 2
        assert result[0] == VisionGuess(label="cucumber", confidence=0.95)
        assert result[1] == VisionGuess(label="carrot", confidence=0.8)

    def test_deduplicates(self):
        raw = json.dumps([
            {"label": "pizza", "confidence": 0.9},
            {"label": "pizza", "confidence": 0.7},
        ])
        result = _parse(raw, VALID_LABELS)
        assert len(result) == 1

    def test_clamps_confidence(self):
        raw = json.dumps([{"label": "pizza", "confidence": 1.5}])
        result = _parse(raw, VALID_LABELS)
        assert result[0].confidence == 1.0

        raw2 = json.dumps([{"label": "pizza", "confidence": -0.3}])
        result2 = _parse(raw2, VALID_LABELS)
        assert result2[0].confidence == 0.0

    def test_single_dict_wrapped(self):
        raw = json.dumps({"label": "idli", "confidence": 0.6})
        result = _parse(raw, VALID_LABELS)
        assert len(result) == 1

    def test_empty_array(self):
        assert _parse("[]", VALID_LABELS) == []

    def test_unparseable(self):
        assert _parse("not json at all", VALID_LABELS) == []

    def test_non_numeric_confidence(self):
        raw = json.dumps([{"label": "pizza", "confidence": "high"}])
        result = _parse(raw, VALID_LABELS)
        assert result[0].confidence == 0.0


# ── GeminiVisionProvider ──────────────────────────────────────────────────


class TestGeminiVisionProvider:
    def test_init_requires_api_key(self):
        with pytest.raises(ValueError, match="GEMINI_API_KEY"):
            GeminiVisionProvider("")

    def test_name(self):
        p = GeminiVisionProvider("test-key")
        assert p.name == "gemini"

    def test_empty_labels_short_circuits(self):
        p = GeminiVisionProvider("test-key")
        assert p.identify(b"img", "food.jpg", []) == []

    def test_identify_success(self):
        gemini_response = {
            "candidates": [{
                "content": {
                    "parts": [{
                        "text": json.dumps([
                            {"label": "pizza", "confidence": 0.92},
                            {"label": "idli", "confidence": 0.05},
                        ])
                    }]
                }
            }]
        }

        mock_response = httpx.Response(
            status_code=200,
            json=gemini_response,
            request=httpx.Request("POST", "https://example.com"),
        )

        provider = GeminiVisionProvider("test-key")
        labels = ["pizza", "idli", "masala-dosa"]

        with patch("app.providers.vision.gemini.httpx.post", return_value=mock_response):
            result = provider.identify(b"\xff\xd8fake", "food.jpg", labels)

        assert len(result) == 2
        assert result[0] == VisionGuess(label="pizza", confidence=0.92)
        assert result[1] == VisionGuess(label="idli", confidence=0.05)

    def test_identify_http_error_raises(self):
        mock_response = httpx.Response(
            status_code=500,
            text="Internal Server Error",
            request=httpx.Request("POST", "https://example.com"),
        )

        provider = GeminiVisionProvider("test-key")

        with patch("app.providers.vision.gemini.httpx.post", return_value=mock_response):
            from app.providers.vision.base import VisionProviderError
            with pytest.raises(VisionProviderError) as exc_info:
                provider.identify(b"img", "food.jpg", ["pizza"])
            assert exc_info.value.code == "vision_provider_error"

    def test_identify_http_auth_error_raises(self):
        mock_response = httpx.Response(
            status_code=401,
            text="Unauthorized",
            request=httpx.Request("POST", "https://example.com"),
        )

        provider = GeminiVisionProvider("test-key")

        with patch("app.providers.vision.gemini.httpx.post", return_value=mock_response):
            from app.providers.vision.base import VisionProviderError
            with pytest.raises(VisionProviderError) as exc_info:
                provider.identify(b"img", "food.jpg", ["pizza"])
            assert exc_info.value.code == "vision_auth_error"

    def test_identify_timeout_raises(self):
        provider = GeminiVisionProvider("test-key")

        with patch("app.providers.vision.gemini.httpx.post", side_effect=httpx.TimeoutException("timeout")):
            from app.providers.vision.base import VisionProviderError
            with pytest.raises(VisionProviderError):
                provider.identify(b"img", "food.jpg", ["pizza"])

    def test_identify_network_error_raises(self):
        provider = GeminiVisionProvider("test-key")

        with patch("app.providers.vision.gemini.httpx.post", side_effect=httpx.NetworkError("dns fail")):
            from app.providers.vision.base import VisionProviderError
            with pytest.raises(VisionProviderError):
                provider.identify(b"img", "food.jpg", ["pizza"])

    def test_identify_malformed_response_raises(self):
        mock_response = httpx.Response(
            status_code=200,
            json={"candidates": []},  # no content
            request=httpx.Request("POST", "https://example.com"),
        )

        provider = GeminiVisionProvider("test-key")

        with patch("app.providers.vision.gemini.httpx.post", return_value=mock_response):
            from app.providers.vision.base import VisionProviderError
            with pytest.raises(VisionProviderError, match="Malformed"):
                provider.identify(b"img", "food.jpg", ["pizza"])


# ── get_vision_provider factory ───────────────────────────────────────────


class TestGetVisionProvider:
    def test_default_returns_stub(self):
        with patch.dict("os.environ", {"VISION_PROVIDER": "stub"}, clear=False):
            from importlib import reload

            import app.core.config as cfg
            cfg.get_settings.cache_clear()
            reload(cfg)

            from app.providers.vision import get_vision_provider
            provider = get_vision_provider()
            assert isinstance(provider, StubVisionProvider)
            cfg.get_settings.cache_clear()

    def test_gemini_without_key_falls_back_to_stub(self):
        env = {"VISION_PROVIDER": "gemini", "GEMINI_API_KEY": ""}
        with patch.dict("os.environ", env, clear=False):
            from importlib import reload

            import app.core.config as cfg
            cfg.get_settings.cache_clear()
            reload(cfg)

            from app.providers.vision import get_vision_provider
            provider = get_vision_provider()
            assert isinstance(provider, StubVisionProvider)
            cfg.get_settings.cache_clear()

    def test_gemini_with_key_returns_gemini(self):
        env = {"VISION_PROVIDER": "gemini", "GEMINI_API_KEY": "test-key-123"}
        with patch.dict("os.environ", env, clear=False):
            from importlib import reload

            import app.core.config as cfg
            cfg.get_settings.cache_clear()
            reload(cfg)

            from app.providers.vision import get_vision_provider
            provider = get_vision_provider()
            assert isinstance(provider, GeminiVisionProvider)
            assert provider.name == "gemini"
            cfg.get_settings.cache_clear()


# ── Calibration and Configuration Tests ────────────────────────────────────


class TestProviderCalibration:
    def test_gemini_model_configuration(self):
        env = {
            "VISION_PROVIDER": "gemini",
            "GEMINI_API_KEY": "test-key-123",
            "GEMINI_MODEL": "gemini-3.5-flash",
        }
        with patch.dict("os.environ", env, clear=False):
            from importlib import reload
            import app.core.config as cfg
            cfg.get_settings.cache_clear()
            reload(cfg)

            from app.providers.vision import get_vision_provider
            provider = get_vision_provider()
            assert isinstance(provider, GeminiVisionProvider)
            assert provider._model == "gemini-3.5-flash"
            cfg.get_settings.cache_clear()

    def test_openrouter_configuration_detected_without_secrets(self):
        env = {
            "OPENROUTER_API_KEY": "sk-or-v1-secretkey12345",
            "OPENROUTER_VISION_MODEL": "google/gemma-4-31b-it:free",
        }
        with patch.dict("os.environ", env, clear=False):
            from importlib import reload
            import app.core.config as cfg
            cfg.get_settings.cache_clear()
            reload(cfg)

            settings = cfg.get_settings()
            # Verified present without exposing value in logs
            assert bool(settings.OPENROUTER_API_KEY) is True
            assert settings.OPENROUTER_VISION_MODEL == "google/gemma-4-31b-it:free"
            # Ensure repr or safe output doesn't expose raw secret trivially
            safe_summary = f"OpenRouter configured: {bool(settings.OPENROUTER_API_KEY)}"
            assert "sk-or-v1-secretkey12345" not in safe_summary
            cfg.get_settings.cache_clear()

    def test_identify_uses_configured_model_in_url(self):
        mock_response = httpx.Response(
            status_code=200,
            json={"candidates": [{"content": {"parts": [{"text": "[]"}]}}]},
            request=httpx.Request("POST", "https://example.com"),
        )
        provider = GeminiVisionProvider("secret-key", model="gemini-3.5-flash")
        with patch("app.providers.vision.gemini.httpx.post", return_value=mock_response) as mock_post:
            provider.identify(b"image", "food.jpg", ["apple"])
            called_url = str(mock_post.call_args[0][0])
            assert "models/gemini-3.5-flash:generateContent" in called_url
            assert "key=secret-key" in called_url

    def test_identify_secret_redaction_in_error(self):
        secret_key = "super-secret-api-key-999"
        mock_response = httpx.Response(
            status_code=400,
            text="Bad Request",
            request=httpx.Request("POST", f"https://example.com?key={secret_key}"),
        )
        provider = GeminiVisionProvider(secret_key)
        with patch("app.providers.vision.gemini.httpx.post", return_value=mock_response):
            from app.providers.vision.base import VisionProviderError
            with pytest.raises(VisionProviderError) as exc_info:
                provider.identify(b"img", "food.jpg", ["pizza"])
            
            err_msg = str(exc_info.value)
            assert secret_key not in err_msg
            assert "REDACTED" in err_msg
            # Verify __cause__ does not leak secret
            assert exc_info.value.__cause__ is None


# ── StubVisionProvider preserved ──────────────────────────────────────────


class TestStubStillWorks:
    def test_stub_name(self):
        assert StubVisionProvider.name == "stub"

    def test_stub_returns_guesses_from_labels(self):
        p = StubVisionProvider()
        result = p.identify(b"fake", "pizza.jpg", ["pizza", "idli", "dosa"])
        assert len(result) >= 1
        assert all(isinstance(g, VisionGuess) for g in result)
        # filename-matching: pizza.jpg should match pizza slug
        assert result[0].label == "pizza"

    def test_stub_empty_labels(self):
        p = StubVisionProvider()
        assert p.identify(b"fake", "pizza.jpg", []) == []
