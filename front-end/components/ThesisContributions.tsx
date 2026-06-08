import React, { useState } from 'react';
import {
  BookOpen, Layers, Network, Activity, Users, Cpu,
  ShieldAlert, MonitorSmartphone, Eye, ChevronDown, ChevronUp,
  GitBranch, BarChart2, Zap, Brain, FlaskConical, Lightbulb, ArrowRight
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────────────────────── */

interface ContribCardProps {
  icon: React.ReactNode;
  title: string;
  tag?: string;
  tagColor?: string;
  children: React.ReactNode;
}

const ContribCard: React.FC<ContribCardProps> = ({ icon, title, tag, tagColor = 'var(--primary)', children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="info-box flex flex-col gap-2"
      style={{ cursor: 'pointer', transition: 'box-shadow 0.2s' }}
      onClick={() => setOpen(o => !o)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1rem', color: 'var(--text-heading)', margin: 0 }}>
          {icon} {title}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          {tag && (
            <span style={{
              fontSize: '9px', fontWeight: 700, padding: '2px 6px',
              borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.08em',
              background: tagColor, color: 'white', whiteSpace: 'nowrap'
            }}>{tag}</span>
          )}
          {open ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
        </div>
      </div>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
        {(children as any).summary}
      </p>
      {open && (
        <div style={{
          marginTop: '0.5rem', paddingTop: '0.75rem',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.7
        }}>
          {(children as any).detail}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Model Comparison Table
───────────────────────────────────────────────────────────── */
const MODEL_ROWS = [
  { name: 'LightAlzNet (DWSConv+SE)', tag: 'Ours · Best', accent: true, role: 'Custom lightweight CNN — depthwise separable convs + SE attention, 0.63M params' },
  { name: 'TinyViT-5.4M (APHQ-ViT)', tag: 'Quantized', accent: false, role: 'Pure ViT; INT8 caused ~14% loss → fixed with Conv-only MSE quantization (68.9% size reduction, 0.22% F1 loss)' },
  { name: 'EfficientNet-B0', tag: 'Baseline', accent: false, role: 'Strong CNN baseline; used for ablation and INT8 benchmark' },
  { name: 'MobileNetV3-Small', tag: 'Lightweight', accent: false, role: 'Efficiency-focused CNN; edge-suitable but lower accuracy ceiling' },
  { name: 'GhostNetV2 (GELU Head)', tag: 'Efficient', accent: false, role: 'Cheap feature map duplication strategy; competitive parameter count' },
  { name: 'PlainCNN Baseline', tag: 'Sanity Check', accent: false, role: 'Simple CNN confirms framework necessity when complex models are compared' },
  { name: 'Soft Voting Ensemble', tag: 'All 5 Models', accent: false, role: 'All five models vote; achieves the highest MCI-F1 (55.74%), demonstrating best ambiguity handling' },
];

const ModelTable: React.FC = () => (
  <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', marginTop: '1rem' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
      <thead>
        <tr style={{ background: 'var(--accent-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
          <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-heading)', whiteSpace: 'nowrap' }}>Architecture</th>
          <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-heading)' }}>Role & Notes</th>
        </tr>
      </thead>
      <tbody>
        {MODEL_ROWS.map((m, i) => (
          <tr key={i} style={{
            borderBottom: i < MODEL_ROWS.length - 1 ? '1px solid var(--border-subtle)' : 'none',
            background: m.accent ? 'color-mix(in srgb, var(--primary) 5%, transparent)' : 'transparent'
          }}>
            <td style={{ padding: '0.6rem 1rem', whiteSpace: 'nowrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: m.accent ? 700 : 500, color: m.accent ? 'var(--primary)' : 'var(--text-heading)' }}>{m.name}</span>
                <span style={{
                  fontSize: '8px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px',
                  textTransform: 'uppercase', background: m.accent ? 'var(--primary)' : 'var(--border-subtle)',
                  color: m.accent ? 'white' : 'var(--text-secondary)'
                }}>{m.tag}</span>
              </div>
            </td>
            <td style={{ padding: '0.6rem 1rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{m.role}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   Timeline Step
───────────────────────────────────────────────────────────── */
interface StepProps { num: number; title: string; desc: string; done?: boolean; }
const Step: React.FC<StepProps> = ({ num, title, desc, done = true }) => (
  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
    <div style={{
      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.75rem', fontWeight: 700,
      background: done ? 'var(--primary)' : 'var(--border-subtle)',
      color: done ? 'white' : 'var(--text-muted)'
    }}>{num}</div>
    <div>
      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-heading)' }}>{title}</p>
      <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{desc}</p>
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   Main Component
───────────────────────────────────────────────────────────── */
const ThesisContributions: React.FC = () => {
  return (
    <div className="space-y-8 animate-fade-in-up" style={{ maxWidth: '64rem', margin: '0 auto', paddingBottom: 'var(--space-4xl)' }}>

      {/* ── Hero ── */}
      <div className="hero-section text-center">
        <h2 className="hero-title" style={{ textAlign: 'center' }}>
          Key Thesis <span style={{ color: 'var(--primary)' }}>Contributions</span>
        </h2>
        <p className="hero-subtitle" style={{ textAlign: 'center' }}>
          Core innovations, methodological decisions, and findings from our research in
          lightweight multimodal Alzheimer's detection — from 2.5D imaging through
          experimental post-quantization to the MMSE symbolic gate.
        </p>
      </div>

      {/* ── Contribution Cards Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>

        <ContribCard
          icon={<Layers style={{ color: 'var(--primary)' }} size={20} />}
          title='2.5D "Pseudo 3D" Input Representation'
          tag="Core Methodology"
          tagColor="var(--primary)"
        >
          {{
            summary: '7-channel input (5 axial + 2 coronal slices) — the sweet spot between weak 2D and computationally prohibitive full-3D volumetric models.',
            detail: (
              <>
                <p><strong>Why not pure 2D?</strong> Single-slice 2D models miss inter-slice structural context and over-fit to slice-level noise.</p>
                <p style={{ marginTop: '0.5rem' }}><strong>Why not full 3D?</strong> Full volumetric CNNs require GPU memory that is impractical for edge deployment and significantly increase training time.</p>
                <p style={{ marginTop: '0.5rem' }}><strong>Our solution:</strong> Carefully selected <em>5 frontal (axial)</em> and <em>2 coronal</em> slices to capture hippocampal atrophy patterns from orthogonal views, stacked into a 7-channel tensor. This gives the model spatial depth awareness at a fraction of the 3D compute cost.</p>
              </>
            )
          } as any}
        </ContribCard>

        <ContribCard
          icon={<Network style={{ color: 'var(--primary)' }} size={20} />}
          title="Lightweight Depthwise CNN (LightAlzNet)"
          tag="Novel Contribution"
          tagColor="#7c3aed"
        >
          {{
            summary: 'A custom lightweight CNN built with depthwise separable convolutions and squeeze-and-excitation attention, achieving the highest test Macro-F1 across all 5 evaluated models (49.81%) at only 0.63M parameters.',
            detail: (
              <>
                <p>LightAlzNet is a fully convolutional architecture designed for MRI-optimized efficiency: a 7-channel stem feeds into 6 DWSConvBlocks (32→64→128→128→256→256→512 channels), each combining depthwise separable convolution with a squeeze-and-excitation (SE) channel-attention gate and residual skip connection.</p>
                <p style={{ marginTop: '0.5rem' }}>The SE blocks learn to emphasize disease-relevant feature channels (e.g., hippocampal atrophy patterns) while suppressing noise — a lightweight alternative to self-attention that adds negligible parameters.</p>
                <p style={{ marginTop: '0.5rem' }}>At 0.63M parameters and ~8 ms inference on GPU, it achieves the best accuracy–efficiency tradeoff in the study, outperforming larger pretrained models including EfficientNet-B0 and TinyViT-5.4M.</p>
              </>
            )
          } as any}
        </ContribCard>

        <ContribCard
          icon={<Activity style={{ color: '#64748b' }} size={20} />}
          title="CNN Baseline as Thesis Justification"
          tag="Ablation"
          tagColor="#64748b"
        >
          {{
            summary: 'A PlainCNN baseline was trained and evaluated as a scientific control — its lower performance directly validates the need for our lightweight CNN framework.',
            detail: (
              <>
                <p>Without a rigorous baseline, the superiority of our lightweight CNN architecture would be an unsubstantiated claim. The PlainCNN served as a <em>sanity check and scientific anchor</em>.</p>
                <p style={{ marginTop: '0.5rem' }}>Its consistently lower F1 and accuracy scores across all 5 folds demonstrate that the performance gain in LightAlzNet is attributable to the architectural design choices, not data or training advantages.</p>
              </>
            )
          } as any}
        </ContribCard>

        <ContribCard
          icon={<ShieldAlert style={{ color: '#d97706' }} size={20} />}
          title='The MCI Trap — Identified & Addressed'
          tag="Key Finding"
          tagColor="#d97706"
        >
          {{
            summary: '"The MCI Trap": Mild Cognitive Impairment is radiologically indistinguishable from normal aging in 60–70% of cases — making 99% accuracy an impossible and misleading target.',
            detail: (
              <>
                <p>Anatomical features of early MCI (slight hippocampal atrophy, subtle cortical changes) can be visually identical to those of a healthy aging brain. Even experienced radiologists disagree in the majority of cases.</p>
                <p style={{ marginTop: '0.5rem' }}>Claiming 99% accuracy on this task is therefore statistically dishonest. Our thesis argues that the field must reframe success metrics and supplement image-only inference with symbolic clinical context.</p>
                <p style={{ marginTop: '0.5rem' }}><strong>Our response:</strong> The MMSE Symbolic Gate (see below) was designed specifically to navigate this ambiguity — combining the model's confidence score with the patient's cognitive assessment to produce a safer, more interpretable clinical signal.</p>
              </>
            )
          } as any}
        </ContribCard>

        <ContribCard
          icon={<GitBranch style={{ color: 'var(--primary)' }} size={20} />}
          title="5-Fold Cross Validation Training"
          tag="Training Protocol"
          tagColor="var(--primary)"
        >
          {{
            summary: 'All models trained using stratified 5-Fold CV — 80% training / 20% validation per fold, reshuffled 5× to ensure generalizable, bias-free models.',
            detail: (
              <>
                <p>Neuroimaging datasets are inherently small and class-imbalanced. A single train/test split would produce unreliable metrics and high variance estimates.</p>
                <p style={{ marginTop: '0.5rem' }}>Stratified 5-Fold CV ensures <em>every sample is used for both training and validation</em>, and that each fold preserves the class distribution. The final metric is averaged across all 5 folds, providing a statistically robust performance estimate with a standard deviation.</p>
                <p style={{ marginTop: '0.5rem' }}>This protocol is mandatory for any publishable result in clinical AI — it prevents the "lucky split" problem common in deep learning papers.</p>
              </>
            )
          } as any}
        </ContribCard>

        <ContribCard
          icon={<Users style={{ color: 'var(--primary)' }} size={20} />}
          title="Demographic Late Fusion"
          tag="Multimodal"
          tagColor="#0891b2"
        >
          {{
            summary: 'Age and sex are integrated via late fusion — image features are learned independently first, then ~10 fine-tuning epochs merge demographic metadata, preventing cross-modal contamination.',
            detail: (
              <>
                <p><strong>Why late fusion?</strong> Early fusion (concatenating demographics with image pixels at input) risks the model learning spurious correlations — e.g., associating certain ages with image noise patterns rather than true anatomical biomarkers.</p>
                <p style={{ marginTop: '0.5rem' }}>Late fusion preserves the independence of the visual representation. Only after the CNN backbone has converged are the demographic features concatenated at the classification head for a final set of fine-tuning rounds.</p>
                <p style={{ marginTop: '0.5rem' }}>This produced measurable accuracy gains while keeping the visual explanation (Grad-CAM) clean and clinically interpretable.</p>
              </>
            )
          } as any}
        </ContribCard>

        <ContribCard
          icon={<BarChart2 style={{ color: 'var(--primary)' }} size={20} />}
          title="Soft Voting Ensemble Learning"
          tag="Ensemble"
          tagColor="#059669"
        >
          {{
            summary: 'All 5 trained models vote together via soft probability averaging, achieving the highest MCI-F1 (55.74%) across any method — demonstrating that model diversity improves handling of the most diagnostically ambiguous class.',
            detail: (
              <>
                <p>Each model (LightAlzNet, TinyViT, EfficientNet, MobileNet, GhostNet) produces a class probability distribution. Soft voting averages these distributions before the argmax — preserving confidence calibration unlike hard majority voting.</p>
                <p style={{ marginTop: '0.5rem' }}>Because each architecture has different inductive biases (local vs. global, efficient vs. expressive), they make <em>uncorrelated errors</em> — exactly the condition under which ensemble gains are theoretically guaranteed.</p>
              </>
            )
          } as any}
        </ContribCard>

        <ContribCard
          icon={<Zap style={{ color: '#d97706' }} size={20} />}
          title="INT8 Post-Quantization & Selective Layer Fix"
          tag="Experimental ★"
          tagColor="#dc2626"
        >
          {{
            summary: 'Standard INT8 quantization worked well for CNN models but caused ~14% accuracy loss in TinyViT. We engineered an experimental selective-layer quantization strategy, reducing loss to <2%.',
            detail: (
              <>
                <p>Standard dynamic INT8 quantization collapses all weights to 8-bit integers, but TinyViT's attention-driven Linear layers are highly sensitive to this precision reduction.</p>
                <p style={{ marginTop: '0.5rem' }}><strong>The problem:</strong> Full INT8 quantization caused ~14% Macro-F1 degradation in TinyViT — an unacceptable regression for clinical deployment.</p>
                <p style={{ marginTop: '0.5rem' }}><strong>Our solution (APHQ-ViT):</strong> Applied INT8 quantization selectively to only the 11 nn.Conv2d layers (MSE per-channel weight + per-tensor activation calibration), keeping all 42 nn.Linear layers (attention Q/K/V/proj, FFN) in FP32. This reduced model size by 68.9% with only 0.22% F1 loss — making TinyViT deployment-viable for edge hardware.</p>
              </>
            )
          } as any}
        </ContribCard>

        <ContribCard
          icon={<Brain style={{ color: '#7c3aed' }} size={20} />}
          title="MMSE Symbolic Gate Integration"
          tag="Deployed ✓"
          tagColor="#7c3aed"
        >
          {{
            summary: 'A symbolic cognitive gate using the Mini-Mental State Examination (MMSE) score to guide model output — bridging the "MCI Trap" by adding clinical context the image model cannot see.',
            detail: (
              <>
                <p>The MMSE is a validated 30-point clinical instrument assessing orientation, memory, attention, language, and visuospatial function. Scores below 24 indicate probable cognitive impairment.</p>
                <p style={{ marginTop: '0.5rem' }}>Rather than training the MMSE jointly with images (which would risk data leakage), the gate operates as a <em>post-hoc symbolic adjudicator</em>: when the model's confidence is ambiguous (e.g., MCI boundary region), the MMSE score shifts the diagnosis recommendation, surfacing alerts the image alone cannot produce.</p>
                <p style={{ marginTop: '0.5rem' }}>A full clinical calculator with prorating logic for motor-impaired patients is available in the <strong>MMSE Cognitive Gate</strong> tab. Scores flow directly into the analysis pipeline.</p>
              </>
            )
          } as any}
        </ContribCard>

      </div>

      {/* ── Model Comparison Table ── */}
      <div className="info-box" style={{ marginTop: '1rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1rem', color: 'var(--text-heading)', margin: '0 0 0.25rem' }}>
          <FlaskConical style={{ color: 'var(--primary)' }} size={20} />
          Evaluated Model Zoo (6 Architectures + Ensemble)
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem' }}>
          All models trained from scratch on our 7-channel 2.5D dataset with 5-Fold CV and demographic late fusion.
          FP32 and INT8/APHQ-ViT weights are bundled with this prototype.
        </p>
        <ModelTable />
      </div>

      {/* ── Research Methodology Timeline ── */}
      <div className="info-box" style={{ marginTop: '1rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1rem', color: 'var(--text-heading)', margin: '0 0 1rem' }}>
          <BookOpen style={{ color: 'var(--primary)' }} size={20} />
          Research Timeline
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Step num={1} title="Dataset Preparation & 2.5D Slice Extraction" desc="Selected 7 optimal MRI slices per patient; preprocessed ADNI data into 7-channel tensors with demographic metadata." />
          <Step num={2} title="5-Fold CV Training — 6 Architectures" desc="Trained LightAlzNet, TinyViT, EfficientNet, MobileNet, GhostNet, and PlainCNN with stratified folds." />
          <Step num={3} title="Demographic Late Fusion Fine-Tuning" desc="~10 additional epochs per model to incorporate age and sex at the classification head." />
          <Step num={4} title="Ensemble & Benchmarking" desc="Soft voting ensemble evaluated; figures and metrics finalized for article and thesis report." />
          <Step num={5} title="INT8 Quantization + APHQ-ViT Fix" desc="Full INT8 baseline, identified ViT degradation (~14%), engineered selective Conv2d-only fix (0.22% loss)." />
          <Step num={6} title="MMSE Symbolic Gate — Design & Integration" desc="Built clinical MMSE calculator with prorating; integrated score flow into the Tauri+FastAPI pipeline." />
          <Step num={7} title="Desktop & Web Prototype Deployment" desc="This web prototype deployed; desktop application (Linux .deb + Windows .exe) is the next milestone." done={false} />
        </div>
      </div>

      {/* ── Vision Paper Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #312e81 0%, #1e40af 60%, #0e7490 100%)',
        borderRadius: 'var(--radius-xl)',
        padding: '2rem',
        marginTop: '1rem',
        color: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <Eye size={26} />
          <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem' }}>
            The Vision Paper: "Beyond the F1-Score"
          </h3>
          <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>Roadmap</span>
        </div>

        <p style={{ margin: '0 0 1rem', opacity: 0.9, fontSize: '0.9rem', lineHeight: 1.6 }}>
          <strong>Core Argument:</strong> Evaluating Alzheimer's AI purely on accuracy and F1-score is outdated and clinically dangerous.
          A model achieving 85% accuracy that cannot explain <em>why</em> it flagged a scan is less useful — and more dangerous — than a 78%-accurate model that can articulate its reasoning.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 'var(--radius-lg)', padding: '0.6rem 1rem', fontSize: '0.85rem', fontWeight: 600 }}>
            Discriminative AI<br /><span style={{ fontSize: '0.75rem', fontWeight: 400, opacity: 0.8 }}>"Is this Alzheimer's?"</span>
          </div>
          <ArrowRight size={20} style={{ opacity: 0.7 }} />
          <div style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 'var(--radius-lg)', padding: '0.6rem 1rem', fontSize: '0.85rem', fontWeight: 700, border: '1px solid rgba(255,255,255,0.4)' }}>
            Generative Clinical Reasoning<br /><span style={{ fontSize: '0.75rem', fontWeight: 400, opacity: 0.9 }}>"Why is this Alzheimer's?"</span>
          </div>
        </div>

        <h4 style={{ margin: '0 0 0.75rem', fontWeight: 700, fontSize: '0.95rem', opacity: 0.95, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MonitorSmartphone size={18} /> Cross-Platform Deployment & Future Work
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {[
            { icon: <MonitorSmartphone size={22} />, title: 'Desktop App', sub: 'Linux .deb + Windows .exe', note: 'Built with Tauri (Rust) + React frontend + Python sidecar — offline, no internet required' },
            { icon: <Cpu size={22} />, title: 'Mobile App', sub: 'Android .apk', note: 'Built with Kotlin Multiplatform + Compose — lightweight INT8 inference on device' },
            { icon: <Eye size={22} />, title: 'Vision-Language Models', sub: 'Future Work', note: 'Descriptive, conversational diagnostic AI — "Why does this MRI indicate AD?"' },
            { icon: <Network size={22} />, title: 'Agentic AI', sub: 'Future Work', note: 'Autonomous agents to manage multi-step clinical reasoning and follow-up' },
          ].map((item, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.12)', borderRadius: 'var(--radius-lg)',
              padding: '0.85rem 1rem', backdropFilter: 'blur(4px)'
            }}>
              <div style={{ marginBottom: '0.5rem', opacity: 0.9 }}>{item.icon}</div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{item.title}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.7, fontWeight: 600, marginBottom: '0.3rem' }}>{item.sub}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.85, lineHeight: 1.5 }}>{item.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Disclaimer ── */}
      <div style={{
        background: 'var(--accent-surface)', border: '1px solid var(--accent-border)',
        borderRadius: 'var(--radius-lg)', padding: '0.85rem 1.1rem',
        display: 'flex', gap: '0.6rem', alignItems: 'flex-start', marginTop: '0.5rem'
      }}>
        <Lightbulb size={16} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text-heading)' }}>Research Prototype Notice:</strong> All results and model outputs are for academic evaluation only.
          This system does not constitute a medical device and must not be used for clinical decision-making.
          Always consult a qualified neurologist or radiologist for diagnosis.
        </p>
      </div>

    </div>
  );
};

export default ThesisContributions;
