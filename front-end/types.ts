export enum AlzheimerClass {
  CN = "Cognitively Normal",
  MCI = "Mild Cognitive Impairment",
  AD = "Alzheimer's Disease"
}

export interface PredictionResult {
  probabilities: {
    [key in AlzheimerClass]: number;
  };
  diagnosis: AlzheimerClass;
  confidence: number;
  explanation: string;
  regionsOfInterest: string[];
  saliencyAnalysis: string;
  inference_time_ms?: number;
  model_used?: string;
  gradcam_base64?: string;
}

export interface AnalysisState {
  status: 'idle' | 'uploading' | 'analyzing' | 'complete' | 'error';
  image: string | null; // base64
  mmse: number;
  result: PredictionResult | null;
  error?: string;
}