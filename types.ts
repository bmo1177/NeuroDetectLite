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
}

export interface AnalysisState {
  status: 'idle' | 'uploading' | 'analyzing' | 'complete' | 'error';
  image: string | null; // base64
  mmse: number;
  result: PredictionResult | null;
  error?: string;
}