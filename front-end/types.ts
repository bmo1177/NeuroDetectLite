export enum AlzheimerClass {
  CN = "Cognitively Normal",
  MCI = "Mild Cognitive Impairment",
  AD = "Alzheimer's Disease"
}

export interface MMSEGate {
  alert_level: 'none' | 'info' | 'review' | 'escalate';
  alert_message: string;
  clinical_note: string;
  mmse_interpretation: string;
  prediction_trusted: boolean;
  suggested_action: string;
  gate_triggered: boolean;
  flags: string[];
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
  ref_slice_base64?: string;
  mmse_gate?: MMSEGate;
}

export interface AnalysisState {
  status: 'idle' | 'uploading' | 'analyzing' | 'complete' | 'error';
  image: string | null; // base64
  mmse: number;
  result: PredictionResult | null;
  error?: string;
}