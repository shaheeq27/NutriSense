import io
import json
import logging
from pathlib import Path

import torch
import torch.nn as nn
from PIL import Image
from torchvision import transforms
from torchvision.models import efficientnet_b0

from app.providers.vision.base import VisionGuess, VisionProviderError

logger = logging.getLogger(__name__)


class TrainedModelVisionProvider:
    """Primary vision provider using the locally trained EfficientNet-B0."""

    name = "trained_model"

    def __init__(self, model_path: str):
        self.model_path = model_path
        self._model = None
        self._idx_to_class = None

        imagenet_mean = [0.485, 0.456, 0.406]
        imagenet_std = [0.229, 0.224, 0.225]
        self.transform = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=imagenet_mean, std=imagenet_std)
        ])

    def _load_model_if_needed(self):
        if self._model is not None:
            return

        path = Path(self.model_path)
        if not path.exists():
            raise VisionProviderError(f"Trained model checkpoint not found at {path}")

        class_mapping_file = path.parent / "class_to_idx.json"
        if not class_mapping_file.exists():
            raise VisionProviderError(f"class_to_idx.json not found adjacent to {path}")

        try:
            with open(class_mapping_file, "r") as f:
                class_to_idx = json.load(f)
        except Exception as e:
            raise VisionProviderError(f"Failed to read class mapping: {str(e)}")

        self._idx_to_class = {v: k for k, v in class_to_idx.items()}
        num_classes = len(self._idx_to_class)

        if num_classes != 66:
            raise VisionProviderError(f"Expected exactly 66 classes, but found {num_classes} in mapping.")

        try:
            model = efficientnet_b0()
            in_features = model.classifier[1].in_features
            model.classifier[1] = nn.Linear(in_features, num_classes)
            
            checkpoint = torch.load(path, map_location="cpu", weights_only=False)
            state_dict = checkpoint['state_dict'] if 'state_dict' in checkpoint else checkpoint
            model.load_state_dict(state_dict)
            model.eval()
            self._model = model
        except Exception as e:
            raise VisionProviderError(f"Failed to load trained model: {str(e)}")

    def identify(self, image: bytes, filename: str | None, labels: list[str]) -> list[VisionGuess]:
        if not image:
            return []

        self._load_model_if_needed()

        try:
            img = Image.open(io.BytesIO(image)).convert("RGB")
        except Exception as e:
            # Revert to returning an empty array or maybe we can raise VisionProviderError.
            # "invalid/corrupt image is handled correctly" - if it can't open, returning empty array makes sense or raising error. 
            # The prompt says: "raise a clear provider error when inference itself fails" 
            # I will just raise the error.
            raise VisionProviderError(f"Failed to decode image: {str(e)}")

        try:
            with torch.no_grad():
                tensor = self.transform(img).unsqueeze(0)
                outputs = self._model(tensor)
                probs = torch.nn.functional.softmax(outputs, dim=1)[0]
                confidence, pred_idx = torch.max(probs, 0)
        except Exception as e:
            raise VisionProviderError(f"Model inference failed: {str(e)}")

        label = self._idx_to_class[pred_idx.item()]
        
        # The prompt says "Correctly reverse the mapping: class index -> food label"
        # The previous provider had `canonical_name = pred_class_raw.replace("_", " ")`
        # We probably want it to match a slug style since we have a `labels` list, or at least a normalized form.
        # But wait, original classes are e.g., "apple_pie". Slugs are often "apple-pie".
        label = label.replace("_", "-")

        return [VisionGuess(label=label, confidence=confidence.item())]
