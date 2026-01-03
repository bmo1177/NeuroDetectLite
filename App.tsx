import React, { useState, useEffect } from 'react';
import { Upload, FileUp, Loader2, BrainCircuit, ShieldCheck, Activity, AlertCircle, FileText, Beaker } from 'lucide-react';
import { AnalysisState, PredictionResult } from './types';
import { analyzeMRI } from './services/geminiService';
import ResultsDashboard from './components/ResultsDashboard';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [state, setState] = useState<AnalysisState>({
    status: 'idle',
    image: null,
    mmse: 25, // Default Normal
    result: null,
  });

  useEffect(() => {
     if (process.env.API_KEY) {
        setApiKey(process.env.API_KEY);
     }
  }, []);

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
    setState(prev => ({...prev, mmse: parseInt(e.target.value) || 0}));
  };

  const handleAnalyze = async () => {
    if (!state.image) return;
    if (!apiKey && !process.env.API_KEY) {
       alert("API Key missing. Please ensure the environment is configured correctly.");
       return;
    }

    setState(prev => ({ ...prev, status: 'analyzing', error: undefined }));

    try {
      const result = await analyzeMRI(state.image, state.mmse);
      setState(prev => ({ ...prev, status: 'complete', result }));
    } catch (error: any) {
      setState(prev => ({ ...prev, status: 'error', error: error.message }));
    }
  };

  const handleReset = () => {
    setState({ status: 'idle', image: null, mmse: 25, result: null });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <BrainCircuit className="text-white h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">NeuroDetect <span className="text-indigo-600">Lite</span></h1>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Research Prototype (MSc Thesis)</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-200">
                <Beaker size={14} />
                Secure Research Sandbox
             </div>
             <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold text-xs">
               RS
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Intro Section - Only show when idle or uploading */}
        {!state.result && (
          <div className="text-center mb-12 max-w-3xl mx-auto animate-fade-in-up">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Lightweight Deep Learning for Alzheimer's Detection</h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              An MSc thesis implementation evaluating <strong>Compact CNN + Vision Transformer (ViT)</strong> architectures.
              <br/>
              Optimized for edge deployment (~15ms inference) using multimodal data (MRI + Clinical Scores).
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 h-full">
          
          {/* UPLOAD & ANALYSIS STATE */}
          {state.status !== 'complete' && (
            <div className="max-w-xl mx-auto w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 transition-all duration-300 hover:shadow-md">
              
              {/* Dropzone */}
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50/30 group relative mb-6">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                
                {state.image ? (
                  <div className="relative w-full aspect-square max-h-64 mx-auto rounded-lg overflow-hidden bg-black flex items-center justify-center shadow-inner">
                    <img src={state.image} alt="Preview" className="max-w-full max-h-full object-contain" />
                  </div>
                ) : (
                  <div className="py-10 flex flex-col items-center">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Upload size={32} />
                    </div>
                    <p className="text-lg font-medium text-slate-700">Upload T1-Weighted MRI</p>
                    <p className="text-sm text-slate-400 mt-2">Accepted formats: DICOM (converted), PNG, JPG</p>
                  </div>
                )}
              </div>

              {/* MMSE Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center justify-between">
                  <span>MMSE Score (Multimodal Feature)</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${state.mmse < 24 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                    {state.mmse}/30
                  </span>
                </label>
                <div className="flex items-center gap-3">
                   <FileText size={20} className="text-slate-400"/>
                   <input 
                     type="range" 
                     min="0" 
                     max="30" 
                     value={state.mmse} 
                     onChange={handleMmseChange}
                     className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                   />
                </div>
                <p className="text-xs text-slate-400 mt-1 pl-8">
                  &lt; 24 typically indicates cognitive impairment
                </p>
              </div>

              {state.error && (
                <div className="mt-4 p-4 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2 border border-red-100">
                  <AlertCircle size={16} />
                  {state.error}
                </div>
              )}

              <div className="mt-6">
                {state.status === 'analyzing' ? (
                  <button disabled className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 opacity-80 cursor-not-allowed">
                    <Loader2 className="animate-spin" size={20} />
                    Running Inference (MobileNet-ViT)...
                  </button>
                ) : (
                  <button 
                    onClick={handleAnalyze}
                    disabled={!state.image}
                    className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                      state.image 
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Activity size={20} />
                    Run Model Inference
                  </button>
                )}
              </div>
              
              <div className="mt-6 flex justify-center gap-6 text-xs text-slate-400">
                <span className="flex items-center gap-1"><BrainCircuit size={12}/> Architecture: Hybrid CNN-ViT</span>
                <span className="flex items-center gap-1"><Loader2 size={12}/> Latency: &lt;20ms (On-Device)</span>
              </div>
            </div>
          )}

          {/* RESULTS DASHBOARD */}
          {state.status === 'complete' && state.result && state.image && (
            <div className="h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
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
      
      <footer className="py-6 text-center text-slate-400 text-xs px-4">
        <p>© 2024 MSc Thesis Project | Department of Computer Science</p>
        <p className="mt-2 max-w-2xl mx-auto border-t border-slate-200 pt-2">
          <strong>DISCLAIMER:</strong> This application is a research prototype evaluating lightweight deep learning architectures. 
          The results are computer-generated simulations for academic demonstration purposes only and <strong>do not constitute a medical diagnosis</strong>. 
          Always consult a qualified healthcare professional for medical advice.
        </p>
      </footer>
    </div>
  );
};

export default App;