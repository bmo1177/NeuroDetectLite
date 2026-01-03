import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PredictionResult, AlzheimerClass } from "../types";

// Schema for structured JSON output
const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    probabilities: {
      type: Type.OBJECT,
      properties: {
        [AlzheimerClass.CN]: { type: Type.NUMBER },
        [AlzheimerClass.MCI]: { type: Type.NUMBER },
        [AlzheimerClass.AD]: { type: Type.NUMBER },
      },
      required: [
        AlzheimerClass.CN,
        AlzheimerClass.MCI,
        AlzheimerClass.AD
      ],
    },
    diagnosis: { type: Type.STRING },
    confidence: { type: Type.NUMBER, description: "Confidence score between 0 and 1" },
    explanation: { type: Type.STRING },
    regionsOfInterest: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    saliencyAnalysis: { type: Type.STRING, description: "Description of what the saliency map/attention visualization highlights" }
  },
  required: ["probabilities", "diagnosis", "confidence", "explanation", "regionsOfInterest", "saliencyAnalysis"],
};

export const analyzeMRI = async (base64Image: string, mmseScore: number): Promise<PredictionResult> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key not found");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Switch to gemini-2.0-flash-exp which is a valid model ID for vision tasks.
    // gemini-2.5-flash-latest was incorrect and caused 404 errors.
    const modelId = "gemini-2.0-flash-exp";

    // Clean base64 string if it contains metadata
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/png", 
              data: cleanBase64,
            },
          },
          {
            text: `
              Act as an expert lightweight deep learning diagnostic system for Alzheimer's Detection.
              
              Context:
              This analysis is part of a thesis on "Lightweight Deep Learning Models for Early Alzheimer’s Detection".
              The model simulates a hybrid architecture (Compact CNN + Vision Transformer) optimized for low computational cost.
              
              Task:
              1. Analyze the provided brain MRI scan.
              2. Incorporate the provided clinical data: MMSE Score = ${mmseScore} (Mini-Mental State Examination, range 0-30. <24 indicates impairment).
              3. Classify the patient into one of three stages: 
                 - Cognitively Normal (CN)
                 - Mild Cognitive Impairment (MCI)
                 - Alzheimer's Disease (AD)
              4. Explain the decision based on visual biomarkers (Hippocampal atrophy, Ventricular enlargement, Cortical thinning).
              5. Describe the "Saliency Map" or "Attention" focus areas.
              
              Output strict JSON.
            `
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.2, 
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const data = JSON.parse(text) as PredictionResult;
    return data;

  } catch (error: any) {
    console.error("Analysis Error:", error);
    // Return the specific error message to help debugging if it occurs again
    const errorMsg = error.message || "Unknown error";
    if (errorMsg.includes("404")) {
        throw new Error("Model not found. Please check region availability or API key permissions.");
    }
    throw new Error(`Diagnostic failed: ${errorMsg}`);
  }
};