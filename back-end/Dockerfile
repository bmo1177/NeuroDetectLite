FROM python:3.10-slim

# Redirect all caches to writable /tmp (HF Spaces requirement)
ENV HF_HOME=/tmp/hf_cache
ENV TRANSFORMERS_CACHE=/tmp/hf_cache/transformers
ENV TORCH_HOME=/tmp/hf_cache/torch
ENV HF_HUB_CACHE=/tmp/hf_cache/hub
ENV XDG_CACHE_HOME=/tmp/hf_cache
ENV MPLCONFIGDIR=/tmp/matplotlib_cache
ENV NUMBA_CACHE_DIR=/tmp/numba_cache

RUN mkdir -p /tmp/hf_cache && chmod -R 777 /tmp/hf_cache

WORKDIR /code
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

EXPOSE 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
