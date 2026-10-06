"""PLACEHOLDER vision provider - NOT a real model.

Returns deterministic candidates so the scan flow works end-to-end:
1. If the filename contains a known food slug/word (e.g. "pizza.jpg"), that food ranks first.
2. Otherwise candidates are picked from a SHA-256 hash of the bytes + size.
Replace with a real classifier (e.g. a hosted vision API) implementing VisionProvider.
"""

import hashlib
import re

from app.providers.vision.base import VisionGuess


class StubVisionProvider:
    name = "stub"

    def identify(self, image: bytes, filename: str | None, labels: list[str]) -> list[VisionGuess]:
        if not labels:
            return []
        picks: list[str] = []
        matched_name = False
        if filename:
            words = set(re.split(r"[^a-z0-9]+", filename.lower().rsplit(".", 1)[0])) - {""}
            for lab in labels:
                if lab in words or any(w in lab.split("-") for w in words):
                    picks.append(lab)
                    matched_name = True
                    break
        digest = hashlib.sha256(image + len(image).to_bytes(8, "big")).digest()
        i = 0
        while len(picks) < 3 and i < len(digest) - 1:
            lab = labels[int.from_bytes(digest[i : i + 2], "big") % len(labels)]
            if lab not in picks:
                picks.append(lab)
            i += 2
        confs = [0.82, 0.11, 0.05] if matched_name else [0.64, 0.21, 0.09]
        return [VisionGuess(label=p, confidence=c) for p, c in zip(picks, confs, strict=False)]
