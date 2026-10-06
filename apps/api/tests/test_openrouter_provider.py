"""Tests for the OpenRouter vision provider."""

import json
from unittest.mock import patch

import httpx
import pytest

from app.providers.vision.base import VisionGuess, VisionProviderError
from app.providers.vision.openrouter import OpenRouterVisionProvider, _guess_mime, _parse

# ── _guess_mime ────────────────────────────────────────────────────────────

class TestGuessMime:
    def test_jpeg(self):
        assert _guess_mime("photo.jpg") == "image/jpeg"
        assert _guess_mime("photo.jpeg") == "image/jpeg"

    def test_png(self):
        assert _guess_mime("photo.png") == "image/png"

    def test_fallback(self):
        assert _guess_mime(None) == "image/jpeg"
        assert _guess_mime("photo.pdf") == "image/jpeg"


# ── _parse ─────────────────────────────────────────────────────────────────

class TestParse:
    def test_valid_json_list(self):
        raw = json.dumps([{"label": "apple", "confidence": 0.9}])
        guesses = _parse(raw, frozenset(["apple", "banana"]))
        assert len(guesses) == 1
        assert guesses[0].label == "apple"
        assert guesses[0].confidence == 0.9

    def test_valid_json_dict(self):
        raw = json.dumps({"label": "apple", "confidence": 0.9})
        guesses = _parse(raw, frozenset(["apple", "banana"]))
        assert len(guesses) == 1
        assert guesses[0].label == "apple"

    def test_markdown_wrapper(self):
        raw = "```json\n" + json.dumps([{"label": "apple", "confidence": 0.9}]) + "\n```"
        guesses = _parse(raw, frozenset(["apple", "banana"]))
        assert len(guesses) == 1
        assert guesses[0].label == "apple"

    def test_uncataloged_clean_name(self):
        raw = json.dumps([{"label": "chicken biryani", "confidence": 0.8}])
        guesses = _parse(raw, frozenset(["apple"]))
        assert len(guesses) == 1
        assert guesses[0].label == "chicken biryani"

    def test_uncataloged_invalid_name(self):
        raw = json.dumps([{"label": "plate of food", "confidence": 0.8}])
        guesses = _parse(raw, frozenset(["apple"]))
        assert len(guesses) == 0

    def test_malformed_json(self):
        guesses = _parse("I think it is an apple", frozenset(["apple"]))
        assert len(guesses) == 0


# ── OpenRouterVisionProvider ────────────────────────────────────────────────

class TestOpenRouterVisionProvider:
    def test_requires_api_key(self):
        with pytest.raises(ValueError, match="OPENROUTER_API_KEY must be set"):
            OpenRouterVisionProvider("")

    def test_no_labels_returns_empty(self):
        provider = OpenRouterVisionProvider("sk-test")
        assert provider.identify(b"image", "test.jpg", []) == []

    @patch("httpx.post")
    def test_identify_success(self, mock_post):
        mock_resp = httpx.Response(
            200, json={"choices": [{"message": {"content": '[{"label": "apple", "confidence": 0.95}]'}}]},
            request=httpx.Request("POST", "url")
        )
        mock_post.return_value = mock_resp

        provider = OpenRouterVisionProvider("sk-test")
        res = provider.identify(b"image", "test.jpg", ["apple", "banana"])
        
        assert len(res) == 1
        assert res[0].label == "apple"
        assert res[0].confidence == 0.95

    @patch("httpx.post")
    def test_identify_http_error(self, mock_post):
        mock_resp = httpx.Response(500, request=httpx.Request("POST", "url"))
        mock_post.side_effect = httpx.HTTPStatusError("Server error", request=mock_resp.request, response=mock_resp)

        provider = OpenRouterVisionProvider("sk-test")
        with pytest.raises(VisionProviderError, match="OpenRouter API failure"):
            provider.identify(b"image", "test.jpg", ["apple"])

    @patch("httpx.post")
    def test_identify_timeout(self, mock_post):
        mock_post.side_effect = httpx.TimeoutException("Timeout")

        provider = OpenRouterVisionProvider("sk-test")
        with pytest.raises(VisionProviderError, match="OpenRouter network failure"):
            provider.identify(b"image", "test.jpg", ["apple"])

    @patch("httpx.post")
    def test_identify_malformed_response(self, mock_post):
        mock_resp = httpx.Response(200, json={"choices": []}, request=httpx.Request("POST", "url")) # missing message/content
        mock_post.return_value = mock_resp

        provider = OpenRouterVisionProvider("sk-test")
        with pytest.raises(VisionProviderError, match="Malformed response from OpenRouter API"):
            provider.identify(b"image", "test.jpg", ["apple"])

    @patch("httpx.post")
    def test_identify_auth_error(self, mock_post):
        mock_resp = httpx.Response(401, request=httpx.Request("POST", "url"))
        mock_post.side_effect = httpx.HTTPStatusError("Auth error sk-test", request=mock_resp.request, response=mock_resp)

        provider = OpenRouterVisionProvider("sk-test")
        with pytest.raises(VisionProviderError) as exc_info:
            provider.identify(b"image", "test.jpg", ["apple"])
        
        # Ensure API key is redacted
        assert "sk-test" not in str(exc_info.value)
        assert exc_info.value.code == "vision_auth_error"
