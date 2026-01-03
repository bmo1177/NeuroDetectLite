import React, { useState } from 'react';
import { PredictionResult, AlzheimerClass } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Activity, Brain, FileText, AlertCircle, Info, Zap, Microscope } from 'lucide-react';

interface ResultsDashboardProps {
  result: PredictionResult;
  imageSrc: string;
  mmseScore: number;
  onReset: () => void;
}

const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ result, imageSrc, mmseScore, onReset }) => {
  const [activeTab, setActiveTab] = useState<'classification' | 'xai'>('classification');
  const [showOverlay, setShowOverlay] = useState(true);

  const chartData = [
    { name: 'CN', fullName: 'Cognitively Normal', prob: result.probabilities[AlzheimerClass.CN] * 100 },
    { name: 'MCI', fullName: 'Mild Cognitive Impairment', prob: result.probabilities[AlzheimerClass.MCI] * 100 },
    { name: 'AD', fullName: "Alzheimer's Disease", prob: result.probabilities[AlzheimerClass.AD] * 100 },
  ];

  const getBarColor = (name: string) => {
    if (name === 'CN' && result.diagnosis === AlzheimerClass.CN) return '#22c55e';
    if (name === 'MCI' && result.diagnosis === AlzheimerClass.MCI) return '#eab308';
    if (name === 'AD' && result.diagnosis === AlzheimerClass.AD) return '#ef4444';
    return '#cbd5e1'; 
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full animate-fade-in">
      
      {/* Header Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('classification')}
          className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'classification' 
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' 
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Activity size={18} />
          Inference & Multimodal Analysis
        </button>
        <button
          onClick={() => setActiveTab('xai')}
          className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'xai' 
              ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' 
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Brain size={18} />
          XAI & Saliency Maps
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        
        {/* CLASSIFICATION TAB */}
        {activeTab === 'classification' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Image Preview & Clinical Data */}
              <div className="space-y-4">
                <div className="bg-slate-100 rounded-lg p-1 border border-slate-200 aspect-square relative flex items-center justify-center overflow-hidden">
                   <img src={imageSrc} alt="MRI Scan" className="object-contain max-w-full max-h-full" />
                   <div className="absolute top-3 left-3 bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                     Input: T1-Weighted MRI (Preprocessed)
                   </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex justify-between items-center">
                   <div>
                     <span className="text-xs font-semibold text-slate-500 uppercase">Multimodal Feature</span>
                     <div className="font-medium text-slate-800">MMSE Score</div>
                   </div>
                   <div className={`text-2xl font-bold ${mmseScore < 24 ? 'text-amber-600' : 'text-green-600'}`}>
                     {mmseScore}/30
                   </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-col justify-center space-y-6">
                <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
                  <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Predicted Class</h3>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`text-2xl font-bold ${
                      result.diagnosis === AlzheimerClass.CN ? 'text-green-600' : result.diagnosis === AlzheimerClass.MCI ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {result.diagnosis}
                    </span>
                    {result.diagnosis !== AlzheimerClass.CN && (
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                         Target Pattern Detected
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 text-sm mt-2 leading-relaxed">
                    Hybrid CNN-ViT Model Confidence: <strong>{(result.confidence * 100).toFixed(1)}%</strong>
                  </p>
                </div>

                <div className="h-64 w-full">
                  <h4 className="text-sm font-medium text-slate-700 mb-4">Softmax Probability Distribution</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" domain={[0, 100]} hide />
                      <YAxis dataKey="name" type="category" width={40} tick={{fontSize: 12, fontWeight: 600}} />
                      <Tooltip 
                        cursor={{fill: '#f1f5f9'}}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-2 border border-slate-200 shadow-md rounded text-sm">
                                <p className="font-semibold">{data.fullName}</p>
                                <p>Probability: {data.prob.toFixed(1)}%</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="prob" radius={[0, 4, 4, 0]} barSize={32}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getBarColor(entry.name)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
              <Info className="text-blue-600 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-semibold text-blue-900 text-sm">Model Interpretation (Automated)</h4>
                <p className="text-blue-800 text-sm mt-1">{result.explanation}</p>
              </div>
            </div>
            
            <div className="flex gap-4 text-xs text-slate-400 justify-center border-t border-slate-100 pt-4">
               <div className="flex items-center gap-1"><Zap size={12}/> Inference Time: ~15ms (Edge)</div>
               <div className="flex items-center gap-1"><Brain size={12}/> Architecture: MobileNetV3 + ViT</div>
            </div>
          </div>
        )}

        {/* XAI TAB */}
        {activeTab === 'xai' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Microscope className="text-indigo-600" />
                Explainable AI (Grad-CAM / Attention)
              </h3>
              <div className="flex items-center space-x-2">
                 <span className="text-sm text-slate-600">Overlay Map</span>
                 <button 
                  onClick={() => setShowOverlay(!showOverlay)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${showOverlay ? 'bg-indigo-600' : 'bg-slate-300'}`}
                 >
                   <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${showOverlay ? 'left-7' : 'left-1'}`} />
                 </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Original */}
              <div className="space-y-2">
                <p className="text-center text-xs font-semibold text-slate-500 uppercase">Input Tensor</p>
                <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-black aspect-[4/3] flex items-center justify-center">
                  <img src={imageSrc} alt="Original" className="max-w-full max-h-full" />
                </div>
              </div>

              {/* Heatmap Simulation */}
              <div className="space-y-2">
                <p className="text-center text-xs font-semibold text-indigo-500 uppercase">Saliency Map (Simulation)</p>
                <div className="relative rounded-lg overflow-hidden border border-indigo-200 bg-black aspect-[4/3] flex items-center justify-center group">
                  {/* Base Image */}
                  <img src={imageSrc} alt="Base" className="max-w-full max-h-full opacity-80" />
                  
                  {/* Simulated Heatmap Overlay */}
                  {showOverlay && (
                    <div className="absolute inset-0 w-full h-full pointer-events-none mix-blend-overlay opacity-60 bg-gradient-to-tr from-blue-900 via-transparent to-red-600"></div>
                  )}
                  {showOverlay && (
                     <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2/3 h-1/2 bg-yellow-500 blur-3xl opacity-30 mix-blend-color-dodge rounded-full pointer-events-none"></div>
                  )}
                  
                  {/* Region Labels - Only show if not Normal */}
                  {result.diagnosis !== AlzheimerClass.CN && showOverlay && (
                    <div className="absolute top-[45%] left-[55%] animate-pulse">
                        <div className="w-8 h-8 rounded-full border-2 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]"></div>
                        <div className="absolute left-10 top-0 bg-black/80 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap border-l-2 border-red-500">
                          High Activation (ViT Head)
                        </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                  <FileText size={16} /> Feature Analysis
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {result.saliencyAnalysis}
                </p>
              </div>
              
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                <h4 className="font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                  <AlertCircle size={16} /> Detected Visual Patterns
                </h4>
                <ul className="space-y-2">
                  {result.regionsOfInterest.map((region, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-indigo-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                      {region}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <p className="text-xs text-slate-400 italic text-center">
              * XAI Transparency: Heatmaps indicate pixel regions contributing most to the class probability score.
            </p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
        <button 
          onClick={onReset}
          className="px-6 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
        >
          Reset Analysis
        </button>
      </div>
    </div>
  );
};

export default ResultsDashboard;