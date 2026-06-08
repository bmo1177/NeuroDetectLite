"""
main.py — NeuroDetect Lite FastAPI Backend (Tauri Sidecar Edition)

Modifications from original:
  - Accepts --models-dir CLI argument so Tauri can pass the bundled resource path
  - Binds to 127.0.0.1 only for security (Tauri sidecar)
  - Accepts --host / --port arguments for Tauri IPC
  - Sets INT8_DIR / FP32_DIR in inference module based on --models-dir
"""

import argparse
import os
import sys
import multiprocessing

# ── Step 0: Force CPU-only mode BEFORE any torch import ─────────────────────
# This must happen before importing inference.py (which imports torch).
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"     # Hide all NVIDIA GPUs
os.environ["CUDA_DEVICE_ORDER"] = "PCI_BUS_ID"

# Tune CPU thread count for inference throughput
_cpus = multiprocessing.cpu_count()
_threads = str(min(_cpus, 8))  # Cap at 8 to avoid bandwidth saturation
os.environ.setdefault("OMP_NUM_THREADS", _threads)
os.environ.setdefault("MKL_NUM_THREADS", _threads)
os.environ.setdefault("OPENBLAS_NUM_THREADS", _threads)

print(f"[NeuroDetect] CPU-only mode enforced | inference threads: {_threads}", flush=True)

# ── Parse CLI arguments BEFORE importing inference (which reads MODEL_DIR) ──
parser = argparse.ArgumentParser(description="NeuroDetect Lite Backend")
parser.add_argument("--models-dir", type=str, default=None,
                    help="Path to the models directory (contains fp32/ and int8/ subdirs)")
parser.add_argument("--host", type=str, default="127.0.0.1",
                    help="Host to bind to (default: 127.0.0.1)")
parser.add_argument("--port", type=int, default=8000,
                    help="Port to listen on (default: 8000)")
args, _ = parser.parse_known_args()

# ── Resolve the models directory ──────────────────────────────────────────
def _resolve_models_dir(cli_arg):
    """
    Resolution order:
    1. --models-dir CLI argument (used by Tauri)
    2. NEURODETECT_MODELS_DIR environment variable
    3. Relative to the frozen executable (PyInstaller)
    4. Relative to the script file
    """
    if cli_arg:
        return os.path.abspath(cli_arg)

    env_dir = os.environ.get("NEURODETECT_MODELS_DIR")
    if env_dir:
        return os.path.abspath(env_dir)

    # PyInstaller frozen binary: sys._MEIPASS contains unpacked resources
    if getattr(sys, "frozen", False):
        base = sys._MEIPASS
        candidate = os.path.join(base, "models")
        if os.path.isdir(candidate):
            return candidate

    # Dev fallback: walk up from this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    for ancestor in [script_dir] + [os.path.join(script_dir, "..")] * 4:
        candidate = os.path.abspath(os.path.join(ancestor, "models"))
        if os.path.isdir(candidate):
            return candidate

    return os.path.join(script_dir, "..", "models")

MODELS_DIR = _resolve_models_dir(args.models_dir)
INT8_DIR   = os.path.join(MODELS_DIR, "int8")
FP32_DIR   = os.path.join(MODELS_DIR, "fp32")

print(f"[NeuroDetect] Models dir: {MODELS_DIR}", flush=True)
print(f"[NeuroDetect] INT8 dir:   {INT8_DIR}  exists={os.path.isdir(INT8_DIR)}", flush=True)
print(f"[NeuroDetect] FP32 dir:   {FP32_DIR}  exists={os.path.isdir(FP32_DIR)}", flush=True)

# ── Patch the inference module's search paths BEFORE import ──────────────
# We inject the resolved paths as environment variables so inference.py
# can pick them up via os.environ (overrides its default os.path.dirname logic).
os.environ["NEURODETECT_INT8_DIR"] = INT8_DIR
os.environ["NEURODETECT_FP32_DIR"] = FP32_DIR

# ── Now safe to import the FastAPI app ───────────────────────────────────
import torch
torch.set_num_threads(int(_threads))
torch.set_num_interop_threads(max(1, int(_threads) // 2))

print(f"[NeuroDetect] torch CPU threads: {torch.get_num_threads()} | CUDA: {torch.cuda.is_available()}", flush=True)

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from inference import predict
import uvicorn

app = FastAPI(title="NeuroDetect Lite Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "models_dir": MODELS_DIR,
        "int8_available": os.path.isdir(INT8_DIR),
        "fp32_available": os.path.isdir(FP32_DIR),
        "hardware": "CPU-only",
        "threads": torch.get_num_threads(),
    }

@app.post("/api/predict")
async def predict_endpoint(
    image: UploadFile = File(...),
    mmse: int = Form(...),
    model: str = Form("lightalznet")
):
    contents = await image.read()
    result = predict(contents, mmse, model_name=model)
    return result

if __name__ == "__main__":
    print(f"[NeuroDetect] Starting server on {args.host}:{args.port}", flush=True)
    uvicorn.run(
        app,
        host=args.host,
        port=args.port,
        reload=False,          # No reload in sidecar mode
        log_level="warning",   # Reduce noise in Tauri logs
    )
