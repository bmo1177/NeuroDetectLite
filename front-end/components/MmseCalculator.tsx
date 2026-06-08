import React, { useState, useEffect } from 'react';
import { 
  FileText, BookOpen, Layers, CheckSquare, RotateCcw, 
  ArrowRight, AlertCircle, Info, BrainCircuit, Terminal, Sparkles 
} from 'lucide-react';

interface MmseCalculatorProps {
  onApplyScore: (score: number) => void;
  currentMmse: number;
}

export const MmseCalculator: React.FC<MmseCalculatorProps> = ({ onApplyScore, currentMmse }) => {
  const [activeSubTab, setActiveSubTab] = useState<'calculator' | 'foundations' | 'protocols'>('calculator');
  
  // Interactive Calculator State
  const [educationYears, setEducationYears] = useState<number>(16);
  const [motorImpaired, setMotorImpaired] = useState<boolean>(false);
  
  // Scoring States (1 point per item, domain totals mapped)
  const [orientationTime, setOrientationTime] = useState({
    year: false,
    season: false,
    month: false,
    date: false,
    day: false
  });
  
  const [orientationPlace, setOrientationPlace] = useState({
    country: false,
    state: false,
    town: false,
    building: false,
    floor: false
  });
  
  const [registration, setRegistration] = useState({
    apple: false,
    table: false,
    penny: false
  });
  
  const [attentionCalculation, setAttentionCalculation] = useState({
    step1: false, // 93
    step2: false, // 86
    step3: false, // 79
    step4: false, // 72
    step5: false  // 65
  });
  
  const [delayedRecall, setDelayedRecall] = useState({
    apple: false,
    table: false,
    penny: false
  });
  
  const [languagePraxis, setLanguagePraxis] = useState({
    namingPencil: false,
    namingWatch: false,
    repetition: false,
    commandHand: false,
    commandFold: false,
    commandFloor: false,
    reading: false,
    writing: false,
    copying: false
  });

  const handleResetCalculator = () => {
    setOrientationTime({ year: false, season: false, month: false, date: false, day: false });
    setOrientationPlace({ country: false, state: false, town: false, building: false, floor: false });
    setRegistration({ apple: false, table: false, penny: false });
    setAttentionCalculation({ step1: false, step2: false, step3: false, step4: false, step5: false });
    setDelayedRecall({ apple: false, table: false, penny: false });
    setLanguagePraxis({
      namingPencil: false, namingWatch: false, repetition: false,
      commandHand: false, commandFold: false, commandFloor: false,
      reading: false, writing: false, copying: false
    });
    setMotorImpaired(false);
  };

  // Compute Subscores
  const timeScore = Object.values(orientationTime).filter(Boolean).length;
  const placeScore = Object.values(orientationPlace).filter(Boolean).length;
  const regScore = Object.values(registration).filter(Boolean).length;
  const attScore = Object.values(attentionCalculation).filter(Boolean).length;
  const recallScore = Object.values(delayedRecall).filter(Boolean).length;
  const langScore = Object.values(languagePraxis).filter(Boolean).length;
  
  let rawTotal = timeScore + placeScore + regScore + attScore + recallScore + langScore;
  let itemsAttempted = 30;
  
  if (motorImpaired) {
    itemsAttempted -= 5;
    const motorPoints = (languagePraxis.commandHand ? 1 : 0) + 
                        (languagePraxis.commandFold ? 1 : 0) + 
                        (languagePraxis.commandFloor ? 1 : 0) + 
                        (languagePraxis.writing ? 1 : 0) + 
                        (languagePraxis.copying ? 1 : 0);
    rawTotal -= motorPoints;
  }
  
  const calculatedTotal = itemsAttempted < 30 ? Math.round((rawTotal / itemsAttempted) * 30) : rawTotal;

  // Gate Rules & Clinical Stratification
  let clinicalStratification = "Cognitively Normal";
  let stratificationColor = "var(--semantic-green)";
  let stratificationBg = "var(--green-50)";
  let stratificationBorder = "var(--semantic-green)";

  if (calculatedTotal < 10) {
    clinicalStratification = "Severe Dementia";
    stratificationColor = "var(--semantic-red)";
    stratificationBg = "var(--semantic-red-bg)";
    stratificationBorder = "var(--semantic-red)";
  } else if (calculatedTotal < 19) {
    clinicalStratification = "Moderate Dementia";
    stratificationColor = "var(--semantic-red)";
    stratificationBg = "var(--semantic-red-bg)";
    stratificationBorder = "var(--semantic-red)";
  } else if (calculatedTotal < 24) {
    clinicalStratification = "MCI / Early Dementia";
    stratificationColor = "var(--semantic-amber)";
    stratificationBg = "var(--semantic-amber-bg)";
    stratificationBorder = "var(--semantic-amber)";
  }

  // Heuristics
  const delayedRecallDeficit = recallScore <= 1;
  const cognitiveCompensationSuspected = 
    (calculatedTotal >= 24 && recallScore <= 1) || 
    (calculatedTotal <= 27 && educationYears >= 16);
    
  const triggerMriPipeline = calculatedTotal < 24 || cognitiveCompensationSuspected;
  
  const priorityLevel = 
    calculatedTotal < 19 ? "URGENT" : 
    triggerMriPipeline ? "MEDIUM" : "LOW";

  // Build simulated clinical rationale
  let clinicalRationale = "";
  if (calculatedTotal < 24) {
    clinicalRationale = `Patient scored ${calculatedTotal}/30, falling into the impaired range. Neurocognitive deficits are clinically verified. Structural MRI scan is required to map localized cerebral atrophy.`;
  } else if (cognitiveCompensationSuspected) {
    if (recallScore <= 1) {
      clinicalRationale = `Patient achieved high-normal total score (${calculatedTotal}/30) but shows critical Delayed Recall deficit (${recallScore}/3). High risk of cognitive compensation masking hippocampal CA1 atrophy. MRI triggered.`;
    } else {
      clinicalRationale = `Patient scored low-normal (${calculatedTotal}/30) with high education (${educationYears} years). High behavioral reserve may mask early temporal lobe neurodegeneration. MRI triggered to cross-validate.`;
    }
  } else {
    clinicalRationale = `Patient scored normal (${calculatedTotal}/30) with balanced sub-domain scores. Low immediate risk. Standard clinical follow-up suggested; structural MRI pipeline available but not urgent.`;
  }

  // Generate the JSON representation for the thesis symbolic gate
  const symbolicJson = JSON.stringify({
    patient_metadata: {
      education_years: educationYears,
      demographic_bias_risk: educationYears < 12 ? "High" : educationYears < 16 ? "Medium" : "Low",
      motor_impairment_flag: motorImpaired
    },
    sub_scores: {
      orientation_time: timeScore,
      orientation_place: placeScore,
      registration: regScore,
      attention_calculation: attScore,
      delayed_recall: recallScore,
      language_praxis: langScore
    },
    calculated_total: calculatedTotal,
    clinical_stratification: clinicalStratification,
    symbolic_analysis: {
      delayed_recall_deficit: delayedRecallDeficit,
      cognitive_compensation_suspected: cognitiveCompensationSuspected,
      clinical_rationale: clinicalRationale
    },
    routing_decision: {
      trigger_mri_pipeline: triggerMriPipeline,
      priority_level: priorityLevel,
      target_downstream_pipeline: triggerMriPipeline ? "ViT_HYBRID_ANALYSIS" : "STANDARD_MONITORING"
    }
  }, null, 2);

  return (
    <div className="results-card animate-fade-in" id="mmse-calculator-section" style={{ minHeight: '32rem' }}>
      
      {/* ─── Navigation Tabs ─────────────────────────────────── */}
      <div className="flex flex-wrap" style={{ borderBottom: '1px solid var(--border-line)' }}>
        <button
          onClick={() => setActiveSubTab('calculator')}
          className={`tab-button cursor-pointer ${activeSubTab === 'calculator' ? 'active-classification' : ''}`}
          id="subtab-calculator"
          aria-label="MMSE Interactive Calculator"
        >
          <CheckSquare style={{ width: 18, height: 18 }} />
          Interactive Clinical Calculator
        </button>
        <button
          onClick={() => setActiveSubTab('foundations')}
          className={`tab-button cursor-pointer ${activeSubTab === 'foundations' ? 'active-classification' : ''}`}
          id="subtab-foundations"
          aria-label="MMSE Theoretical Foundations"
        >
          <BookOpen style={{ width: 18, height: 18 }} />
          3.1 Theoretical Foundations
        </button>
        <button
          onClick={() => setActiveSubTab('protocols')}
          className={`tab-button cursor-pointer ${activeSubTab === 'protocols' ? 'active-xai' : ''}`}
          id="subtab-protocols"
          aria-label="MMSE Protocols & Validation Schema"
        >
          <Terminal style={{ width: 18, height: 18 }} />
          A.1 Clinical Protocol & Schema
        </button>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ padding: 'var(--space-lg) var(--space-xl)' }}>
        
        {/* ─────────────────────────────────────────────────────────────
             SUB-TAB: INTERACTIVE CLINICAL CALCULATOR
             ───────────────────────────────────────────────────────────── */}
        {activeSubTab === 'calculator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in stagger-children">
            
            {/* LEFT: Scoring Panel (7 Columns) */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '0.5rem' }}>
                  MMSE Standard Clinical Instrument (DSM-5)
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '65ch', lineHeight: 1.5 }}>
                  Administer standard cognitive tests and check the boxes representing correct patient answers. 
                  Sub-scores and symbolic heuristics will calculate in real time.
                </p>
              </div>

              {/* Patient Metadata Card */}
              <div className="stat-card" style={{ padding: '1rem', border: '1px solid var(--border-line)', borderRadius: 'var(--radius-lg)' }}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  Patient Demographics (Cognitive Reserve Adjustments)
                </h4>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: 500, color: 'var(--slate-700)', marginBottom: '0.25rem' }}>
                      <span>Education (Years)</span>
                      <strong className="text-indigo-600">{educationYears} Years</strong>
                    </label>
                    <input 
                      type="range" 
                      min="0" 
                      max="25" 
                      value={educationYears} 
                      onChange={(e) => setEducationYears(parseInt(e.target.value) || 0)} 
                      className="w-full cursor-pointer"
                      style={{ height: '4px' }}
                    />
                  </div>
                  <div className="shrink-0" style={{ width: '8rem', textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', display: 'block', color: 'var(--text-muted)' }}>Estimated Bias Risk</span>
                    <strong style={{ 
                      fontSize: '0.875rem', 
                      color: educationYears < 12 ? 'var(--semantic-red)' : educationYears < 16 ? 'var(--semantic-amber)' : 'var(--semantic-green)' 
                    }}>
                      {educationYears < 12 ? "High (Demographic)" : educationYears < 16 ? "Medium" : "Low (Reserve High)"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Questionnaire Groups */}
              <div className="space-y-4">
                
                {/* 1. Orientation to Time */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border-line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', background: 'var(--surface-subtle)', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-line)' }}>
                    <h4 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-heading)' }}>
                      1. Orientation to Time (Temporal)
                    </h4>
                    <span className="arch-badge">{timeScore} / 5 PTS</span>
                  </div>
                  <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                    {Object.keys(orientationTime).map((key) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer text-sm" style={{ userSelect: 'none' }}>
                        <input
                          type="checkbox"
                          checked={(orientationTime as any)[key]}
                          onChange={(e) => setOrientationTime(prev => ({ ...prev, [key]: e.target.checked }))}
                          className="accent-indigo-600 cursor-pointer w-4 h-4 rounded"
                        />
                        <span className="capitalize">{key === 'date' ? "Today's Date" : key}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 2. Orientation to Place */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border-line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', background: 'var(--surface-subtle)', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-line)' }}>
                    <h4 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-heading)' }}>
                      2. Orientation to Place (Spatial)
                    </h4>
                    <span className="arch-badge">{placeScore} / 5 PTS</span>
                  </div>
                  <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                    {Object.keys(orientationPlace).map((key) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer text-sm" style={{ userSelect: 'none' }}>
                        <input
                          type="checkbox"
                          checked={(orientationPlace as any)[key]}
                          onChange={(e) => setOrientationPlace(prev => ({ ...prev, [key]: e.target.checked }))}
                          className="accent-indigo-600 cursor-pointer w-4 h-4 rounded"
                        />
                        <span className="capitalize">{key === 'building' ? 'Building Name' : key === 'floor' ? 'Floor/Room' : key}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 3. Registration */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border-line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', background: 'var(--surface-subtle)', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-line)' }}>
                    <div>
                      <h4 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-heading)' }}>
                        3. Registration / Immediate Auditory Recall
                      </h4>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Speak clearly at 1-sec intervals: "Apple", "Table", "Penny". Score 1st attempt.</p>
                    </div>
                    <span className="arch-badge">{regScore} / 3 PTS</span>
                  </div>
                  <div style={{ padding: '1rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    {Object.keys(registration).map((word) => (
                      <label key={word} className="flex items-center gap-2 cursor-pointer text-sm" style={{ userSelect: 'none' }}>
                        <input
                          type="checkbox"
                          checked={(registration as any)[word]}
                          onChange={(e) => setRegistration(prev => ({ ...prev, [word]: e.target.checked }))}
                          className="accent-indigo-600 cursor-pointer w-4 h-4 rounded"
                        />
                        <span className="capitalize">"{word}"</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 4. Attention and Calculation */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border-line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', background: 'var(--surface-subtle)', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-line)' }}>
                    <div>
                      <h4 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-heading)' }}>
                        4. Attention and Calculation
                      </h4>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Serial 7s from 100 (93, 86, 79, 72, 65) OR spell "WORLD" backwards (D-L-R-O-W).</p>
                    </div>
                    <span className="arch-badge">{attScore} / 5 PTS</span>
                  </div>
                  <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
                    {[1, 2, 3, 4, 5].map((stepNum) => {
                      const key = `step${stepNum}`;
                      return (
                        <button
                          key={stepNum}
                          onClick={() => setAttentionCalculation(prev => ({ ...prev, [key]: !(prev as any)[key] }))}
                          className={`cursor-pointer text-xs font-semibold py-2 px-1 border rounded-md transition-all ${
                            (attentionCalculation as any)[key] 
                              ? 'bg-indigo-50 border-indigo-400 text-indigo-700' 
                              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          Step {stepNum}
                          <span style={{ display: 'block', fontSize: '10px', fontWeight: 400, marginTop: '2px' }}>
                            {stepNum === 1 ? "93 / 'D'" : stepNum === 2 ? "86 / 'L'" : stepNum === 3 ? "79 / 'R'" : stepNum === 4 ? "72 / 'O'" : "65 / 'W'"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Delayed Recall */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border-line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', background: 'var(--surface-subtle)', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-line)' }}>
                    <div>
                      <h4 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-heading)' }}>
                        5. Delayed Cognitive Recall
                      </h4>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ask patient to recall the 3 words. No cues permitted. Highly sensitive domain!</p>
                    </div>
                    <span className="arch-badge" style={{ 
                      background: recallScore <= 1 ? 'var(--red-100)' : 'var(--green-100)',
                      color: recallScore <= 1 ? 'var(--red-700)' : 'var(--green-700)',
                      fontWeight: 700
                    }}>
                      {recallScore} / 3 PTS
                    </span>
                  </div>
                  <div style={{ padding: '1rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    {Object.keys(delayedRecall).map((word) => (
                      <label key={word} className="flex items-center gap-2 cursor-pointer text-sm" style={{ userSelect: 'none' }}>
                        <input
                          type="checkbox"
                          checked={(delayedRecall as any)[word]}
                          onChange={(e) => setDelayedRecall(prev => ({ ...prev, [word]: e.target.checked }))}
                          className="accent-indigo-600 cursor-pointer w-4 h-4 rounded"
                        />
                        <span className="capitalize">"{word}"</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 6. Language and Praxis */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border-line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', background: 'var(--surface-subtle)', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-line)' }}>
                    <div>
                      <h4 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-heading)' }}>
                        6. Language, Reading, and Visuoconstructural Praxis
                      </h4>
                      <label className="flex items-center gap-2 mt-1 cursor-pointer" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', userSelect: 'none' }}>
                        <input 
                          type="checkbox" 
                          checked={motorImpaired} 
                          onChange={(e) => setMotorImpaired(e.target.checked)} 
                          className="accent-slate-400 cursor-pointer w-3 h-3 rounded" 
                        />
                        Mark physical motor/praxis tasks as Untested (N/A) due to physical limitations (e.g., tremor). Score will be prorated.
                      </label>
                    </div>
                    <span className="arch-badge">{motorImpaired ? 'PRORATED' : `${langScore} / 9 PTS`}</span>
                  </div>
                  <div className="mmse-checkbox-grid" style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                    
                    <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={languagePraxis.namingPencil}
                        onChange={(e) => setLanguagePraxis(prev => ({ ...prev, namingPencil: e.target.checked }))}
                        className="accent-indigo-600 cursor-pointer w-4 h-4 rounded"
                      />
                      <span>Object Naming: Pencil (0-1)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={languagePraxis.namingWatch}
                        onChange={(e) => setLanguagePraxis(prev => ({ ...prev, namingWatch: e.target.checked }))}
                        className="accent-indigo-600 cursor-pointer w-4 h-4 rounded"
                      />
                      <span>Object Naming: Wristwatch (0-1)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={languagePraxis.repetition}
                        onChange={(e) => setLanguagePraxis(prev => ({ ...prev, repetition: e.target.checked }))}
                        className="accent-indigo-600 cursor-pointer w-4 h-4 rounded"
                      />
                      <span>Repetition: "No ifs, ands, or buts" (0-1)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={languagePraxis.reading}
                        onChange={(e) => setLanguagePraxis(prev => ({ ...prev, reading: e.target.checked }))}
                        className="accent-indigo-600 cursor-pointer w-4 h-4 rounded"
                      />
                      <span>Reading: Read & obey "CLOSE YOUR EYES" (0-1)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ userSelect: 'none', opacity: motorImpaired ? 0.5 : 1 }}>
                      <input
                        type="checkbox"
                        checked={languagePraxis.writing && !motorImpaired}
                        onChange={(e) => setLanguagePraxis(prev => ({ ...prev, writing: e.target.checked }))}
                        disabled={motorImpaired}
                        className="accent-indigo-600 cursor-pointer w-4 h-4 rounded"
                      />
                      <span>Writing: Complete spontaneous sentence (0-1)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ userSelect: 'none', opacity: motorImpaired ? 0.5 : 1 }}>
                      <input
                        type="checkbox"
                        checked={languagePraxis.copying && !motorImpaired}
                        onChange={(e) => setLanguagePraxis(prev => ({ ...prev, copying: e.target.checked }))}
                        disabled={motorImpaired}
                        className="accent-indigo-600 cursor-pointer w-4 h-4 rounded"
                      />
                      <span>Visuoconstructural: Intersecting pentagons (0-1)</span>
                    </label>

                    <div className="md:col-span-2 pt-2 border-t border-slate-100 space-y-2" style={{ opacity: motorImpaired ? 0.5 : 1 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>3-Stage Command ("Take in right hand, fold, place on floor")</span>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs" style={{ userSelect: 'none' }}>
                          <input
                            type="checkbox"
                            checked={languagePraxis.commandHand && !motorImpaired}
                            onChange={(e) => setLanguagePraxis(prev => ({ ...prev, commandHand: e.target.checked }))}
                            disabled={motorImpaired}
                            className="accent-indigo-600 cursor-pointer w-3.5 h-3.5 rounded"
                          />
                          <span>1. Take paper (0-1)</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs" style={{ userSelect: 'none' }}>
                          <input
                            type="checkbox"
                            checked={languagePraxis.commandFold && !motorImpaired}
                            onChange={(e) => setLanguagePraxis(prev => ({ ...prev, commandFold: e.target.checked }))}
                            disabled={motorImpaired}
                            className="accent-indigo-600 cursor-pointer w-3.5 h-3.5 rounded"
                          />
                          <span>2. Fold in half (0-1)</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs" style={{ userSelect: 'none' }}>
                          <input
                            type="checkbox"
                            checked={languagePraxis.commandFloor && !motorImpaired}
                            onChange={(e) => setLanguagePraxis(prev => ({ ...prev, commandFloor: e.target.checked }))}
                            disabled={motorImpaired}
                            className="accent-indigo-600 cursor-pointer w-3.5 h-3.5 rounded"
                          />
                          <span>3. Put on floor (0-1)</span>
                        </label>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </div>

            {/* RIGHT: Stratification & Actions Panel (5 Columns) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Score Results Card */}
              <div 
                className="stat-card flex flex-col items-center text-center p-6" 
                style={{ 
                  background: 'var(--surface)', 
                  border: '1px solid var(--border-line)',
                  borderRadius: 'var(--radius-xl)', 
                  boxShadow: 'var(--shadow-md)',
                  position: 'relative'
                }}
              >
                <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                  <button 
                    onClick={handleResetCalculator} 
                    className="cursor-pointer p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100 transition-colors"
                    title="Clear Calculator Answers"
                  >
                    <RotateCcw style={{ width: 16, height: 16 }} />
                  </button>
                </div>

                <span style={{ fontSize: 'var(--text-label)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Calculated Score
                </span>
                
                <div className="tabular-nums" style={{ fontSize: '4rem', fontWeight: 800, color: stratificationColor, lineHeight: 1 }}>
                  {calculatedTotal}
                  <span style={{ fontSize: '1.5rem', fontWeight: 500, color: 'var(--text-muted)' }}>/30</span>
                </div>

                <div 
                  style={{ 
                    marginTop: '0.75rem', 
                    padding: '0.25rem 1rem', 
                    borderRadius: 'var(--radius-full)', 
                    background: stratificationBg, 
                    border: `1px solid ${stratificationBorder}`,
                    color: stratificationColor,
                    fontWeight: 700,
                    fontSize: '0.9rem'
                  }}
                >
                  {clinicalStratification}
                </div>

                {/* Sub-score grid */}
                <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', margin: '1.5rem 0 0', fontSize: '11px', borderTop: '1px solid var(--border-line)', paddingTop: '1rem' }}>
                  <div style={{ padding: '0.25rem 0' }}>
                    <span style={{ display: 'block', color: 'var(--text-muted)' }}>Time</span>
                    <strong>{timeScore}/5</strong>
                  </div>
                  <div style={{ padding: '0.25rem 0' }}>
                    <span style={{ display: 'block', color: 'var(--text-muted)' }}>Place</span>
                    <strong>{placeScore}/5</strong>
                  </div>
                  <div style={{ padding: '0.25rem 0' }}>
                    <span style={{ display: 'block', color: 'var(--text-muted)' }}>Registration</span>
                    <strong>{regScore}/3</strong>
                  </div>
                  <div style={{ padding: '0.25rem 0', borderTop: '1px solid var(--surface-subtle)', paddingTop: '0.25rem' }}>
                    <span style={{ display: 'block', color: 'var(--text-muted)' }}>Attention</span>
                    <strong>{attScore}/5</strong>
                  </div>
                  <div style={{ padding: '0.25rem 0', borderTop: '1px solid var(--surface-subtle)', paddingTop: '0.25rem' }}>
                    <span style={{ display: 'block', color: 'var(--text-muted)' }}>Recall</span>
                    <strong style={{ color: recallScore <= 1 ? 'var(--semantic-red)' : 'inherit' }}>{recallScore}/3</strong>
                  </div>
                  <div style={{ padding: '0.25rem 0', borderTop: '1px solid var(--surface-subtle)', paddingTop: '0.25rem' }}>
                    <span style={{ display: 'block', color: 'var(--text-muted)' }}>Language</span>
                    <strong>{langScore}/9</strong>
                  </div>
                </div>
              </div>

              {/* Neurosymbolic Gateway Decisions */}
              <div 
                style={{ 
                  borderRadius: 'var(--radius-lg)', 
                  border: '1px solid',
                  background: triggerMriPipeline ? 'var(--semantic-amber-bg)' : 'var(--green-50)',
                  borderColor: triggerMriPipeline ? 'var(--semantic-amber)' : 'var(--semantic-green)',
                  padding: '1.25rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <BrainCircuit style={{ 
                    width: 20, 
                    height: 20, 
                    color: triggerMriPipeline ? 'var(--semantic-amber)' : 'var(--semantic-green)' 
                  }} />
                  <h4 style={{ 
                    fontWeight: 700, 
                    fontSize: '0.9rem',
                    color: triggerMriPipeline ? 'var(--amber-700)' : 'var(--green-700)'
                  }}>
                    Symbolic Gate Routing Decision
                  </h4>
                </div>

                <div className="space-y-3" style={{ fontSize: '0.875rem' }}>
                  <div className="flex justify-between" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>MCI Gate Triggered</span>
                    <strong style={{ color: triggerMriPipeline ? 'var(--semantic-amber)' : 'var(--semantic-green)' }}>
                      {triggerMriPipeline ? "TRUE (MRI Required)" : "FALSE (Imaging Optional)"}
                    </strong>
                  </div>
                  <div className="flex justify-between" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Delayed Recall Deficit</span>
                    <strong style={{ color: delayedRecallDeficit ? 'var(--semantic-red)' : 'var(--semantic-green)' }}>
                      {delayedRecallDeficit ? "YES (≤ 1 Word)" : "NO (Intact)"}
                    </strong>
                  </div>
                  <div className="flex justify-between" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Cognitive Compensation Risk</span>
                    <strong style={{ color: cognitiveCompensationSuspected ? 'var(--semantic-amber)' : 'var(--text-muted)' }}>
                      {cognitiveCompensationSuspected ? "HIGH SUSPICION" : "LOW"}
                    </strong>
                  </div>
                  <div className="flex justify-between" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Clinical Route Priority</span>
                    <span style={{ 
                      fontWeight: 700, 
                      color: priorityLevel === 'URGENT' ? 'var(--semantic-red)' : priorityLevel === 'MEDIUM' ? 'var(--semantic-amber)' : 'var(--semantic-green)'
                    }}>
                      {priorityLevel}
                    </span>
                  </div>

                  <div className="pt-2">
                    <strong style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.125rem' }}>
                      Clinical Decision Support Rationale
                    </strong>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-body)', lineHeight: 1.4 }}>
                      {clinicalRationale}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action: Send score to MRI Analysis */}
              <div className="space-y-3">
                <button
                  onClick={() => onApplyScore(calculatedTotal)}
                  className="btn-primary cursor-pointer active shadow-md"
                  style={{ width: '100%' }}
                >
                  Apply {calculatedTotal}/30 to MRI Pipeline
                  <ArrowRight style={{ width: 16, height: 16 }} />
                </button>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  Clicking will update the MMSE slider in the MRI Analysis tab with this calculated score.
                </p>
              </div>

              {/* Live JSON Payload Preview */}
              <div style={{ background: '#0F172A', borderRadius: 'var(--radius-lg)', padding: '1rem', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '11px', color: '#94A3B8', borderBottom: '1px solid #1E293B', paddingBottom: '0.5rem' }}>
                  <span className="flex items-center gap-1.5 font-mono">
                    <Terminal style={{ width: 12, height: 12, color: 'var(--primary)' }} />
                    SYMBOLIC_GATE_PAYLOAD.json
                  </span>
                  <span style={{ background: '#1E293B', color: '#60A5FA', padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase', fontSize: '9px', fontWeight: 700 }}>
                    Deterministic
                  </span>
                </div>
                <pre style={{ 
                  fontFamily: 'monospace', 
                  fontSize: '11px', 
                  color: '#34D399', 
                  overflowX: 'auto', 
                  maxHeight: '12rem',
                  lineHeight: 1.4
                }}>
                  {symbolicJson}
                </pre>
              </div>

            </div>

          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
             SUB-TAB: THEORETICAL FOUNDATIONS (PAGE 1)
             ───────────────────────────────────────────────────────────── */}
        {activeSubTab === 'foundations' && (
          <div className="animate-fade-in" style={{ maxWidth: '44rem', margin: '0 auto', padding: '1rem 0' }}>
            
            <article style={{ color: 'var(--text-body)', lineHeight: 1.7, fontSize: '0.95rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                <span className="arch-badge" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                  Thesis Chapter 3 Excerpt
                </span>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-heading)', marginTop: '0.5rem', letterSpacing: '-0.02em' }}>
                  System Architecture & Clinical Grounding
                </h2>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Section 3.1: Symbolic Layer Fundamentals
                </h3>
              </div>

              <section style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-heading)', borderBottom: '1px solid var(--border-line)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                  3.1 The Mini-Mental State Examination (MMSE) Instrument
                </h3>
                <p style={{ marginBottom: '1.25rem' }}>
                  The Mini-Mental State Examination (MMSE) is a 30-point validated clinical instrument used to quantitatively assess cognitive impairment. Within the context of this Neuro-Symbolic Clinical Decision Support System (CDSS), the MMSE serves as a deterministic heuristic gate to validate or challenge the high-dimensional feature representations extracted by the convolutional/vision-transformer layers from structural MRI data.
                </p>
                <p style={{ marginBottom: '1.5rem' }}>
                  Rather than acting as a homogenous linear scale, the MMSE evaluates five distinct neurocognitive domains. Dysfunction in specific domains maps directly to localized neurodegenerative patterns in Alzheimer’s Disease (AD) pathology:
                </p>

                <div className="space-y-4" style={{ pl: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div className="logo-icon shrink-0" style={{ background: 'var(--accent-surface)', padding: '0.35rem', borderRadius: '8px', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2rem', height: '2rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.85rem' }}>1</span>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text-heading)' }}>Orientation (10 Points):</strong>
                      <span style={{ display: 'block', fontSize: '0.9rem', marginTop: '0.125rem' }}>
                        Divided equally into Temporal (Year, Season, Month, Date, Day) and Spatial (State, Country, Town, Hospital, Floor) orientation. This domain relies heavily on the <strong>hippocampal-entorhinal network</strong>. Early-stage accumulation of tau neurofibrillary tangles in these regions manifests as spatial-temporal disorientation.
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div className="logo-icon shrink-0" style={{ background: 'var(--accent-surface)', padding: '0.35rem', borderRadius: '8px', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2rem', height: '2rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.85rem' }}>2</span>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text-heading)' }}>Registration / Immediate Recall (3 Points):</strong>
                      <span style={{ display: 'block', fontSize: '0.9rem', marginTop: '0.125rem' }}>
                        The immediate encoding of three distinct object names. This measures sensory memory and attention, mapping to primary auditory and frontal cortical networks. This metric is typically preserved in early-stage AD but degrades as the disease advances globally.
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div className="logo-icon shrink-0" style={{ background: 'var(--accent-surface)', padding: '0.35rem', borderRadius: '8px', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2rem', height: '2rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.85rem' }}>3</span>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text-heading)' }}>Attention and Calculation (5 Points):</strong>
                      <span style={{ display: 'block', fontSize: '0.9rem', marginTop: '0.125rem' }}>
                        Assessed via serial subtractions (Serial 7s) or reversing a five-letter word ("WORLD"). This metric tests working memory and executive processing, localized in the <strong>dorsolateral prefrontal cortex</strong>. It serves as a strong clinical indicator for vascular complications or frontotemporal involvement.
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div className="logo-icon shrink-0" style={{ background: 'var(--accent-surface)', padding: '0.35rem', borderRadius: '8px', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2rem', height: '2rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.85rem' }}>4</span>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text-heading)', borderBottom: '2px solid var(--indigo-300)' }}>Delayed Recall (3 Points):</strong>
                      <span style={{ display: 'block', fontSize: '0.9rem', marginTop: '0.25rem', fontWeight: 500, color: 'var(--slate-800)' }}>
                        The retrieval of the three registered objects after a brief cognitive distractor task. <strong>This is the single most sensitive psychometric predictor of early AD.</strong> Deficits here correlate directly with early <strong>CA1 hippocampal subfield atrophy</strong> and synaptic loss, rendering it a critical feature for our symbolic gate.
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div className="logo-icon shrink-0" style={{ background: 'var(--accent-surface)', padding: '0.35rem', borderRadius: '8px', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2rem', height: '2rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.85rem' }}>5</span>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text-heading)' }}>Language and Praxis (9 Points):</strong>
                      <span style={{ display: 'block', fontSize: '0.9rem', marginTop: '0.125rem' }}>
                        A multi-modal domain evaluating expressive speech (naming objects), receptive language (following a 3-step command), reading comprehension, writing syntax, and visuoconstructural praxis (copying intersecting pentagons). Visuoconstructural failure specifically indicates <strong>posterior cingulate cortex and parietal lobe</strong> degeneration.
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <section style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-heading)', borderBottom: '1px solid var(--border-line)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                  3.2 Clinical Stratification and the MCI Transition Zone
                </h3>
                <p style={{ marginBottom: '1.25rem' }}>
                  The system categorizes raw scores into established clinical brackets:
                </p>
                <div className="flex gap-4 mb-6" style={{ flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '120px', padding: '0.75rem', background: 'var(--green-50)', border: '1px solid var(--semantic-green)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--green-700)', fontWeight: 600 }}>COGNITIVELY NORMAL</span>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--semantic-green)' }}>24 – 30 PTS</strong>
                  </div>
                  <div style={{ flex: 1, minWidth: '120px', padding: '0.75rem', background: 'var(--semantic-amber-bg)', border: '1px solid var(--semantic-amber)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--amber-700)', fontWeight: 600 }}>MCI / EARLY DEMENTIA</span>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--semantic-amber)' }}>19 – 23 PTS</strong>
                  </div>
                  <div style={{ flex: 1, minWidth: '120px', padding: '0.75rem', background: 'var(--semantic-red-bg)', border: '1px solid var(--semantic-red)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--red-700)', fontWeight: 600 }}>MODERATE DEMENTIA</span>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--semantic-red)' }}>10 – 18 PTS</strong>
                  </div>
                  <div style={{ flex: 1, minWidth: '120px', padding: '0.75rem', background: 'var(--semantic-red-bg)', border: '1px solid var(--semantic-red)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--red-700)', fontWeight: 600 }}>SEVERE DEMENTIA</span>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--semantic-red)' }}>0 – 9 PTS</strong>
                  </div>
                </div>

                <h4 style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '1rem', marginBottom: '0.5rem' }}>
                  The Mild Cognitive Impairment (MCI) Boundary Problem
                </h4>
                <p style={{ marginBottom: '1.25rem' }}>
                  A primary justification for the Neuro-Symbolic architecture of this thesis is the high variance of MMSE performance within the <strong>[24, 27]</strong> transition zone. Highly educated individuals possessing significant brain behavioral reserve frequently leverage cognitive compensation mechanisms to bypass deficits in the <em>Delayed Recall</em> sub-score, achieving a false-positive "Normal" total score despite structural <strong>mesial temporal lobe atrophy</strong>.
                </p>
                <p style={{ marginBottom: '1.25rem' }}>
                  Conversely, individuals with lower educational backgrounds may score below 24 due to demographic bias rather than neurodegeneration. Therefore, this system implements an algorithmic cross-validation step: if an MMSE score drops below 27, or if a specific drop is observed in the <em>Delayed Recall</em> sub-domain, the system triggers a deep-learning analysis of structural MRI atrophy to verify the clinical status.
                </p>
              </section>

              {/* Research Callout Box */}
              <div className="info-box" style={{ background: 'var(--accent-surface)', border: '1px solid var(--accent-border)' }}>
                <Info style={{ color: 'var(--semantic-blue)', flexShrink: 0, width: 20, height: 20 }} />
                <div>
                  <h4 style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: '0.9rem' }}>Symbolic Reasoning Insight</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-body)', marginTop: '0.25rem', lineHeight: 1.5 }}>
                    By mapping individual domains rather than just aggregate values, the symbolic layer corrects for educational disparities and flags high-reserve patients who would otherwise pass standard cognitive screens. This forms the baseline clinical safety layer of the CDSS.
                  </p>
                </div>
              </div>
            </article>

          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
             SUB-TAB: PROTOCOLS & SCHEMA (PAGE 2)
             ───────────────────────────────────────────────────────────── */}
        {activeSubTab === 'protocols' && (
          <div className="animate-fade-in" style={{ maxWidth: '44rem', margin: '0 auto', padding: '1rem 0' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Clinical Protocol Manual */}
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-heading)', borderBottom: '1px solid var(--border-line)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                  Appendix A: Clinical Data Collection & Instrument Protocols
                </h3>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.75rem' }}>
                  Protocol A.1: MMSE Administration and Calculation Manual
                </h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-body)', marginBottom: '1rem', lineHeight: 1.6 }}>
                  This protocol defines the exact algorithmic scoring rules used to compile the 30-point integer vector passed to the Symbolic Pipeline of the CDSS.
                </p>

                {/* Academic ASCII Clinical scoring box */}
                <pre style={{
                  fontFamily: 'monospace',
                  background: 'var(--surface-subtle)',
                  padding: '1.25rem',
                  border: '1px solid var(--border-line)',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: '11px',
                  lineHeight: 1.4,
                  color: 'var(--slate-800)',
                  overflowX: 'auto'
                }}>
{`+----------------------------------------------------------------------------+
|                       MMSE CLINICAL SCORING PROTOCOL                       |
+----------------------------------------------------------------------------+

[ORIENTATION TO TIME] (Allow 1 attempt per question. Score 1 point per correct answer)
[ ] What is the current year?                                       (0-1)
[ ] What is the current season?                                     (0-1)
[ ] What is the current month?                                      (0-1)
[ ] What is today's date?                                           (0-1)
[ ] What is the day of the week?                                    (0-1)

[ORIENTATION TO PLACE] (Allow 1 attempt per question. Score 1 point per correct answer)
[ ] What country are we in?                                         (0-1)
[ ] What state/province/region are we in?                          (0-1)
[ ] What town/city are we in?                                       (0-1)
[ ] What is the name of this building/hospital?                     (0-1)
[ ] What floor/room number are we on?                               (0-1)

[REGISTRATION] (Speak words clearly at 1-second intervals. Score based on 1st trial)
[ ] Say: "Apple", "Table", "Penny". Ask patient to repeat them.
    Score 1 point per correct word repeated.                        (0-3)
    (Repeat up to 6 times until patient learns them, but do not score extra trials)

[ATTENTION AND CALCULATION] (Select either Subtraction or Reversal; score the best)
[ ] Ask patient to subtract 7 from 100, then 7 from that result, 
    up to 5 iterations (Stop at 93, 86, 79, 72, 65).
    Score 1 point per correct mathematical step.                    (0-5)
[ ] ALTERNATIVE: Spell the word "WORLD" backwards ("D-L-R-O-W").
    Score 1 point per letter in correct relative position.

[DELAYED RECALL] (Administer after the Attention task)
[ ] Ask the patient to recall the 3 words from the Registration task.
    Score 1 point per correct word recalled (No cues permitted).     (0-3)

[LANGUAGE AND PRAXIS] (Administer specific behavioral tests)
[ ] Naming: Show a wristwatch and a pencil. Ask patient to name them. (0-2)
[ ] Repetition: Ask patient to repeat: "No ifs, ands, or buts."      (0-1)
[ ] 3-Stage Command: Give a blank sheet of paper. Say: 
    "Take this paper in your right hand, fold it in half, and 
    put it on the floor." (Score 1 point per executed step)        (0-3)
[ ] Reading: Show a card stating "CLOSE YOUR EYES". 
    Score 1 point if patient reads it and performs the action.      (0-1)
[ ] Writing: Ask patient to write a spontaneous, complete sentence. 
    Must contain a subject, a verb, and make logical sense.         (0-1)
[ ] Copying (Praxis): Ask patient to copy intersecting pentagons.
    Score 1 point if all 10 angles are present and intersecting 
    lines form a distinct 4-sided polygon.                         (0-1)

[NOTE ON PHYSICAL IMPAIRMENT]
If the patient possesses physical/motor limitations (e.g., tremor, 
hemiparesis, severe arthritis) preventing execution of the 3-stage 
command, writing, or copying, these 5 items must be marked as 
"Untested". The total score will be calculated dynamically out of 25 
and mathematically prorated to a 30-point scale equivalent.

+----------------------------------------------------------------------------+
| TOTAL INTEGRAL MMSE SCORE:                                         / 30    |
+----------------------------------------------------------------------------+`}
                </pre>
              </div>

              {/* Data Engineering Pseudocode */}
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.75rem' }}>
                  Data Engineering Pseudocode Validation Gate
                </h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-body)', marginBottom: '1rem', lineHeight: 1.6 }}>
                  To ensure the integrity of human-entered MMSE scores within clinical databases like ADNI, the application layer of our software engineering architecture runs the following automated validation schema before parsing data to the neural network pipeline:
                </p>
                <div style={{ background: '#0F172A', borderRadius: 'var(--radius-lg)', padding: '1.25rem', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '11px', color: '#94A3B8', borderBottom: '1px solid #1E293B', paddingBottom: '0.5rem' }}>
                    <span className="font-mono flex items-center gap-1.5"><Terminal style={{ width: 12, height: 12, color: 'var(--primary)' }} /> validation_gate.py</span>
                    <span style={{ color: '#F59E0B', textTransform: 'uppercase', fontSize: '9px', fontWeight: 700 }}>Python 3.9+</span>
                  </div>
                  <pre style={{ 
                    fontFamily: 'monospace', 
                    fontSize: '11px', 
                    color: '#60A5FA', 
                    overflowX: 'auto', 
                    lineHeight: 1.5 
                  }}>
{`def validate_mmse_vector(score_dict):
    """
    Validates structural bounds and identifies programmatic anomalies 
    in raw clinical MMSE database inputs.
    """
    bounds = {
        "orientation_time": 5, "orientation_place": 5, "registration": 3,
        "attention_calculation": 5, "delayed_recall": 3, "language_praxis": 9
    }
  
    total_calculated = 0
    for domain, max_val in bounds.items():
        score = score_dict.get(domain)
        if score is None or not (0 <= score <= max_val):
            raise ValueError(f"Anomalous or missing data in domain: {domain}")
        total_calculated += score
    
    if total_calculated != score_dict.get("total_score"):
        raise AssertionError("Data Integrity Failure: Component sub-scores do not match total sum.")
    
    return True`}
                  </pre>
                </div>
              </div>



            </div>

          </div>
        )}

      </div>
    </div>
  );
};
