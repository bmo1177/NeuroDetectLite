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
              Act as the inference engine for "NeuroDetect Lite", a research prototype for an MSc thesis on Lightweight Deep Learning for Early Alzheimer's Detection.
              The system simulates a hybrid Compact CNN + Vision Transformer (ViT) architecture.

              Task:
              1. Analyze the provided T1-weighted brain MRI.
              2. Integrate the clinical variable: MMSE Score = ${mmseScore} (Mini-Mental State Exam).
              3. Perform a classification into one of three research classes:
                 - Cognitively Normal (CN)
                 - Mild Cognitive Impairment (MCI)
                 - Alzheimer's Disease (AD)
              
              Guidelines for Output:
              - **Language Safety**: This is a research tool, not a medical device. Use phrases like "Model predicts...", "Patterns consistent with...", "Inference suggests...". NEVER say "The patient has..." or "Diagnosis is...".
              - **Explainability**: Focus on visual biomarkers relevant to the architecture (e.g., "CNN features detect ventricular enlargement", "ViT attention heads focus on the temporal lobe").
              - **Saliency**: Describe where a Grad-CAM or Attention Map would theoretically activate (e.g., hippocampus, entorhinal cortex).

              Output strict JSON matching the schema.
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
    const errorMsg = error.message || "Unknown error";
    if (errorMsg.includes("404")) {
        throw new Error("Model not found. Please check region availability or API key permissions.");
    }
    throw new Error(`Inference failed: ${errorMsg}`);
  }
};