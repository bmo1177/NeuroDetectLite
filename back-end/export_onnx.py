"""
export_onnx.py — Export all NeuroDetectLite PyTorch models to ONNX for mobile.

Usage:
    cd back-end && python export_onnx.py

Output:
    mobile/androidApp/src/androidMain/assets/*.onnx  (+ classifier_weights.npz)
"""

import os
import sys
import numpy as np
import onnx
import torch
import torch.nn as nn
import torch.nn.functional as F

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from models import (
    LightAlzNet, PlainCNN,
    build_efficientnet, build_mobilenet, build_ghostnetv2, build_tinyvit,
    REGISTRY
)

BASE = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
INT8_DIR = os.path.join(BASE, "models/int8")
FP32_DIR = os.path.join(BASE, "models/fp32")
ASSETS_DIR = os.path.join(BASE, "mobile/androidApp/src/androidMain/assets")
DEVICE = "cpu"

DUMMY_INPUT = torch.randn(1, 7, 224, 224)

os.makedirs(ASSETS_DIR, exist_ok=True)


class LightAlzNetWithFeatures(LightAlzNet):
    """LightAlzNet that returns (logits, last_conv_features) for on-device GradCAM."""
    def forward(self, x):
        f = self.body(self.stem(x))
        logits = self.head(f)
        return logits, f


def load_fp32(name: str) -> nn.Module:
    builder, filename, _ = REGISTRY[name]
    filename_fp32 = filename.replace("_int8", "_fp32").replace("_aphqvit", "_fp32")
    path = os.path.join(FP32_DIR, filename_fp32)
    m = builder() if callable(builder) and builder not in (LightAlzNet, PlainCNN) else builder()
    if os.path.exists(path):
        state = torch.load(path, map_location=DEVICE, weights_only=True)
        try:
            m.load_state_dict(state)
            print(f"  Loaded FP32 weights: {path}")
        except RuntimeError as e:
            print(f"  State dict mismatch — trying strict=False: {e}")
            m.load_state_dict(state, strict=False)
            print(f"  Loaded FP32 weights (non-strict): {path}")
    else:
        print(f"  WARNING: {path} not found — using untrained weights")
    return m.eval()


def export_gradcam_onnx(name: str):
    """Export LightAlzNet with dual outputs (logits, features) + classifier weights."""
    print(f"\n── {name} (GradCAM-enabled) ──")
    base = load_fp32(name)
    model = LightAlzNetWithFeatures()
    model.load_state_dict(base.state_dict())
    model.eval()

    out_path = os.path.join(ASSETS_DIR, f"{name}.onnx")
    torch.onnx.export(
        model, DUMMY_INPUT, out_path,
        input_names=["input"],
        output_names=["output", "features"],
        dynamo=False,
        opset_version=20,
    )
    # Save classifier weights for on-device GradCAM
    w1 = model.head[2].weight.detach().numpy()   # Linear(512, 256)
    b1 = model.head[2].bias.detach().numpy()
    w2 = model.head[5].weight.detach().numpy()   # Linear(256, 3)
    b2 = model.head[5].bias.detach().numpy()
    npz_path = os.path.join(ASSETS_DIR, "lightalznet_weights.npz")
    np.savez_compressed(npz_path, w1=w1, b1=b1, w2=w2, b2=b2)

    # Downgrade IR version for Android ONNX Runtime
    model_onnx = onnx.load(out_path)
    if model_onnx.ir_version > 9:
        model_onnx.ir_version = 9
        onnx.save(model_onnx, out_path)
    size_kb = os.path.getsize(out_path) / 1024
    print(f"  Exported → {out_path} ({size_kb:.0f} KB, IRv{model_onnx.ir_version})")
    print(f"  Weights → {npz_path}")


def export_onnx(name: str):
    """Export a single-output model (all architectures except LightAlzNet)."""
    print(f"\n── {name} ──")
    model = load_fp32(name)
    
    filename = f"{name}.onnx"
    out_path = os.path.join(ASSETS_DIR, filename)
    
    torch.onnx.export(
        model, DUMMY_INPUT, out_path,
        input_names=["input"],
        output_names=["output"],
        dynamo=False,
        opset_version=20,
    )
    model_onnx = onnx.load(out_path)
    if model_onnx.ir_version > 9:
        model_onnx.ir_version = 9
        onnx.save(model_onnx, out_path)
    size_kb = os.path.getsize(out_path) / 1024
    print(f"  Exported → {out_path} ({size_kb:.0f} KB, IRv{model_onnx.ir_version})")


def main():
    print("Exporting all NeuroDetectLite models to ONNX")
    print(f"Assets dir: {ASSETS_DIR}")
    print(f"Dummy input shape: {DUMMY_INPUT.shape}")
    
    for name in REGISTRY:
        if name == "lightalznet":
            export_gradcam_onnx(name)
        else:
            export_onnx(name)
    
    print("\nDone.")
    for f in sorted(os.listdir(ASSETS_DIR)):
        path = os.path.join(ASSETS_DIR, f)
        size = os.path.getsize(path) / 1024
        print(f"  {f}: {size:.0f} KB")


if __name__ == "__main__":
    main()
