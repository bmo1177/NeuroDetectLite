import React, { useState, useEffect } from 'react';
import './index.css';
import { Upload, Loader2, BrainCircuit, Activity, AlertCircle, FileText, Beaker, Zap, Shield, Key, Eye, EyeOff } from 'lucide-react';
import { AnalysisState, PredictionResult } from './types';
import { analyzeMRI } from './services/geminiService';
import ResultsDashboard from './components/ResultsDashboard';

const App: React.FC = () => {
  const [state, setState] = useState<AnalysisState>({
    status: 'idle',
    image: null,
    mmse: 25,
    result: null,
  });
  const [modelName, setModelName] = useState<string>('lightalznet');
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onloadend = () => {
        setState(prev => ({ ...prev, image: reader.result as string, status: 'idle', error: undefined }));
      };

      reader.readAsDataURL(file);
    }
  };

  const handleMmseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({ ...prev, mmse: parseInt(e.target.value) || 0 }));
  };

  const handleAnalyze = async () => {
    if (!state.image) return;

    setState(prev => ({ ...prev, status: 'analyzing', error: undefined }));

    try {
      const result = await analyzeMRI(state.image, state.mmse, undefined, modelName);
      setState(prev => ({ ...prev, status: 'complete', result }));
    } catch (error: any) {
      setState(prev => ({ ...prev, status: 'error', error: error.message }));
    }
  };

  const handleReset = () => {
    setState({ status: 'idle', image: null, mmse: 25, result: null });
  };

  const mmseColor = state.mmse < 24 ? 'amber' : 'green';
  const canAnalyze = !!state.image;

  return (
    <div className="page-bg flex flex-col min-h-screen font-sans" style={{ position: 'relative', zIndex: 1 }}>

      {/* ─── Navbar ─────────────────────────────────────────── */}
      <header className="navbar sticky top-0 z-50" style={{ position: 'sticky' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between" style={{ height: '4rem' }}>
          <div className="flex items-center gap-3">
            <div className="logo-icon">
              <BrainCircuit style={{ color: 'white', width: 24, height: 24 }} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--slate-900)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                NeuroDetect <span className="gradient-text">Lite</span>
              </h1>
              <p style={{ fontSize: '10px', color: 'var(--slate-500)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Research Prototype (MSc Thesis)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="sandbox-badge" style={{ display: 'none' }}>
              <Shield style={{ width: 14, height: 14 }} />
              Secure Research Sandbox
            </div>
            <div className="sandbox-badge">
              <Beaker style={{ width: 14, height: 14 }} />
              Research Sandbox
            </div>
            <div className="avatar-ring">RS</div>
          </div>
        </div>
      </header>

      {/* ─── Main Content ───────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>

        {/* Hero Section — shown when no results yet */}
        {!state.result && (
          <div className="hero-section animate-fade-in-up" style={{ textAlign: 'center', maxWidth: '48rem', margin: '0 auto 2.5rem' }}>
            <h2 className="hero-title">
              Lightweight Deep Learning for{' '}
              <span className="gradient-text">Alzheimer's Detection</span>
            </h2>
            <p className="hero-subtitle">
              An MSc thesis implementation evaluating <strong>Compact CNN + Vision Transformer (ViT)</strong> architectures.
              <br />
              Optimized for edge deployment (~15ms inference) using multimodal data (MRI + Clinical Scores).
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 h-full">

          {/* ─── Upload & Analysis State ─────────────────────── */}
          {state.status !== 'complete' && (
            <div className="upload-card animate-fade-in-up" style={{ maxWidth: '36rem', margin: '0 auto', width: '100%', animationDelay: '0.15s' }}>
              
              {/* Model Selection */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <BrainCircuit style={{ width: 16, height: 16, color: 'var(--indigo-500)', marginRight: '0.5rem' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--slate-700)' }}>
                    Architecture
                  </span>
                </label>
                <select 
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  aria-label="Select Model Architecture"
                  className="cursor-pointer"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    fontSize: '0.85rem',
                    border: '1px solid var(--slate-300)',
                    borderRadius: 'var(--radius-lg)',
                    outline: 'none',
                    background: 'var(--slate-50)',
                    color: 'var(--slate-800)',
                  }}
                >
                  <option value="lightalznet">LightAlzNet (Pruned 40% - Best F1)</option>
                  <option value="efficientnet">EfficientNet-B0 (Baseline)</option>
                  <option value="mobilenet">MobileNetV3-Small</option>
                  <option value="ensemble">Soft Voting Ensemble (All 3 Models)</option>
                </select>
              </div>

              {/* Dropzone */}
              <div className="dropzone" style={{ marginBottom: '1.5rem' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="dropzone-file cursor-pointer"
                  id="mri-upload"
                  aria-label="Upload T1-Weighted MRI scan"
                />

                {state.image ? (
                  <div className="image-preview">
                    <img src={state.image} alt="MRI Preview" />
                    <div style={{
                      position: 'absolute', top: '0.75rem', left: '0.75rem',
                      background: 'rgba(0,0,0,0.7)', color: 'white',
                      fontSize: '0.7rem', padding: '0.25rem 0.5rem',
                      borderRadius: 'var(--radius-sm)', backdropFilter: 'blur(4px)'
                    }}>
                      Input: T1-Weighted MRI
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '2rem 0' }}>
                    <div className="dropzone-icon animate-float">
                      <Upload style={{ width: 28, height: 28 }} />
                    </div>
                    <p style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--slate-700)' }}>
                      Upload T1-Weighted MRI
                    </p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--slate-400)', marginTop: '0.5rem' }}>
                      Accepted formats: DICOM (converted), PNG, JPG
                    </p>
                  </div>
                )}
              </div>

              {/* MMSE Input */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--slate-700)' }}>
                    MMSE Score (Multimodal Feature)
                  </span>
                  <span
                    className="tabular-nums"
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-full)',
                      background: mmseColor === 'amber' ? 'var(--amber-100)' : 'var(--green-100)',
                      color: mmseColor === 'amber' ? 'var(--amber-700)' : 'var(--green-700)',
                    }}
                  >
                    {state.mmse}/30
                  </span>
                </label>
                <div className="flex items-center gap-3">
                  <FileText style={{ width: 20, height: 20, color: 'var(--slate-400)', flexShrink: 0 }} />
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={state.mmse}
                    onChange={handleMmseChange}
                    className="w-full cursor-pointer hover:shadow-lg transition-shadow"
                    id="mmse-slider"
                    aria-label="Adjust MMSE Score"
                  />
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--slate-400)', marginTop: '0.25rem', paddingLeft: '2rem' }}>
                  &lt; 24 typically indicates cognitive impairment
                </p>
              </div>

              {/* Error */}
              {state.error && (
                <div className="error-box">
                  <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                  {state.error}
                </div>
              )}

              {/* Action Button */}
              <div style={{ marginTop: '1.5rem' }}>
                {state.status === 'analyzing' ? (
                  <button className="btn-primary loading" disabled id="analyze-btn">
                    <Loader2 className="animate-spin" style={{ width: 20, height: 20 }} />
                    Running PyTorch Inference...
                  </button>
                ) : (
                  <button
                    onClick={handleAnalyze}
                    disabled={!canAnalyze}
                    className={`btn-primary cursor-pointer ${canAnalyze ? 'active' : 'disabled'}`}
                    id="analyze-btn"
                    aria-label={canAnalyze ? "Run Model Inference" : "Upload MRI to enable analysis"}
                  >
                    <Activity style={{ width: 20, height: 20 }} />
                    Run Model Inference
                  </button>
                )}
                <p style={{ fontSize: '0.75rem', color: 'var(--indigo-500)', marginTop: '0.5rem', textAlign: 'center' }}>
                  🧪 Real inference running locally via FastAPI backend
                </p>
              </div>

              {/* Architecture Badges */}
              <div className="flex justify-center gap-4" style={{ marginTop: '1.5rem' }}>
                <span className="arch-badge">
                  <BrainCircuit style={{ width: 12, height: 12 }} /> Hybrid CNN-ViT
                </span>
                <span className="arch-badge">
                  <Zap style={{ width: 12, height: 12 }} /> &lt;20ms Edge
                </span>
              </div>
            </div>
          )}

          {/* ─── Results Dashboard ───────────────────────────── */}
          {state.status === 'complete' && state.result && state.image && (
            <div className="h-full animate-slide-in-bottom">
              <ResultsDashboard
                result={state.result}
                imageSrc={state.image}
                mmseScore={state.mmse}
                onReset={handleReset}
              />
            </div>
          )}
        </div>
      </main>

      {/* ─── Footer ─────────────────────────────────────────── */}
      <footer className="site-footer">
        <p>© 2026 MSc Thesis Project | Department of Computer Science</p>
        <p className="disclaimer">
          <strong>DISCLAIMER:</strong> This application is a research prototype evaluating lightweight deep learning architectures.
          The results are computer-generated simulations for academic demonstration purposes only and <strong>do not constitute a medical diagnosis</strong>.
          Always consult a qualified healthcare professional for medical advice.
        </p>
      </footer>
    </div>
  );
};

export default App;