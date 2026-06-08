import React, { useState, useEffect } from 'react';
import './index.css';
import { Upload, Loader2, BrainCircuit, Activity, AlertCircle, FileText, Beaker, Zap, Shield, Key, Eye, EyeOff, Sparkles, Cpu } from 'lucide-react';
import { AnalysisState, PredictionResult } from './types';
import { analyzeMRI, isDemoMode } from './services/inferenceService';
import ResultsDashboard from './components/ResultsDashboard';
import { MmseCalculator } from './components/MmseCalculator';
import ThesisContributions from './components/ThesisContributions';
import { TauriLoadingOverlay } from './components/TauriLoadingOverlay';
import { useTauriBackend } from './services/useTauriBackend';

const IS_TAURI = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const App: React.FC = () => {
  const backend = useTauriBackend();
  const [state, setState] = useState<AnalysisState>({
    status: 'idle',
    image: null,
    mmse: 25,
    result: null,
  });
  const [modelName, setModelName] = useState<string>('lightalznet');
  const [activeTab, setActiveTab] = useState<'pipeline' | 'mmse' | 'thesis'>('pipeline');
  const [showBridgeAnimation, setShowBridgeAnimation] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [demoActive, setDemoActive] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 50 * 1024 * 1024; // 50MB limit to support large 3D volumetric NIfTI volumes
    if (file.size > maxSize) {
      setState(prev => ({ ...prev, error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 50MB.` }));
      e.target.value = '';
      return;
    }

    const isNifti = file.name.endsWith('.nii') || file.name.endsWith('.nii.gz');
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|gif|bmp|tiff|dcm|dicom)$/i.test(file.name);

    if (!isImage && !isNifti) {
      setState(prev => ({ ...prev, error: 'Invalid file type. Please upload a NIfTI scan (.nii, .nii.gz) or standard image (PNG, JPG, DICOM).' }));
      e.target.value = '';
      return;
    }

    setFileName(file.name);
    setSelectedFile(file);

    if (isNifti) {
      // For NIfTI volumes, skip base64 data conversion to avoid webview memory overflow
      setState(prev => ({ ...prev, image: 'nifti-placeholder', status: 'idle', error: undefined }));
    } else {
      const reader = new FileReader();
      reader.onloadend = () => {
        setState(prev => ({ ...prev, image: reader.result as string, status: 'idle', error: undefined }));
      };
      reader.onerror = () => {
        setState(prev => ({ ...prev, error: 'Failed to read file. The file may be corrupted.' }));
        setSelectedFile(null);
        e.target.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMmseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({ ...prev, mmse: parseInt(e.target.value) || 0 }));
  };

  const handleAnalyze = async () => {
    const inputData = selectedFile || state.image;
    if (!inputData) return;

    setState(prev => ({ ...prev, status: 'analyzing', error: undefined }));

    try {
      const result = await analyzeMRI(inputData, state.mmse, backend.port, modelName);
      setDemoActive(isDemoMode());
      setState(prev => ({ ...prev, status: 'complete', result }));
    } catch (error: any) {
      setState(prev => ({ ...prev, status: 'error', error: error.message }));
    }
  };

  const handleReset = () => {
    setState({ status: 'idle', image: null, mmse: 25, result: null });
    setFileName('');
    setSelectedFile(null);
  };

  const mmseColor = state.mmse < 24 ? 'amber' : 'green';
  const canAnalyze = !!state.image;

  return (
    <>
      {/* Tauri sidecar loading overlay — hidden once backend is ready */}
      <TauriLoadingOverlay backend={backend} />

    <div className="page-bg flex flex-col min-h-screen font-sans" style={{ position: 'relative', zIndex: 1 }}>

      {/* ─── Navbar ─────────────────────────────────────────── */}
      <header className="navbar sticky top-0 z-50" style={{ position: 'sticky' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between" style={{ height: '4rem' }}>
          <div className="flex items-center gap-3">
            <div className="logo-icon">
              <img src="/logo.png" alt="NeuroDetect Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'multiply' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-heading)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                NeuroDetect <span style={{ color: 'var(--primary)' }}>Lite</span>
              </h1>
              <p style={{ fontSize: 'var(--text-label)', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Master's-level Research Prototype
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-4" style={{ marginRight: 'auto', marginLeft: '2.5rem' }}>
            <button
              onClick={() => setActiveTab('pipeline')}
              className="cursor-pointer"
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: activeTab === 'pipeline' ? 'var(--primary)' : 'var(--text-secondary)',
                padding: '0.4rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                background: activeTab === 'pipeline' ? 'var(--accent-surface)' : 'transparent',
                border: '1px solid',
                borderColor: activeTab === 'pipeline' ? 'var(--accent-border)' : 'transparent',
                transition: 'all var(--transition-fast)',
              }}
              id="nav-pipeline-tab"
            >
              MRI Analysis Pipeline
            </button>
            <button
              onClick={() => setActiveTab('mmse')}
              className="cursor-pointer"
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: activeTab === 'mmse' ? 'var(--primary)' : 'var(--text-secondary)',
                padding: '0.4rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                background: activeTab === 'mmse' ? 'var(--accent-surface)' : 'transparent',
                border: '1px solid',
                borderColor: activeTab === 'mmse' ? 'var(--accent-border)' : 'transparent',
                transition: 'all var(--transition-fast)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
              id="nav-mmse-tab"
            >
              MMSE Cognitive Gate
              <span 
                style={{ 
                  fontSize: '9px', 
                  fontWeight: 700, 
                  background: 'var(--indigo-600)', 
                  color: 'white', 
                  padding: '1px 5px', 
                  borderRadius: '4px',
                  textTransform: 'uppercase'
                }}
              >
                Symbolic
              </span>
            </button>
            <button
              onClick={() => setActiveTab('thesis')}
              className="cursor-pointer"
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: activeTab === 'thesis' ? 'var(--primary)' : 'var(--text-secondary)',
                padding: '0.4rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                background: activeTab === 'thesis' ? 'var(--accent-surface)' : 'transparent',
                border: '1px solid',
                borderColor: activeTab === 'thesis' ? 'var(--accent-border)' : 'transparent',
                transition: 'all var(--transition-fast)',
              }}
              id="nav-thesis-tab"
            >
              Thesis Contributions
            </button>
          </nav>

          <div className="flex items-center gap-4">
            {false && (
              <div className="sandbox-badge">
                <Shield style={{ width: 14, height: 14 }} />
                Secure Research Sandbox
              </div>
            )}
            <div className="sandbox-badge">
              <Cpu style={{ width: 14, height: 14 }} />
              CPU-Only Edge Inference
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8" style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-4xl)' }}>

        {/* Hero Section */}
        {!state.result && activeTab === 'pipeline' && (
          <div className="hero-section animate-fade-in-up" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            maxWidth: '48rem',
            margin: '0 auto var(--space-3xl)'
          }}>
            <h2 className="hero-title" style={{ textAlign: 'center' }}>
              Lightweight Deep Learning for{' '}
              <span style={{ color: 'var(--primary)' }}>Alzheimer's Detection</span>
            </h2>
            <p className="hero-subtitle" style={{ textAlign: 'center' }}>
              Evaluating <strong>compact lightweight architectures</strong> — including CNNs, Vision Transformers, and ensembles — for edge-deployed Alzheimer's screening.
              <br />
              Optimized for edge deployment (~15ms inference) using multimodal data (MRI + Clinical Scores).
            </p>
          </div>
        )}

        {/* Demo Mode Banner */}
        {demoActive && activeTab === 'pipeline' && (
          <div style={{
            maxWidth: '48rem',
            margin: '0 auto var(--space-xl)',
            padding: '0.75rem 1.25rem',
            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.12), rgba(245, 158, 11, 0.08))',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.8rem',
            color: 'var(--amber-800)',
          }}>
            <Beaker style={{ width: 18, height: 18, flexShrink: 0, color: 'var(--amber-600)' }} />
            <div>
              <strong>Demo Mode</strong> — Backend unreachable. Results are simulated based on MMSE score and selected architecture. Connect to the FastAPI backend for real inference.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 h-full">

          {activeTab === 'pipeline' ? (
            <>
              {/* Upload and Analysis State */}
              {state.status !== 'complete' && (
                <div className="upload-card animate-fade-in-up" style={{ maxWidth: '36rem', margin: '0 auto', width: '100%', animationDelay: '0.15s' }}>

                  {/* Model Selection */}
                  <div style={{ marginBottom: 'var(--space-lg)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                      <BrainCircuit style={{ width: 16, height: 16, color: 'var(--primary)', marginRight: '0.5rem' }} />
                      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--slate-700)' }}>
                        Architecture
                      </span>
                    </label>
                    <select
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      disabled={state.status === 'analyzing'}
                      aria-label="Select Model Architecture"
                      className="cursor-pointer"
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem',
                        fontSize: 'var(--text-body)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-lg)',
                        outline: 'none',
                        background: 'var(--page-bg)',
                        color: 'var(--slate-800)',
                      }}
                    >
                      <option value="lightalznet">LightAlzNet (Pruned 40% - Best F1)</option>
                      <option value="efficientnet">EfficientNet-B0 (Baseline)</option>
                      <option value="mobilenet">MobileNetV3-Small</option>
                      <option value="ghostnet">GhostNetV2 (GELU Head)</option>
                      <option value="tinyvit">TinyViT-5.4M (Quantized APHQ-ViT)</option>
                      <option value="plaincnn">PlainCNN Baseline</option>
                      <option value="ensemble">Soft Voting Ensemble (All 5 Models)</option>
                    </select>
                  </div>

                  {/* Dropzone */}
                  <div className="dropzone" style={{ marginBottom: 'var(--space-lg)' }}>
                    <input
                      type="file"
                      accept={IS_TAURI ? undefined : "image/*,.nii,.nii.gz"}
                      onChange={handleFileChange}
                      disabled={state.status === 'analyzing'}
                      className="dropzone-file cursor-pointer"
                      id="mri-upload"
                      aria-label="Upload T1-Weighted MRI scan"
                    />

                    {state.image ? (
                      fileName.endsWith('.nii') || fileName.endsWith('.nii.gz') ? (
                        <div style={{
                          position: 'relative',
                          width: '100%',
                          aspectRatio: '16/9',
                          background: 'rgba(15, 23, 42, 0.95)',
                          borderRadius: 'var(--radius-lg)',
                          border: '1px solid var(--accent-border)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '1.5rem',
                          overflow: 'hidden',
                        }}>
                          {/* Pulse grid/scanline effect */}
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(to bottom, transparent 50%, rgba(99, 102, 241, 0.05) 50%)',
                            backgroundSize: '100% 4px',
                            opacity: 0.8,
                            pointerEvents: 'none'
                          }} />
                          <div style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            height: '2px',
                            background: 'linear-gradient(90deg, transparent, #6366f1, transparent)',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            animation: 'scan 3s ease-in-out infinite',
                            pointerEvents: 'none'
                          }} />
                          
                          <div className="animate-pulse" style={{
                            background: 'rgba(99, 102, 241, 0.1)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            padding: '1rem',
                            borderRadius: '50%',
                            marginBottom: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <BrainCircuit style={{ width: 36, height: 36, color: '#818cf8' }} />
                          </div>
                          
                          <p style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: '#f8fafc', textAlign: 'center', margin: 0 }}>
                            3D Volumetric NIfTI scan loaded
                          </p>
                          <p className="truncate" style={{ 
                            fontSize: '0.8rem', 
                            color: '#94a3b8', 
                            marginTop: '0.25rem',
                            maxWidth: '90%',
                            fontFamily: 'monospace',
                            textAlign: 'center'
                          }}>
                            {fileName}
                          </p>
                          
                          <div style={{
                            marginTop: '1rem',
                            display: 'flex',
                            gap: '0.5rem',
                            alignItems: 'center'
                          }}>
                            <span style={{
                              background: 'rgba(99, 102, 241, 0.2)',
                              color: '#a5b4fc',
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              padding: '0.15rem 0.5rem',
                              borderRadius: 'var(--radius-full)',
                              border: '1px solid rgba(99, 102, 241, 0.3)'
                            }}>
                              2.5D MULTI-SLICE INPUT
                            </span>
                            <span style={{
                              background: 'rgba(16, 185, 129, 0.2)',
                              color: '#6ee7b7',
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              padding: '0.15rem 0.5rem',
                              borderRadius: 'var(--radius-full)',
                              border: '1px solid rgba(16, 185, 129, 0.3)'
                            }}>
                              7-CHANNEL DATASET
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="image-preview">
                          <img src={state.image} alt="MRI Preview" />
                          <div style={{
                            position: 'absolute', top: '0.75rem', left: '0.75rem',
                            background: 'rgba(30, 41, 59, 0.9)', color: 'var(--page-bg)',
                            fontSize: '0.7rem', padding: '0.25rem 0.5rem',
                            borderRadius: 'var(--radius-sm)'
                          }}>
                            Input: T1-Weighted MRI
                          </div>
                        </div>
                      )
                    ) : (
                      <div style={{ padding: '2rem 0' }}>
                        <div className="dropzone-icon animate-float">
                          <Upload style={{ width: 28, height: 28 }} />
                        </div>
                        <p style={{ fontSize: 'var(--text-title)', fontWeight: 600, color: 'var(--slate-700)' }}>
                          Upload T1-Weighted MRI Scan
                        </p>
                        <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                          Accepted formats: .nii, .nii.gz (NIfTI 3D), PNG, JPG, DICOM
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Quick Load Sample Scans */}
                  <div style={{ marginBottom: 'var(--space-lg)' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)', textAlign: 'center' }}>
                      Or load a sample scan to test:
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                      {[
                        { file: 'sub-OAS30011_ses-d1671_T1w.nii.gz', label: 'AD Patient A', mmse: 22 },
                        { file: 'sub-OAS31469_sess-d0106_T1w.nii.gz', label: 'AD Patient B', mmse: 20 },
                        { file: 'sub-OAS30268_ses-d0096_run-01_T1w.nii.gz', label: 'AD Patient C', mmse: 18 },
                      ].map((sample) => (
                        <button
                          key={sample.file}
                          type="button"
                          disabled={state.status === 'analyzing'}
                          onClick={async () => {
                            try {
                              const resp = await fetch(`/sample-scans/${sample.file}`);
                              if (!resp.ok) throw new Error('Sample not found');
                              const blob = await resp.blob();
                              const file = new File([blob], sample.file, { type: 'application/gzip' });
                              setSelectedFile(file);
                              setFileName(sample.file);
                              setState(prev => ({ ...prev, image: 'nifti-placeholder', status: 'idle', error: undefined, mmse: sample.mmse }));
                            } catch (err) {
                              setState(prev => ({ ...prev, error: `Failed to load sample scan: ${sample.label}` }));
                            }
                          }}
                          className="cursor-pointer"
                          style={{
                            flex: '1 1 auto',
                            minWidth: '120px',
                            padding: '0.5rem 0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--primary)',
                            background: 'var(--accent-surface)',
                            border: '1px solid var(--accent-border)',
                            borderRadius: 'var(--radius-md)',
                            textAlign: 'center',
                            transition: 'all var(--transition-fast)',
                          }}
                        >
                          {sample.label}
                          <br />
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                            T1w NIfTI · MMSE {sample.mmse}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* MMSE Input */}
                  <div style={{ 
                    marginBottom: 'var(--space-xl)',
                    padding: showBridgeAnimation ? '1rem' : '0',
                    background: showBridgeAnimation ? 'var(--indigo-50)' : 'transparent',
                    borderRadius: 'var(--radius-lg)',
                    border: showBridgeAnimation ? '1px solid var(--indigo-200)' : '1px solid transparent',
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}>
                    {showBridgeAnimation && (
                      <div className="flex items-center gap-2 mb-3 text-indigo-700 font-semibold text-xs uppercase tracking-wider animate-pulse">
                        <Sparkles style={{ width: 14, height: 14 }} />
                        Symbolic State Configured Neural Parameters
                      </div>
                    )}
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
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
                      <FileText style={{ width: 20, height: 20, color: 'var(--text-muted)', flexShrink: 0 }} />
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-xs)', paddingLeft: 'var(--space-xl)' }}>
                      <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>
                        &lt; 24 typically indicates cognitive impairment
                      </span>
                      <button 
                        onClick={() => setActiveTab('mmse')}
                        className="cursor-pointer font-semibold"
                        style={{ 
                          fontSize: 'var(--text-caption)', 
                          color: 'var(--primary)', 
                          background: 'none',
                          padding: 0,
                          textDecoration: 'underline'
                        }}
                        type="button"
                      >
                        Open Clinical Calculator
                      </button>
                    </div>
                  </div>

                  {/* Error */}
                  {state.error && (
                    <div className="error-box" role="alert">
                      <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                      {state.error}
                    </div>
                  )}

                  {/* Action Button */}
                  <div style={{ marginTop: 'var(--space-xl)' }}>
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
                    <p style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.5rem', textAlign: 'center' }}>
                      {demoActive ? 'Demo mode — results are simulated' : 'Real inference running locally via FastAPI backend'}
                    </p>
                  </div>

                  {/* Architecture Badges */}
                  <div className="flex justify-center gap-4" style={{ marginTop: 'var(--space-lg)' }}>
                    <span className="arch-badge">
                      <BrainCircuit style={{ width: 12, height: 12 }} /> Lightweight 2.5D CNN
                    </span>
                    <span className="arch-badge">
                      <Zap style={{ width: 12, height: 12 }} /> &lt;20ms Edge
                    </span>
                  </div>
                </div>
              )}

              {/* Results Dashboard */}
              {state.status === 'complete' && state.result && state.image && (
                <div className="h-full animate-slide-in-bottom">
                  {demoActive && (
                    <div style={{
                      padding: '0.6rem 1rem',
                      background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.12), rgba(245, 158, 11, 0.08))',
                      border: '1px solid rgba(251, 191, 36, 0.3)',
                      borderRadius: 'var(--radius-lg)',
                      marginBottom: 'var(--space-md)',
                      fontSize: '0.78rem',
                      color: 'var(--amber-800)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}>
                      <Beaker style={{ width: 16, height: 16, flexShrink: 0 }} />
                      <strong>Demo Mode:</strong> Simulated results. Connect to the FastAPI backend for real inference.
                    </div>
                  )}
                  <ResultsDashboard
                    result={state.result}
                    imageSrc={state.image}
                    mmseScore={state.mmse}
                    onReset={handleReset}
                  />
                </div>
              )}
            </>
          ) : activeTab === 'mmse' ? (
            <MmseCalculator
              onApplyScore={(score) => {
                setState(prev => ({ ...prev, mmse: score }));
                setActiveTab('pipeline');
                setShowBridgeAnimation(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setTimeout(() => setShowBridgeAnimation(false), 3000);
              }}
              currentMmse={state.mmse}
            />
          ) : (
            <ThesisContributions />
          )}

        </div>
      </main>

      {/* ─── Footer ─────────────────────────────────────────── */}
      <footer className="site-footer">
        <p>© 2026 Master's Research Initiative | Department of Computer Science</p>
        <p className="disclaimer">
          <strong>DISCLAIMER:</strong> This application is a research prototype evaluating lightweight deep learning architectures.
          The results are computer-generated simulations for academic demonstration purposes only and <strong>do not constitute a medical diagnosis</strong>.
          Always consult a qualified healthcare professional for medical advice.
        </p>
      </footer>
    </div>
    </>
  );
};

export default App;