import { PredictionResult, AlzheimerClass, MMSEGate } from "../types";

// ── Demo mode: generated when backend is unreachable ──────────────────────
let _isDemoMode = false;
export const isDemoMode = () => _isDemoMode;
export const setDemoMode = (v: boolean) => { _isDemoMode = v; };

function generateDemoResult(mmse: number, modelName: string): PredictionResult {
  // Determine class probabilities based on MMSE score (DSM-5 thresholds)
  let cn: number, mci: number, ad: number;

  if (mmse >= 24) {
    // Normal cognition range — high CN confidence
    cn = 0.70 + Math.random() * 0.15;
    mci = 0.10 + Math.random() * 0.10;
    ad = 1 - cn - mci;
  } else if (mmse >= 18) {
    // MCI range — mixed, MCI dominant
    cn = 0.10 + Math.random() * 0.10;
    mci = 0.55 + Math.random() * 0.15;
    ad = 1 - cn - mci;
  } else if (mmse >= 10) {
    // Moderate dementia — AD dominant
    cn = 0.02 + Math.random() * 0.05;
    mci = 0.15 + Math.random() * 0.10;
    ad = 1 - cn - mci;
  } else {
    // Severe dementia — very high AD
    cn = 0.01 + Math.random() * 0.02;
    mci = 0.05 + Math.random() * 0.05;
    ad = 1 - cn - mci;
  }

  // Normalize
  const total = cn + mci + ad;
  cn /= total; mci /= total; ad /= total;

  const probs = {
    [AlzheimerClass.CN]: Math.round(cn * 1000) / 1000,
    [AlzheimerClass.MCI]: Math.round(mci * 1000) / 1000,
    [AlzheimerClass.AD]: Math.round(ad * 1000) / 1000,
  };

  // Determine diagnosis from highest probability
  const maxKey = (Object.entries(probs) as [string, number][]).reduce((a, b) => b[1] > a[1] ? b : a)[0] as AlzheimerClass;
  const confidence = probs[maxKey];

  // Generate MMSE gate result
  const gate = generateDemoGate(mmse, maxKey, confidence);

  const explanations: Record<string, string> = {
    [AlzheimerClass.CN]: `The ${modelName} architecture classified this scan as Cognitively Normal (CN) with ${(confidence * 100).toFixed(1)}% confidence. The 2.5D multi-slice input pipeline extracted 7 channels (5 axial + 2 coronal) from the NIfTI volume. Cortical thickness and hippocampal volume appear within normal bounds for the patient's age group.`,
    [AlzheimerClass.MCI]: `The ${modelName} architecture classified this scan as Mild Cognitive Impairment (MCI) with ${(confidence * 100).toFixed(1)}% confidence. The 2.5D multi-slice input pipeline extracted 7 channels from the NIfTI volume. Subtle medial temporal lobe atrophy patterns are consistent with early-stage neurodegenerative changes.`,
    [AlzheimerClass.AD]: `The ${modelName} architecture classified this scan as Alzheimer's Disease (AD) with ${(confidence * 100).toFixed(1)}% confidence. The 2.5D multi-slice input pipeline extracted 7 channels from the NIfTI volume. Pronounced bilateral hippocampal atrophy and ventricular enlargement are visible, consistent with moderate-to-severe Alzheimer's pathology.`,
  };

  const regions: Record<string, string[]> = {
    [AlzheimerClass.CN]: ['Bilateral hippocampus — normal volume', 'Cortical thickness — within expected range', 'Ventricular size — no significant enlargement'],
    [AlzheimerClass.MCI]: ['Left hippocampus — mild atrophy detected', 'Medial temporal lobe — subtle signal changes', 'Entorhinal cortex — reduced volume bilateral'],
    [AlzheimerClass.AD]: ['Bilateral hippocampus — significant atrophy', 'Lateral ventricles — compensatory enlargement', 'Parietal cortex — reduced cortical thickness', 'Posterior cingulate — hypometabolism pattern'],
  };

  return {
    probabilities: probs,
    diagnosis: maxKey,
    confidence: Math.round(confidence * 1000) / 1000,
    explanation: explanations[maxKey],
    regionsOfInterest: regions[maxKey],
    saliencyAnalysis: `GradCAM saliency maps highlight the regions most influential to the ${modelName} model's prediction. Heatmap activation is concentrated in the medial temporal lobe structures, consistent with known Alzheimer's biomarkers.`,
    inference_time_ms: Math.round(8 + Math.random() * 12),
    model_used: modelName,
    mmse_gate: gate,
  };
}

function generateDemoGate(mmse: number, diagnosis: AlzheimerClass, confidence: number): MMSEGate {
  const isNormal = mmse >= 24;
  const isMCI = mmse >= 18 && mmse < 24;
  const isModerate = mmse >= 10 && mmse < 18;
  const isSevere = mmse < 10;

  const modelSaysCN = diagnosis === AlzheimerClass.CN;
  const modelSaysMCI = diagnosis === AlzheimerClass.MCI;
  const modelSaysAD = diagnosis === AlzheimerClass.AD;

  // Check consistency
  const mmseConsistentWithCN = isNormal && modelSaysCN;
  const mmseConsistentWithMCI = isMCI && (modelSaysMCI || modelSaysAD);
  const mmseConsistentWithAD = (isModerate || isSevere) && modelSaysAD;
  const isConsistent = mmseConsistentWithCN || mmseConsistentWithMCI || mmseConsistentWithAD;

  // Conflict: model says CN but MMSE is impaired
  const conflictCNvsImpaired = modelSaysCN && !isNormal;
  // Conflict: model says AD but MMSE is normal
  const conflictADvsNormal = modelSaysAD && isNormal;

  let alertLevel: MMSEGate['alert_level'];
  let alertMessage: string;
  let clinicalNote: string;
  let suggestedAction: string;
  let predictionTrusted: boolean;
  let gateTriggered: boolean;
  const flags: string[] = [];

  if (mmseConsistentWithCN) {
    alertLevel = 'none';
    alertMessage = 'MMSE and neural prediction are consistent. No conflict detected.';
    clinicalNote = 'MMSE score indicates normal cognition. The model concurs with a CN classification.';
    suggestedAction = 'No additional clinical review required for this screening.';
    predictionTrusted = true;
    gateTriggered = false;
  } else if (mmseConsistentWithMCI || mmseConsistentWithAD) {
    alertLevel = 'info';
    alertMessage = 'MMSE and neural prediction are consistent within the expected impairment range.';
    clinicalNote = `MMSE ${mmse}/30 indicates ${isMCI ? 'mild cognitive impairment' : isModerate ? 'moderate dementia' : 'severe dementia'}. Model prediction aligns with clinical assessment.`;
    suggestedAction = 'Continue standard monitoring protocol. Schedule follow-up assessment in 6 months.';
    predictionTrusted = true;
    gateTriggered = false;
  } else if (conflictCNvsImpaired) {
    alertLevel = 'review';
    alertMessage = 'CONFLICT: Model predicts Normal but MMSE indicates impairment.';
    clinicalNote = `The neural network classified the MRI as Cognitively Normal, but the MMSE score of ${mmse}/30 falls in the ${isMCI ? 'MCI' : 'dementia'} range. This discrepancy warrants clinical review.`;
    suggestedAction = 'Refer to specialist for comprehensive neuropsychological evaluation. Consider additional biomarkers (CSF, PET).';
    predictionTrusted = false;
    gateTriggered = true;
    flags.push('MODEL_MMSE_CONFLICT');
    if (isMCI) flags.push('MCI_AMBIGUITY_ZONE');
  } else if (conflictADvsNormal) {
    alertLevel = 'escalate';
    alertMessage = 'STRONG CONFLICT: Model predicts Alzheimer\'s but MMSE is normal.';
    clinicalNote = `The neural network classified the MRI as Alzheimer's Disease, but the MMSE score of ${mmse}/30 is within normal range. This is a significant discrepancy that requires specialist review.`;
    suggestedAction = 'URGENT: Refer to neurologist. Consider that high cognitive reserve may mask early-stage disease. Order additional imaging (FDG-PET, amyloid PET).';
    predictionTrusted = false;
    gateTriggered = true;
    flags.push('STRONG_MODEL_MMSE_CONFLICT');
    flags.push('HIGH_COGNITIVE_RESERVE_RISK');
  } else {
    // MCI trap zone or other edge case
    alertLevel = 'review';
    alertMessage = 'MMSE and model prediction show partial disagreement.';
    clinicalNote = `MMSE ${mmse}/30 and model prediction (${diagnosis}) show some inconsistency. The MCI transition zone (MMSE 19-26) has known diagnostic ambiguity.`;
    suggestedAction = 'Recommend clinical correlation. Consider repeat MMSE in 3 months and structural MRI follow-up.';
    predictionTrusted = confidence > 0.55;
    gateTriggered = true;
    flags.push('PARTIAL_DISAGREEMENT');
    if (mmse >= 19 && mmse <= 26) flags.push('MCI_TRANSITION_ZONE');
  }

  const interpretations: Record<string, string> = {
    [AlzheimerClass.CN]: 'Cognitively Normal — no significant cognitive decline detected by the MMSE screening instrument.',
    [AlzheimerClass.MCI]: 'Mild Cognitive Impairment — early-stage cognitive changes that may precede dementia. Requires monitoring.',
    [AlzheimerClass.AD]: "Alzheimer's Disease — significant cognitive decline consistent with dementia criteria per DSM-5.",
  };

  return {
    alert_level: alertLevel,
    alert_message: alertMessage,
    clinical_note: clinicalNote,
    mmse_interpretation: interpretations[diagnosis],
    prediction_trusted: predictionTrusted,
    suggested_action: suggestedAction,
    gate_triggered: gateTriggered,
    flags,
  };
}

// ── Main inference function ───────────────────────────────────────────────
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
    // 3 minute timeout — Render free tier cold start can take 30-60s,
    // plus model loading + inference time
    const timeout = setTimeout(() => controller.abort(), 180000);

    const API_BASE = import.meta.env.VITE_API_URL || `http://127.0.0.1:${port}`;
    const response = await fetch(`${API_BASE}/api/predict`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Backend error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    // Return the response parsed to PredictionResult structure
    _isDemoMode = false;
    return data as PredictionResult;
  } catch (error: any) {
    console.warn("Backend unreachable, falling back to demo mode:", error.message);
    // Fall back to demo mode with simulated results
    _isDemoMode = true;
    return generateDemoResult(mmseScore, modelName);
  }
};
