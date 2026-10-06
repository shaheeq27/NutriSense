import io
import json
import pytest
from pathlib import Path
from PIL import Image

from app.providers.vision.trained_model import TrainedModelVisionProvider
from app.providers.vision.base import VisionProviderError

# Helper to create a dummy model directory
@pytest.fixture
def dummy_model_dir(tmp_path):
    model_dir = tmp_path / "models"
    model_dir.mkdir()
    
    # Create fake class mapping
    class_mapping = {f"class_{i}": i for i in range(66)}
    # Add one real one for testing
    class_mapping["apple_pie"] = 0
    with open(model_dir / "class_to_idx.json", "w") as f:
        json.dump(class_mapping, f)
        
    model_path = model_dir / "best_model.pth"
    
    # We will mock the torch.load so we don't actually need a valid model file
    model_path.touch()
    
    return model_path

def test_missing_model_path():
    provider = TrainedModelVisionProvider("nonexistent/path.pth")
    with pytest.raises(VisionProviderError, match="checkpoint not found"):
        provider.identify(b"fake_image", None, ["apple-pie"])

def test_missing_class_mapping(tmp_path):
    model_path = tmp_path / "best_model.pth"
    model_path.touch()
    provider = TrainedModelVisionProvider(str(model_path))
    with pytest.raises(VisionProviderError, match="class_to_idx.json not found"):
        provider.identify(b"fake_image", None, ["apple-pie"])

def test_invalid_class_count(tmp_path):
    model_dir = tmp_path / "models"
    model_dir.mkdir()
    class_mapping = {"only_one": 0}
    with open(model_dir / "class_to_idx.json", "w") as f:
        json.dump(class_mapping, f)
    model_path = model_dir / "best_model.pth"
    model_path.touch()
    
    provider = TrainedModelVisionProvider(str(model_path))
    with pytest.raises(VisionProviderError, match="Expected exactly 66 classes"):
        provider.identify(b"fake_image", None, ["only-one"])

@pytest.fixture
def mock_torch(monkeypatch):
    class MockModel:
        def __init__(self):
            self.classifier = [None, type('obj', (object,), {'in_features': 100})()]
            self.eval_called = False
            self.state_dict_loaded = False
        def __call__(self, tensor):
            import torch
            # Return fake logits
            return torch.zeros(1, 66)
        def eval(self):
            self.eval_called = True
        def load_state_dict(self, state):
            self.state_dict_loaded = True
            
    def mock_load(*args, **kwargs):
        return {'state_dict': {}}
        
    def mock_efficientnet():
        return MockModel()
        
    monkeypatch.setattr("torch.load", mock_load)
    monkeypatch.setattr("app.providers.vision.trained_model.efficientnet_b0", mock_efficientnet)

def test_model_loaded_once_and_cached(dummy_model_dir, mock_torch):
    provider = TrainedModelVisionProvider(str(dummy_model_dir))
    
    # Create fake image
    img = Image.new('RGB', (224, 224), color='red')
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_bytes = img_byte_arr.getvalue()
    
    assert provider._model is None
    
    # First call
    results1 = provider.identify(img_bytes, "test.jpg", ["apple-pie"])
    assert provider._model is not None
    assert provider._model.eval_called
    
    model_ref = provider._model
    
    # Second call
    results2 = provider.identify(img_bytes, "test.jpg", ["apple-pie"])
    assert provider._model is model_ref

def test_inference_returns_label_and_confidence(dummy_model_dir, mock_torch):
    provider = TrainedModelVisionProvider(str(dummy_model_dir))
    
    img = Image.new('RGB', (224, 224), color='blue')
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    
    results = provider.identify(img_byte_arr.getvalue(), "test.jpg", ["apple-pie"])
    assert len(results) == 1
    assert results[0].label == "apple-pie" # since class_0 mapped to apple_pie and zeros out gives class 0
    assert 0.0 <= results[0].confidence <= 1.0

def test_invalid_corrupt_image(dummy_model_dir, mock_torch):
    provider = TrainedModelVisionProvider(str(dummy_model_dir))
    
    with pytest.raises(VisionProviderError, match="Failed to decode image"):
        provider.identify(b"not an image", "test.jpg", ["apple-pie"])

# Integration test with actual model if available
def test_integration_actual_model():
    model_path = Path("app/providers/vision/models/best_model.pth")
    if not model_path.exists():
        pytest.skip("Actual model not available for integration test")
        
    provider = TrainedModelVisionProvider(str(model_path))
    
    img = Image.new('RGB', (224, 224), color='green')
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    
    results = provider.identify(img_byte_arr.getvalue(), "test.jpg", [])
    assert len(results) == 1
    assert isinstance(results[0].label, str)
    assert 0.0 <= results[0].confidence <= 1.0
