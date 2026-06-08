"""
mmse_gate.py — NeuroDetectLite Neurosymbolic MMSE Gate

The neurosymbolic gate encodes established clinical knowledge as explicit
symbolic rules that arbitrate the neural network's probabilistic output.

Clinical thresholds (DSM-5 / NINCDS-ADRDA criteria):
  MMSE ≥ 24        → Normal cognition range
  MMSE 18–23       → MCI / mild impairment range
  MMSE 10–17       → Moderate dementia range
  MMSE < 10        → Severe dementia range

Gate logic:
  - When neural prediction and MMSE are CONSISTENT  → trust the model
  - When they CONFLICT                              → flag for clinician review
  - When model confidence is LOW in MCI MMSE range  → always escalate
  - When MMSE is missing / null                     → note limitation, proceed

This is the "neurosymbolic" contribution: symbolic rules encode clinical
knowledge; the neural network encodes image knowledge. Neither alone is
sufficient for a clinical decision support system.

Reference framing for article:
  "The MMSE gate implements a hybrid neuro-symbolic architecture where
   deterministic clinical rules derived from established diagnostic criteria
   (DSM-5) supervise the neural network's probabilistic output, flagging
   conflicts that warrant human review rather than silently propagating
   potentially erroneous predictions."
"""

from dataclasses import dataclass, field
from typing import Optional, List
from enum import Enum


# ── Clinical stratification thresholds (matches website + DSM-5) ──────────
# These are the single source of truth. If you change them here,
# they automatically propagate to all gate rules below.
MMSE_INTACT_MIN      = 27   # ≥27 = Intact Cognition
MMSE_NORMAL_MIN      = 24   # ≥24 = Cognitively Normal range
MMSE_MCI_MIN         = 19   # 19–23 = MCI / Early Dementia
MMSE_MODERATE_MIN    = 10   # 10–18 = Moderate Dementia
                             #  <10  = Severe Dementia

# MCI trap zone: scores in this range have highest diagnostic ambiguity
MMSE_TRANSITION_LOW  = 19
MMSE_TRANSITION_HIGH = 26   # 24–26 included: low-normal, high reserve risk

# Confidence threshold below which MCI predictions are flagged
MCI_CONFIDENCE_THRESHOLD = 0.55


class AlertLevel(str, Enum):
    NONE     = "none"       # consistent, high confidence — no action needed
    INFO     = "info"       # minor note, no action required
    REVIEW   = "review"     # clinician should review — soft conflict
    ESCALATE = "escalate"   # strong conflict — do not act without specialist


@dataclass
class GateResult:
    alert_level:         AlertLevel
    alert_message:       str
    clinical_note:       str
    mmse_interpretation: str
    prediction_trusted:  bool
    suggested_action:    str
    gate_triggered:      bool
    flags:               List[str] = field(default_factory=list)


def interpret_mmse(mmse: Optional[int]) -> str:
    """Plain-language interpretation matching website clinical stratification."""
    if mmse is None:
        return "MMSE score not provided"
    if mmse >= MMSE_INTACT_MIN:
        return f"MMSE {mmse}/30 — Normal cognitive range (≥{MMSE_INTACT_MIN}: intact cognition)"
    if mmse >= MMSE_NORMAL_MIN:
        return f"MMSE {mmse}/30 — Low-normal range ({MMSE_NORMAL_MIN}–{MMSE_INTACT_MIN - 1}: possible very mild impairment)"
    if mmse >= MMSE_MCI_MIN:
        return f"MMSE {mmse}/30 — MCI / Early Dementia range ({MMSE_MCI_MIN}–{MMSE_NORMAL_MIN - 1})"
    if mmse >= MMSE_MODERATE_MIN:
        return f"MMSE {mmse}/30 — Moderate Dementia range ({MMSE_MODERATE_MIN}–{MMSE_MCI_MIN - 1})"
    return f"MMSE {mmse}/30 — Severe Dementia range (<{MMSE_MODERATE_MIN})"


def run_gate(
    predicted_class: int,
    confidence: float,
    probabilities: list,
    mmse: Optional[int],
    education_years: int = 12,
) -> GateResult:
    """
    Apply neurosymbolic rules and return a structured gate result.

    Parameters
    ----------
    predicted_class : int     0=CN, 1=MCI, 2=AD
    confidence      : float   max(softmax probabilities)
    probabilities   : list    [p_CN, p_MCI, p_AD]
    mmse            : int     MMSE score 0–30 (None = not provided)

    Returns
    -------
    GateResult with alert level, clinical guidance, and flags
    """

    # ── Improvement 1: Validate MMSE range ───────────────────────────────
    if mmse is not None and not (0 <= mmse <= 30):
        raise ValueError(
            f"MMSE score out of valid range [0, 30]: received {mmse}. "
            "Check upstream input validation."
        )

    if len(probabilities) != 3:
        raise ValueError("The probabilities array must contain exactly 3 indices: [p_CN, p_MCI, p_AD]")

    flags        = []
    mmse_interp  = interpret_mmse(mmse)
    p_cn, p_mci, p_ad = probabilities[0], probabilities[1], probabilities[2]

    # ── Rule 0: MMSE not provided ─────────────────────────────────────────
    if mmse is None:
        return GateResult(
            alert_level         = AlertLevel.INFO,
            alert_message       = "MMSE score not provided — prediction based on imaging only.",
            clinical_note       = (
                "Without MMSE data the system cannot cross-validate imaging prediction "
                "against cognitive performance. For clinical use, always pair imaging "
                "predictions with standardized cognitive assessment."
            ),
            mmse_interpretation = mmse_interp,
            prediction_trusted  = True,
            suggested_action    = "Administer MMSE and re-run for neurosymbolic validation.",
            gate_triggered      = False,
            flags               = ["mmse_missing"],
        )

    # ── Rule 1: CN predicted but MMSE below normal threshold ─────────────
    if predicted_class == 0 and mmse < MMSE_NORMAL_MIN:
        flags.append("cn_mmse_conflict")
        severity = AlertLevel.ESCALATE if mmse < MMSE_MCI_MIN else AlertLevel.REVIEW
        return GateResult(
            alert_level         = severity,
            alert_message       = (
                f"⚠️  Conflict: Model predicts Cognitively Normal "
                f"but MMSE {mmse}/30 falls in the "
                f"{'moderate dementia' if mmse < MMSE_MCI_MIN else 'MCI / low-normal'} range."
            ),
            clinical_note       = (
                f"MMSE {mmse}/30 is inconsistent with a CN imaging prediction. "
                "Possible explanations: (1) early MCI not yet visible on structural MRI, "
                "(2) scan quality artifact, "
                "(3) subject anxiety during administration. "
                "A follow-up neuropsychological evaluation is strongly recommended."
            ),
            mmse_interpretation = mmse_interp,
            prediction_trusted  = False,
            suggested_action    = (
                "Refer for full neuropsychological battery. "
                "Consider repeat MRI in 12 months to detect longitudinal change."
            ),
            gate_triggered      = True,
            flags               = flags,
        )

    # ── Rule 2: AD predicted but MMSE is in normal range ─────────────────
    if predicted_class == 2 and mmse >= MMSE_NORMAL_MIN:
        flags.append("ad_mmse_conflict")
        return GateResult(
            alert_level         = AlertLevel.ESCALATE,
            alert_message       = (
                f"⚠️  Conflict: Model predicts Alzheimer's Disease "
                f"but MMSE {mmse}/30 is in the normal–low-normal range."
            ),
            clinical_note       = (
                f"MMSE {mmse}/30 is atypically high for an AD prediction. "
                "Possible explanations: (1) early-stage AD with preserved verbal cognition, "
                "(2) false positive due to scan artifact or model uncertainty, "
                "(3) atypical AD variant (posterior cortical atrophy) with preserved MMSE. "
                f"Model confidence: {confidence*100:.1f}% — "
                f"{'low confidence warrants caution' if confidence < 0.65 else 'moderate-high confidence, but conflict is clinically significant'}."
            ),
            mmse_interpretation = mmse_interp,
            prediction_trusted  = False,
            suggested_action    = (
                "Request specialist review. PET amyloid imaging or CSF biomarkers "
                "may clarify diagnosis. Do not communicate AD diagnosis to patient "
                "based on this result alone."
            ),
            gate_triggered      = True,
            flags               = flags,
        )

    # ── Rule 3: MCI trap zone — ambiguous MMSE + low model confidence ─────
    # Uses website thresholds: transition zone 19–26
    if (MMSE_TRANSITION_LOW <= mmse <= MMSE_TRANSITION_HIGH
            and predicted_class == 1
            and confidence < MCI_CONFIDENCE_THRESHOLD):
        flags.append("mci_low_confidence")
        return GateResult(
            alert_level         = AlertLevel.REVIEW,
            alert_message       = (
                f"ℹ️  Low-confidence MCI prediction in diagnostically ambiguous "
                f"MMSE transition zone ({mmse}/30). Manual review recommended."
            ),
            clinical_note       = (
                f"MMSE {mmse}/30 overlaps the CN–MCI–AD transition zone ({MMSE_TRANSITION_LOW}–{MMSE_TRANSITION_HIGH}). "
                f"Model confidence is {confidence*100:.1f}%, below the {MCI_CONFIDENCE_THRESHOLD*100:.0f}% "
                "threshold for reliable MCI detection. "
                "The MCI class is inherently difficult to distinguish from normal aging "
                "on structural MRI alone — this is the core 'MCI Trap' identified in this thesis. "
                "This result should be combined with longitudinal cognitive testing."
            ),
            mmse_interpretation = mmse_interp,
            prediction_trusted  = False,
            suggested_action    = (
                "Administer repeat MMSE in 6 months. Consider MoCA for finer sensitivity. "
                "Serial imaging at 12-month intervals recommended."
            ),
            gate_triggered      = True,
            flags               = flags,
        )

    # ── Rule 4: MCI predicted but MMSE suggests moderate/severe dementia ──
    # Improvement 5: if p_AD > p_CN, escalate instead of review
    if predicted_class == 1 and mmse < MMSE_MCI_MIN:
        flags.append("mci_mmse_severe")
        ad_dominant = p_ad > p_cn
        if ad_dominant:
            flags.append("consider_ad")
        alert = AlertLevel.ESCALATE if ad_dominant else AlertLevel.REVIEW
        return GateResult(
            alert_level         = alert,
            alert_message       = (
                f"{'⚠️  Escalation' if ad_dominant else 'ℹ️  Review'}: "
                f"Model predicts MCI but MMSE {mmse}/30 suggests "
                f"{'moderate–severe' if mmse < MMSE_MODERATE_MIN else 'moderate'} dementia range."
                + (f" AD probability ({p_ad*100:.1f}%) exceeds CN probability — consider AD as primary differential."
                   if ad_dominant else "")
            ),
            clinical_note       = (
                f"MMSE {mmse}/30 is below the MCI boundary ({MMSE_MCI_MIN}). "
                "The model's MCI classification may underestimate disease severity. "
                f"Model AD probability: {p_ad*100:.1f}% vs CN probability: {p_cn*100:.1f}%. "
                + ("The AD probability exceeds CN probability, suggesting the model's "
                   "second-choice hypothesis is AD. This warrants escalated review. "
                   if ad_dominant else
                   "Full dementia workup is recommended.")
            ),
            mmse_interpretation = mmse_interp,
            prediction_trusted  = False,
            suggested_action    = (
                "Full dementia workup recommended. "
                "Review for reversible causes (depression, metabolic, medication effects). "
                + ("Specialist referral advised given imaging-score concordance toward AD."
                   if ad_dominant else "")
            ),
            gate_triggered      = True,
            flags               = flags,
        )

    # ── Rule 5: AD predicted and MMSE confirms moderate/severe range ──────
    if predicted_class == 2 and mmse < MMSE_MCI_MIN:
        flags.extend(["ad_confirmed_severe", "consistent"])   # Improvement 4
        return GateResult(
            alert_level         = AlertLevel.INFO,
            alert_message       = (
                f"Imaging and MMSE {mmse}/30 are consistent with "
                "Alzheimer's Disease diagnosis."
            ),
            clinical_note       = (
                "Both structural MRI features and cognitive performance are "
                f"consistent with AD. Model confidence: {confidence*100:.1f}%. "
                "This is a high-confidence consistent result."
            ),
            mmse_interpretation = mmse_interp,
            prediction_trusted  = True,
            suggested_action    = (
                "Proceed with standard AD management pathway. "
                "Discuss diagnosis with patient and family with appropriate support."
            ),
            gate_triggered      = False,
            flags               = flags,
        )

    # ── Rule 6: Consistent — no conflict detected ─────────────────────────
    # Improvement 4: always include "consistent" flag for downstream filtering
    flags.append("consistent")
    
    if education_years >= 16 and mmse is not None and mmse <= 27 and predicted_class == 0:
        # Override to AlertLevel.REVIEW due to high education cognitive reserve mask
        return GateResult(
            alert_level         = AlertLevel.REVIEW,
            alert_message       = (
                f"ℹ️  Review: Patient has {education_years} years of education. "
                f"MMSE {mmse}/30 may mask early cognitive decline."
            ),
            clinical_note       = (
                f"Model predicts CN, but an MMSE of {mmse}/30 for a highly educated patient "
                f"({education_years} years) presents a cognitive reserve risk. The score is "
                "lower than expected for this baseline and may mask early prodromal decline."
            ),
            mmse_interpretation = mmse_interp,
            prediction_trusted  = False,
            suggested_action    = "Review cognitive baseline. Standard MMSE may lack sensitivity for this patient.",
            gate_triggered      = True,
            flags               = flags + ["high_reserve_mask"],
        )

    return GateResult(
        alert_level         = AlertLevel.NONE,
        alert_message       = "Imaging prediction and MMSE score are consistent.",
        clinical_note       = (
            f"MMSE {mmse}/30 is consistent with the model's prediction. "
            f"Model confidence: {confidence*100:.1f}%."
        ),
        mmse_interpretation = mmse_interp,
        prediction_trusted  = True,
        suggested_action    = "No conflict detected. Follow standard clinical pathway.",
        gate_triggered      = False,
        flags               = flags,
    )


# ── Improvement 3: Batch interface ───────────────────────────────────────

def run_gate_batch(cases: list) -> list:
    """
    Process multiple cases. Useful for the 88-test-image pipeline
    and future evaluation notebooks.

    Parameters
    ----------
    cases : list of dicts, each with keys:
        predicted_class, confidence, probabilities, mmse

    Returns
    -------
    list of GateResult objects (same order as input)

    Example
    -------
    results = run_gate_batch([
        {"predicted_class": 1, "confidence": 0.48,
         "probabilities": [0.30, 0.48, 0.22], "mmse": 21},
        {"predicted_class": 0, "confidence": 0.72,
         "probabilities": [0.72, 0.18, 0.10], "mmse": 28},
    ])
    """
    return [
        run_gate(
            predicted_class = c["predicted_class"],
            confidence      = c["confidence"],
            probabilities   = c["probabilities"],
            mmse            = c.get("mmse"),
        )
        for c in cases
    ]


def format_gate_for_api(gate: GateResult) -> dict:
    """
    Serialize GateResult to the API response dict.
    Includes the clinical thresholds used so the frontend
    can display them in the SYMBOLIC_GATE_PAYLOAD.json panel.
    """
    return {
        "alert_level":          gate.alert_level.value,
        "alert_message":        gate.alert_message,
        "clinical_note":        gate.clinical_note,
        "mmse_interpretation":  gate.mmse_interpretation,
        "prediction_trusted":   gate.prediction_trusted,
        "suggested_action":     gate.suggested_action,
        "gate_triggered":       gate.gate_triggered,
        "flags":                gate.flags,
        "thresholds_applied": {
            "normal_min":           MMSE_NORMAL_MIN,
            "mci_min":              MMSE_MCI_MIN,
            "moderate_min":         MMSE_MODERATE_MIN,
            "transition_zone":      [MMSE_TRANSITION_LOW, MMSE_TRANSITION_HIGH],
            "mci_confidence_floor": MCI_CONFIDENCE_THRESHOLD,
        },
    }
