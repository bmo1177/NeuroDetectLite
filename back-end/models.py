import torch
import torch.nn as nn
from torchvision import models

NUM_CLASSES = 3

def build_efficientnet():
    m = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.IMAGENET1K_V1)
    m.classifier = nn.Sequential(
        nn.Dropout(0.5), 
        nn.Linear(m.classifier[1].in_features, 128),
        nn.ReLU(), 
        nn.Dropout(0.4), 
        nn.Linear(128, NUM_CLASSES)
    )
    for p in m.features.parameters(): 
        p.requires_grad = False
    return m

def build_mobilenet():
    m = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.IMAGENET1K_V1)
    in_f = m.classifier[3].in_features
    m.classifier[3] = nn.Sequential(
        nn.Linear(in_f, 64), 
        nn.ReLU(), 
        nn.Dropout(0.4),
        nn.Linear(64, NUM_CLASSES)
    )
    for p in m.features.parameters(): 
        p.requires_grad = False
    return m

class SEBlock(nn.Module):
    def __init__(self, ch, r=16):
        super().__init__()
        self.se = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Flatten(),
            nn.Linear(ch, max(ch//r, 4), bias=False),
            nn.ReLU(),
            nn.Linear(max(ch//r, 4), ch, bias=False),
            nn.Sigmoid()
        )
    def forward(self, x): 
        return x * self.se(x).view(x.size(0), -1, 1, 1)

class DWSConvBlock(nn.Module):
    def __init__(self, in_ch, out_ch, stride=1):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_ch, in_ch, 3, stride=stride, padding=1, groups=in_ch, bias=False),
            nn.BatchNorm2d(in_ch),
            nn.ReLU6(inplace=True),
            nn.Conv2d(in_ch, out_ch, 1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.ReLU6(inplace=True)
        )
        self.se = SEBlock(out_ch)
        self.skip = (nn.Conv2d(in_ch, out_ch, 1, stride=stride, bias=False)
                     if (in_ch != out_ch or stride != 1) else nn.Identity())
    def forward(self, x): 
        return self.se(self.block(x)) + self.skip(x)

class LightAlzNet(nn.Module):
    def __init__(self, num_classes=3):
        super().__init__()
        self.stem = nn.Sequential(
            nn.Conv2d(3, 32, 3, stride=2, padding=1, bias=False),
            nn.BatchNorm2d(32),
            nn.ReLU6(inplace=True)
        )
        self.body = nn.Sequential(
            DWSConvBlock(32, 64, 2),
            DWSConvBlock(64, 128, 2),
            DWSConvBlock(128, 128, 1),
            DWSConvBlock(128, 256, 2),
            DWSConvBlock(256, 256, 1),
            DWSConvBlock(256, 512, 2)
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
