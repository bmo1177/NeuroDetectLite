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
    return {"status": "ok"}

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
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
