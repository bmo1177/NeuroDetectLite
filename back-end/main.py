"""
main.py — NeuroDetect Lite FastAPI Backend

Supports multiple deployment modes:
  - HF Spaces: Downloads models from HF Hub to /tmp at startup
  - Tauri sidecar: Uses --models-dir CLI argument
  - Local dev: Resolves models relative to script directory
"""

import argparse
import os
import sys
import multiprocessing

# ── Step 0: Force CPU-only mode BEFORE any torch import ─────────────────────
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
os.environ["CUDA_DEVICE_ORDER"] = "PCI_BUS_ID"

_cpus = multiprocessing.cpu_count()
_threads = str(min(_cpus, 8))
os.environ.setdefault("OMP_NUM_THREADS", _threads)
os.environ.setdefault("MKL_NUM_THREADS", _threads)
os.environ.setdefault("OPENBLAS_NUM_THREADS", _threads)

print(f"[NeuroDetect] CPU-only mode enforced | inference threads: {_threads}", flush=True)

# ── Parse CLI arguments ────────────────────────────────────────────────────
parser = argparse.ArgumentParser(description="NeuroDetect Lite Backend")
parser.add_argument("--models-dir", type=str, default=None,
                    help="Path to the models directory (contains fp32/ and int8/ subdirs)")
parser.add_argument("--host", type=str, default=os.environ.get("HOST", "0.0.0.0"),
                    help="Host to bind to (default: 0.0.0.0)")
parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", 8000)),
                    help="Port to listen on (default: 8000)")
args, _ = parser.parse_known_args()

# ── Resolve models directory ──────────────────────────────────────────────
def _resolve_models_dir(cli_arg):
    """
    Resolution order:
    1. --models-dir CLI argument (Tauri)
    2. NEURODETECT_MODELS_DIR env var
    3. Download from HF Hub (HF Spaces)
    4. PyInstaller frozen binary
    5. Relative to script file (local dev)
    """
    if cli_arg:
        return os.path.abspath(cli_arg)

    env_dir = os.environ.get("NEURODETECT_MODELS_DIR")
    if env_dir:
        return os.path.abspath(env_dir)

    # HF Spaces: download models from HF Hub to /tmp
    hf_models_dir = "/tmp/neurodetectlite-models"
    if os.path.isdir("/tmp") and not os.path.isdir(os.path.join(hf_models_dir, "fp32")):
        try:
            from huggingface_hub import snapshot_download
            print("[NeuroDetect] Downloading models from HF Hub...", flush=True)
            snapshot_download(
                repo_id="subarufly17/neurodetectlite-models",
                local_dir=hf_models_dir,
                repo_type="model",
            )
            print(f"[NeuroDetect] Models downloaded to {hf_models_dir}", flush=True)
        except Exception as e:
            print(f"[NeuroDetect] Warning: Failed to download from HF Hub: {e}", flush=True)

    if os.path.isdir(os.path.join(hf_models_dir, "fp32")):
        return hf_models_dir

    # PyInstaller frozen binary
    if getattr(sys, "frozen", False):
        base = sys._MEIPASS
        candidate = os.path.join(base, "models")
        if os.path.isdir(candidate):
            return candidate

    # Local dev: walk up from script
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

os.environ["NEURODETECT_INT8_DIR"] = INT8_DIR
os.environ["NEURODETECT_FP32_DIR"] = FP32_DIR

# ── Import FastAPI app ────────────────────────────────────────────────────
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
        reload=False,
        log_level="warning",
    )
