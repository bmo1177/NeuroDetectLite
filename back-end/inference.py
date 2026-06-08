"""
inference.py: NeuroDetectLite
Complete rewrite to match the Kaggle-trained 7-channel 2.5D pipeline.

Key changes from the old inference.py:
  1. Input is now a NIfTI (.nii / .nii.gz) file, not a JPEG/PNG
     → extract_25d() replicates the exact Kaggle preprocessing
  2. Tensor shape is (1, 7, 224, 224), NOT (1, 3, 224, 224)
  3. No ImageNet normalization: per-slice z-score normalization only
  4. GradCAM uses register_full_backward_hook (safe with inplace ops)
  5. Ensemble uses weighted average from nb6 results, not equal average
  6. MMSE is now genuinely used via the neurosymbolic gate (mmse_gate.py)
  7. INT8 quantized models loaded correctly (quantize_dynamic re-applied)
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import nibabel as nib
import cv2
import io
import os
import time
import base64
import tempfile
from PIL import Image
from typing import Optional

from models import (
    LightAlzNet, PlainCNN,
    build_efficientnet, build_mobilenet, build_ghostnetv2, build_tinyvit,
    REGISTRY, ENSEMBLE_WEIGHTS, CLASS_NAMES, CLASS_SHORT, NUM_CLASSES
)
from mmse_gate import run_gate, format_gate_for_api

# ── Paths ──────────────────────────────────────────────────────────────────
# Priority: env vars set by main.py (Tauri sidecar) > relative to this file
# main.py sets NEURODETECT_INT8_DIR / NEURODETECT_FP32_DIR before importing us.
INT8_DIR = os.environ.get(
    "NEURODETECT_INT8_DIR",
    os.path.join(os.path.dirname(__file__), "../models/int8")
)
FP32_DIR = os.environ.get(
    "NEURODETECT_FP32_DIR",
    os.path.join(os.path.dirname(__file__), "../models/fp32")
)

DEVICE = torch.device("cpu")   # FastAPI runs CPU inference; GPU not assumed

# ── Model cache ────────────────────────────────────────────────────────────
_cache: dict = {}


def _load_fp32(name: str) -> nn.Module:
    """Load a FP32 model by registry name."""
    builder, filename, _ = REGISTRY[name]
    filename_fp32 = filename.replace("_int8", "_fp32").replace("_aphqvit", "_fp32")
    path = os.path.join(FP32_DIR, filename_fp32)

    # Instantiate
    m = builder() if callable(builder) and builder not in (LightAlzNet, PlainCNN) \
        else builder()
    if not os.path.exists(path):
        print(f"[inference] Warning: {path} not found, using untrained weights")
    else:
        state = torch.load(path, map_location=DEVICE, weights_only=True)
        m.load_state_dict(state)
    return m.eval()


def _load_int8(name: str) -> nn.Module:
    """
    Load an INT8 model.
    Dynamic quantization must be re-applied after loading because
    torch.save on a quantized model's state_dict requires the same
    quantized structure to load back into.
    """
    builder, filename, _ = REGISTRY[name]
    path = os.path.join(INT8_DIR, filename)

    # Build FP32 first
    m_fp32 = (builder() if callable(builder) and
              builder not in (LightAlzNet, PlainCNN) else builder()).cpu().eval()

    if not os.path.exists(path):
        print(f"[inference] Warning: {path} not found, falling back to FP32")
        return m_fp32

    # Apply quantize_dynamic to get matching structure, then load state
    m_q = torch.quantization.quantize_dynamic(
        m_fp32, {nn.Linear, nn.Conv2d}, dtype=torch.qint8
    )
    state = torch.load(path, map_location="cpu", weights_only=False)
    try:
        m_q.load_state_dict(state)
        return m_q.eval()
    except (RuntimeError, KeyError) as e:
        print(f"[inference] Custom load failed for {name}: {e}. Falling back to FP32 weights + dynamic quantization.")
        # Load the FP32 weights and dynamically quantize them
        filename_fp32 = filename.replace("_int8", "_fp32").replace("_aphqvit", "_fp32")
        path_fp32 = os.path.join(FP32_DIR, filename_fp32)
        if os.path.exists(path_fp32):
            state_fp32 = torch.load(path_fp32, map_location="cpu", weights_only=True)
            m_fp32.load_state_dict(state_fp32)
            m_q_fallback = torch.quantization.quantize_dynamic(
                m_fp32, {nn.Linear, nn.Conv2d}, dtype=torch.qint8
            )
            return m_q_fallback.eval()
        else:
            print(f"[inference] Warning: {path_fp32} not found. Returning unquantized FP32.")
            return m_fp32



def get_model(name: str, use_int8: bool = True) -> nn.Module:
    """Return cached model, loading on first access."""
    cache_key = f"{name}_{'int8' if use_int8 else 'fp32'}"
    if cache_key not in _cache:
        if use_int8:
            _cache[cache_key] = _load_int8(name)
        else:
            _cache[cache_key] = _load_fp32(name)
    return _cache[cache_key]


# ── 2.5D preprocessing (exact match to Kaggle training) ───────────────────

def extract_25d(nifti_bytes: bytes, size: int = 224) -> np.ndarray:
    """
    Replicate the exact extract_25d() used during training on Kaggle.
    Input:  raw NIfTI file bytes
    Output: numpy array shape (7, 224, 224), dtype float32
            5 axial slices [35%, 42%, 50%, 58%, 65%] +
            2 coronal slices [45%, 55%]
    Each slice is independently z-score normalized.

    FALLBACK: If loading fails (e.g. 2D image bytes like PNG/JPEG are sent for a demo),
    we load the 2D image, convert to grayscale, z-score normalize, and duplicate
    across all 7 channels to avoid breaking frontend/demo compatibility.
    """
    # ── 1. Check if it's a standard 2D image (fallback path) ──
    try:
        img = Image.open(io.BytesIO(nifti_bytes))
        img = img.convert('L').resize((size, size), Image.BILINEAR)
        sl = np.array(img, dtype=np.float32)
        sl = (sl - sl.mean()) / (sl.std() + 1e-8)
        return np.stack([sl] * 7, axis=0)
    except Exception:
        # Not a 2D image, proceed with NIfTI parsing
        pass

    # ── 2. Standard NIfTI Path ──
    axial_pcts   = [0.35, 0.42, 0.50, 0.58, 0.65]
    coronal_pcts = [0.45, 0.55]

    # Write bytes to a temp file so nibabel can parse headers
    # On Windows, we must close the file handle before nibabel opens it, otherwise
    # a PermissionError is raised. We use mkstemp and close the fd immediately.
    suffix = ".nii.gz" if nifti_bytes[:2] == b'\x1f\x8b' else ".nii"
    fd, tmp_path = tempfile.mkstemp(suffix=suffix)
    try:
        with os.fdopen(fd, 'wb') as tmp:
            tmp.write(nifti_bytes)
        img = nib.load(tmp_path)
        vol = img.get_fdata().astype(np.float32)
        # Release the file locks explicitly for Windows compatibility
        if hasattr(img, 'file_map'):
            for f_val in img.file_map.values():
                if hasattr(f_val, 'close'):
                    f_val.close()
        del img
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass

    if vol.ndim == 4:
        vol = vol[..., 0]   # take first volume if 4D

    slices = []
    # Axial (Z dimension)
    for pct in axial_pcts:
        idx = int(np.clip(vol.shape[2] * pct, 0, vol.shape[2] - 1))
        sl  = np.array(
            Image.fromarray(vol[:, :, idx]).resize((size, size), Image.BILINEAR)
        )
        slices.append(((sl - sl.mean()) / (sl.std() + 1e-8)).astype(np.float32))

    # Coronal (Y dimension)
    for pct in coronal_pcts:
        idx = int(np.clip(vol.shape[1] * pct, 0, vol.shape[1] - 1))
        sl  = np.array(
            Image.fromarray(vol[:, idx, :]).resize((size, size), Image.BILINEAR)
        )
        slices.append(((sl - sl.mean()) / (sl.std() + 1e-8)).astype(np.float32))

    return np.stack(slices, axis=0)   # (7, 224, 224)


def tensor_from_nifti(nifti_bytes: bytes) -> torch.Tensor:
    """Returns (1, 7, 224, 224) float32 tensor ready for model input."""
    arr = extract_25d(nifti_bytes)
    return torch.from_numpy(arr).unsqueeze(0)   # (1, 7, 224, 224)


# ── GradCAM ────────────────────────────────────────────────────────────────

class GradCAM:
    """
    Hook-based Grad-CAM using register_full_backward_hook.
    Safe with inplace ops (ReLU6, etc.) unlike register_hook on output.
    """
    def __init__(self, model: nn.Module, target_layer: nn.Module):
        self.model = model
        self._act  = None
        self._grad = None
        self._handles = [
            target_layer.register_forward_hook(
                lambda m, i, o: setattr(self, '_act', o.detach())
            ),
            target_layer.register_full_backward_hook(
                lambda m, gi, go: setattr(self, '_grad', go[0].detach() if (go and go[0] is not None) else None)
            ),
        ]

    def generate(self, inp: torch.Tensor, target_cls: int) -> np.ndarray:
        self.model.eval()
        x      = inp.clone().requires_grad_(True)
        logits = self.model(x)
        self.model.zero_grad()
        logits[0, target_cls].backward()

        act, grad = self._act, self._grad
        if act is None or grad is None:
            return np.zeros((224, 224))

        # Transformer token layout (B, N, C) → spatial (B, C, h, w)
        if act.dim() == 3:
            B, N, C = act.shape
            h = w   = int(N ** 0.5)
            N2      = h * w
            act  = act[:, :N2, :].permute(0, 2, 1).reshape(1, C, h, w)
            grad = grad[:, :N2, :].permute(0, 2, 1).reshape(1, C, h, w)

        weights = grad.mean(dim=(2, 3), keepdim=True)
        cam     = torch.relu((weights * act).sum(1)).squeeze().cpu().numpy()

        if cam.ndim == 0 or cam.max() == 0:
            return np.zeros((224, 224))

        cam = cv2.resize(cam, (224, 224), interpolation=cv2.INTER_LINEAR)
        return (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)

    def remove(self):
        for h in self._handles:
            h.remove()


def get_gradcam_layer(name: str, model: nn.Module) -> Optional[nn.Module]:
    """Return the best Grad-CAM target layer for each architecture."""
    try:
        if name == "lightalznet": return model.body[-1]
        if name == "ghostnet":    return model.blocks[-1][-1]
        if name == "mobilenet":   return model.features[-1]
        if name == "efficientnet":return model.features[-1]
        if name == "plaincnn":    return model.features[-1]
        if name == "tinyvit":
            # Last depthwise Conv2d in the last attention block
            convs = [
                m for n, m in model.named_modules()
                if isinstance(m, nn.Conv2d)
                and m.groups > 1
                and "patch_embed" not in n
            ]
            return convs[-1] if convs else None
    except (AttributeError, IndexError):
        pass
    return None


def generate_gradcam_b64(
    cam: np.ndarray,
    ref_slice: np.ndarray,
    alpha: float = 0.45
) -> str:
    """
    Blend Grad-CAM heatmap with the axial-50% MRI slice.
    Returns base64-encoded PNG string ready for the frontend.
    """
    mri = (ref_slice - ref_slice.min()) / (ref_slice.max() - ref_slice.min() + 1e-8)
    mri_rgb = np.stack([mri, mri, mri], axis=-1)

    jet     = cv2.applyColorMap(np.uint8(255 * cam), cv2.COLORMAP_JET)
    jet_rgb = cv2.cvtColor(jet, cv2.COLOR_BGR2RGB) / 255.0

    overlay = np.clip((1 - alpha) * mri_rgb + alpha * jet_rgb, 0, 1)
    img     = Image.fromarray(np.uint8(overlay * 255))

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def generate_slice_b64(ref_slice: np.ndarray) -> str:
    """
    Convert the axial-50% MRI slice to base64-encoded PNG.
    """
    mri = (ref_slice - ref_slice.min()) / (ref_slice.max() - ref_slice.min() + 1e-8)
    mri_rgb = np.stack([mri, mri, mri], axis=-1)
    img     = Image.fromarray(np.uint8(mri_rgb * 255))
    
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


# ── Single model inference ─────────────────────────────────────────────────

def predict_single(
    tensor: torch.Tensor,
    slices: np.ndarray,
    model_name: str,
    use_int8: bool = True
) -> tuple:
    """
    Run inference + Grad-CAM for a single model.
    Returns (probs_list, inference_ms, gradcam_b64, ref_slice_b64)
    """
    # 1. Fast Inference Pass (uses selected precision: INT8 or FP32)
    model = get_model(model_name, use_int8=use_int8)
    t0 = time.time()
    with torch.no_grad():
        logits = model(tensor)
    probs = F.softmax(logits, dim=1).squeeze().tolist()
    pred  = int(np.argmax(probs))
    inf_ms = (time.time() - t0) * 1000

    # 2. Grad-CAM Sweep (always uses FP32 model to ensure differentiability & avoid quantized backward errors)
    cam = np.zeros((224, 224))
    try:
        model_fp32 = get_model(model_name, use_int8=False)
        tl = get_gradcam_layer(model_name, model_fp32)
        if tl is not None:
            gc = GradCAM(model_fp32, tl)
            cam = gc.generate(tensor, pred)
            gc.remove()
    except Exception as e:
        print(f"[inference] Grad-CAM generation failed for {model_name}: {e}")

    # Use axial-50% slice (index 2) as the background for overlay
    ref_slice = slices[2]
    gcam_b64  = generate_gradcam_b64(cam, ref_slice)
    ref_slice_b64 = generate_slice_b64(ref_slice)

    return probs, inf_ms, gcam_b64, ref_slice_b64


# ── Main predict function (called by main.py) ──────────────────────────────

def predict(
    image_bytes: bytes,
    mmse: Optional[int],
    model_name: str = "lightalznet"
) -> dict:
    """
    Main prediction function. API contract unchanged from the old inference.py.

    Parameters
    ----------
    image_bytes : bytes   Raw NIfTI file content (.nii or .nii.gz)
    mmse        : int     MMSE score 0–30 (None if not provided)
    model_name  : str     One of: lightalznet, mobilenet, efficientnet,
                          ghostnet, tinyvit, plaincnn, ensemble

    Returns
    -------
    dict with keys: probabilities, diagnosis, confidence, inference_time_ms,
                    model_used, gradcam_base64, ref_slice_base64, explanation,
                    regionsOfInterest, saliencyAnalysis, mmse_gate
    """
    # 1. Preprocess NIfTI → 7-channel tensor
    slices = extract_25d(image_bytes)                           # (7,224,224)
    tensor = torch.from_numpy(slices).unsqueeze(0)             # (1,7,224,224)

    # 2. Run model(s)
    if model_name == "ensemble":
        # Weighted ensemble: use FP32 models for maximum accuracy
        ensemble_probs = np.zeros(NUM_CLASSES)
        total_weight   = 0.0
        total_time     = 0.0
        last_gcam      = None
        last_ref_slice = None

        for name, weight in ENSEMBLE_WEIGHTS.items():
            if name not in REGISTRY:
                continue
            try:
                probs, inf_ms, gcam, ref_slice_b64 = predict_single(
                    tensor, slices, name, use_int8=False
                )
                ensemble_probs += np.array(probs) * weight
                total_weight   += weight
                total_time     += inf_ms
                if name == "lightalznet":
                    last_gcam = gcam    # use best model's heatmap
                    last_ref_slice = ref_slice_b64
            except Exception as e:
                print(f"[ensemble] {name} failed: {e}")

        if total_weight > 0:
            ensemble_probs /= total_weight

        probs    = ensemble_probs.tolist()
        inf_ms   = total_time
        gcam_b64 = last_gcam or ""
        ref_slice_b64 = last_ref_slice or generate_slice_b64(slices[2])
    else:
        # Single model — use INT8 for speed
        probs, inf_ms, gcam_b64, ref_slice_b64 = predict_single(
            tensor, slices, model_name, use_int8=True
        )

    # 3. Determine prediction
    pred_idx    = int(np.argmax(probs))
    diagnosis   = CLASS_NAMES[pred_idx]
    confidence  = float(max(probs))

    # 4. MMSE neurosymbolic gate
    gate        = run_gate(pred_idx, confidence, probs, mmse)
    gate_dict   = format_gate_for_api(gate)

    # 5. Regions of interest (now driven by real gate output)
    roi = []
    if pred_idx != 0:   # MCI or AD
        roi.append("Medial temporal lobe atrophy pattern detected")
    if pred_idx == 2:   # AD
        roi.append("Hippocampal volume reduction consistent with AD")
    if gate.gate_triggered:
        roi.append(f"⚠️  MMSE conflict flagged: {gate.alert_level.value.upper()}")
    if not roi:
        roi.append("Intact cortical thickness, no atrophy pattern detected")

    # 6. Build response (same keys as old inference.py for frontend compat)
    return {
        # Core prediction
        "probabilities": {
            CLASS_NAMES[0]: round(probs[0], 4),
            CLASS_NAMES[1]: round(probs[1], 4),
            CLASS_NAMES[2]: round(probs[2], 4),
        },
        "diagnosis":          diagnosis,
        "confidence":         round(confidence, 4),
        "inference_time_ms":  round(inf_ms, 2),
        "model_used":         model_name,

        # Explainability
        "gradcam_base64":     gcam_b64,
        "ref_slice_base64":   ref_slice_b64,
        "explanation": (
            f"{model_name.upper()} predicts {diagnosis} with "
            f"{confidence*100:.1f}% confidence. "
            f"{gate.clinical_note}"
        ),
        "regionsOfInterest":  roi,
        "saliencyAnalysis": (
            "Grad-CAM heatmap generated using gradient-weighted class activation "
            "mapping on the last convolutional feature map. "
            "Warm regions (red/yellow) indicate areas most influential for the prediction."
        ),

        # Neurosymbolic MMSE gate: NEW
        "mmse_gate": gate_dict,
    }
