import { PredictionResult } from "../types";

export const analyzeMRI = async (
  fileOrBase64: File | string, 
  mmseScore: number, 
  port: number = 8000, 
  modelName: string = "lightalznet"
): Promise<PredictionResult> => {

  try {
    // 1. Prepare Form Data
    const formData = new FormData();
    
    if (fileOrBase64 instanceof File) {
      formData.append('image', fileOrBase64, fileOrBase64.name);
    } else {
      // Convert base64 to Blob 
      const base64Data = fileOrBase64.split(',')[1] || fileOrBase64;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      formData.append('image', blob, 'mri.png');
    }
    
    formData.append('mmse', mmseScore.toString());
    formData.append('model', modelName);

    // 2. Request inference from the Backend
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const API_BASE = import.meta.env.VITE_API_URL || `http://127.0.0.1:${port}`;
    const response = await fetch(`${API_BASE}/api/predict`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Backend Error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Return the response parsed to PredictionResult structure
    return data as PredictionResult;
  } catch (error: any) {
    console.error("Local Inference Error:", error);
    throw new Error(`Inference framework unreachable or failed. Please check if the backend is running. ${error.message}`);
  }
};