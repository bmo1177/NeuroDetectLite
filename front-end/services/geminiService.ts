import { PredictionResult, AlzheimerClass } from "../types";

export const analyzeMRI = async (
  base64Image: string, 
  mmseScore: number, 
  runtimeApiKey?: string, 
  modelName: string = "lightalznet"
): Promise<PredictionResult> => {

  try {
    // 1. Convert base64 to Blob 
    const base64Data = base64Image.split(',')[1] || base64Image;
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });
    
    // 2. Prepare Form Data
    const formData = new FormData();
    formData.append('image', blob, 'mri.png');
    formData.append('mmse', mmseScore.toString());
    formData.append('model', modelName);

    // 3. Request inference from the Backend
    const response = await fetch('/api/predict', {
      method: 'POST',
      body: formData,
    });

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