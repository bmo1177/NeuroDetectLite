"""
models.py — NeuroDetectLite
All model architectures must match EXACTLY what was trained on Kaggle.

Key difference from the old models.py:
  - LightAlzNet: in_ch=7  (7-channel 2.5D input, NOT 3-channel RGB)
  - EfficientNet / MobileNetV3: first conv patched to in_ch=7, NO pretrained weights
  - GhostNetV2 / TinyViT: added (were not in the old file)
  - All custom classifier heads match the Kaggle training notebooks exactly
"""

import torch
import torch.nn as nn
from torchvision import models as tvm

try:
    import timm
    TIMM_AVAILABLE = True
except ImportError:
    TIMM_AVAILABLE = False

NUM_CLASSES = 3
IN_CHANNELS = 7   # 5 axial + 2 coronal slices stacked


# ── LightAlzNet (novel architecture, from-scratch, 0.63M params) ──────────

class SEBlock(nn.Module):
    def __init__(self, ch, r=16):
        super().__init__()
        self.se = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Flatten(),
            nn.Linear(ch, max(ch // r, 4), bias=False),
            nn.ReLU(),
            nn.Linear(max(ch // r, 4), ch, bias=False),
            nn.Sigmoid()
        )
    def forward(self, x):
        return x * self.se(x).view(x.size(0), -1, 1, 1)


class DWSConvBlock(nn.Module):
    def __init__(self, in_ch, out_ch, stride=1):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_ch, in_ch, 3, stride=stride,
                      padding=1, groups=in_ch, bias=False),
            nn.BatchNorm2d(in_ch),
            nn.ReLU6(inplace=True),
            nn.Conv2d(in_ch, out_ch, 1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.ReLU6(inplace=True)
        )
        self.se   = SEBlock(out_ch)
        self.skip = (nn.Conv2d(in_ch, out_ch, 1, stride=stride, bias=False)
                     if (in_ch != out_ch or stride != 1) else nn.Identity())

    def forward(self, x):
        return self.se(self.block(x)) + self.skip(x)


class LightAlzNet(nn.Module):
    """
    Custom lightweight CNN trained from scratch on ADNI 7-channel 2.5D input.
    Best single-model test F1: 49.81% | Size: 2.57 MB FP32 / 2.03 MB INT8
    """
    def __init__(self, num_classes=NUM_CLASSES, in_ch=IN_CHANNELS):
        super().__init__()
        self.stem = nn.Sequential(
            nn.Conv2d(in_ch, 32, 3, stride=2, padding=1, bias=False),
            nn.BatchNorm2d(32),
            nn.ReLU6(inplace=True)
        )
        self.body = nn.Sequential(
            DWSConvBlock(32,  64,  2),
            DWSConvBlock(64,  128, 2),
            DWSConvBlock(128, 128, 1),
            DWSConvBlock(128, 256, 2),
            DWSConvBlock(256, 256, 1),
            DWSConvBlock(256, 512, 2),
        )
        self.head = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Flatten(),
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(256, num_classes)
        )

    def forward(self, x):
        return self.head(self.body(self.stem(x)))


# ── PlainCNN baseline (0.52M params) ──────────────────────────────────────

class PlainCNN(nn.Module):
    """Simple 4-block CNN baseline. Included for completeness."""
    def __init__(self, num_classes=NUM_CLASSES, in_ch=IN_CHANNELS):
        super().__init__()
        def cb(i, o):
            return nn.Sequential(
                nn.Conv2d(i, o, 3, padding=1, bias=False),
                nn.BatchNorm2d(o), nn.ReLU(inplace=True), nn.MaxPool2d(2)
            )
        self.features   = nn.Sequential(cb(in_ch,32), cb(32,64), cb(64,128), cb(128,256))
        self.pool       = nn.AdaptiveAvgPool2d(1)
        self.classifier = nn.Sequential(
            nn.Flatten(), nn.Linear(256, 512),
            nn.ReLU(inplace=True), nn.Dropout(0.5),
            nn.Linear(512, num_classes)
        )

    def forward(self, x):
        return self.classifier(self.pool(self.features(x)))


# ── Pretrained backbones (7-ch first conv patch, no pretrained weights) ───

def build_efficientnet(num_classes=NUM_CLASSES, in_ch=IN_CHANNELS):
    """EfficientNet-B0 with 7-channel input. Test F1: 43.94%"""
    m   = tvm.efficientnet_b0(weights=None)
    old = m.features[0][0]
    m.features[0][0] = nn.Conv2d(
        in_ch, old.out_channels, 3, stride=2, padding=1, bias=False
    )
    in_f = m.classifier[1].in_features
    m.classifier = nn.Sequential(
        nn.Dropout(0.5), nn.Linear(in_f, 256), nn.GELU(),
        nn.Dropout(0.4), nn.Linear(256, num_classes)
    )
    return m


def build_mobilenet(num_classes=NUM_CLASSES, in_ch=IN_CHANNELS):
    """MobileNetV3-Small with 7-channel input. Test F1: 45.91%"""
    m   = tvm.mobilenet_v3_small(weights=None)
    old = m.features[0][0]
    m.features[0][0] = nn.Conv2d(
        in_ch, old.out_channels, 3, stride=2, padding=1, bias=False
    )
    in_f = m.classifier[0].in_features
    m.classifier = nn.Sequential(
        nn.Dropout(0.5), nn.Linear(in_f, 256), nn.GELU(),
        nn.Dropout(0.4), nn.Linear(256, num_classes)
    )
    return m


def build_ghostnetv2(num_classes=NUM_CLASSES, in_ch=IN_CHANNELS):
    """GhostNetV2-100 with 7-channel input. Test F1: 48.93%"""
    if not TIMM_AVAILABLE:
        raise ImportError("timm is required for GhostNetV2. pip install timm")
    m    = timm.create_model('ghostnetv2_100', pretrained=False, in_chans=in_ch)
    in_f = m.get_classifier().in_features
    m.classifier = nn.Sequential(
        nn.Dropout(0.5), nn.Linear(in_f, 256), nn.GELU(),
        nn.Dropout(0.4), nn.Linear(256, num_classes)
    )
    return m


def build_tinyvit(num_classes=NUM_CLASSES, in_ch=IN_CHANNELS):
    """TinyViT-5M with 7-channel input. Test F1: 46.32% | Quantized via APHQ-ViT."""
    if not TIMM_AVAILABLE:
        raise ImportError("timm is required for TinyViT. pip install timm")
    m    = timm.create_model('tiny_vit_5m_224', pretrained=False,
                             in_chans=in_ch, num_classes=num_classes)
    in_f = m.get_classifier().in_features
    m.head = nn.Sequential(
        nn.AdaptiveAvgPool2d(1), nn.Flatten(), nn.Dropout(0.5),
        nn.Linear(in_f, 256), nn.GELU(),
        nn.Dropout(0.4), nn.Linear(256, num_classes)
    )
    return m


# ── Model registry ─────────────────────────────────────────────────────────

REGISTRY = {
    "lightalznet":  (LightAlzNet,        "lightalznet_int8.pth",    49.81),
    "mobilenet":    (build_mobilenet,     "mobilenet_int8.pth",      45.91),
    "efficientnet": (build_efficientnet,  "efficientnet_int8.pth",   43.94),
    "ghostnet":     (build_ghostnetv2,    "ghostnet_int8.pth",       48.93),
    "tinyvit":      (build_tinyvit,       "tinyvit_aphqvit.pth",     46.32),
    "plaincnn":     (PlainCNN,            "plaincnn_int8.pth",       39.43),
}

# Ensemble weights (from nb6 results — proportional to test F1)
ENSEMBLE_WEIGHTS = {
    "lightalznet":  0.35,
    "tinyvit":      0.20,
    "ghostnet":     0.20,
    "mobilenet":    0.15,
    "efficientnet": 0.10,
}

CLASS_NAMES = [
    "Cognitively Normal",
    "Mild Cognitive Impairment",
    "Alzheimer's Disease"
]
CLASS_SHORT = ["CN", "MCI", "AD"]
