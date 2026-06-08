/**
 * TauriLoadingOverlay.tsx
 * Full-screen loading overlay shown while the Python sidecar
 * (FastAPI + PyTorch models) is initialising on app startup.
 */

import React from 'react';
import { BrainCircuit, AlertCircle, Cpu } from 'lucide-react';
import { BackendState } from '../services/useTauriBackend';

interface Props {
  backend: BackendState;
}

export function TauriLoadingOverlay({ backend }: Props) {
  if (backend.status === 'ready') return null;

  const isError = backend.status === 'error';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)',
      color: '#f8fafc',
      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
      gap: '2.5rem',
      padding: '2rem',
    }}>
      {/* Background visual accents */}
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, transparent 70%)',
        top: '20%',
        left: '30%',
        filter: 'blur(40px)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        width: '450px',
        height: '450px',
        background: 'radial-gradient(circle, rgba(124, 58, 237, 0.08) 0%, transparent 70%)',
        bottom: '20%',
        right: '25%',
        filter: 'blur(50px)',
        pointerEvents: 'none',
      }} />

      {/* Main Container */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        maxWidth: '480px',
        width: '100%',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Logo / Brand Emblem */}
        <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
          {/* Pulsing ring */}
          {!isError && (
            <div style={{
              position: 'absolute',
              inset: -8,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(124,58,237,0.2))',
              filter: 'blur(8px)',
              animation: 'pulse-ring 2s infinite ease-in-out',
            }} />
          )}
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '24px',
            background: isError 
              ? 'linear-gradient(135deg, #ef4444, #b91c1c)' 
              : 'linear-gradient(135deg, #2563eb, #7c3aed)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            boxShadow: isError 
              ? '0 10px 30px rgba(239, 68, 68, 0.3)' 
              : '0 10px 30px rgba(37, 99, 235, 0.3)',
            border: '1px solid rgba(255,255,255,0.1)',
            transform: 'rotate(-5deg)',
          }}>
            {isError ? (
              <AlertCircle style={{ width: 40, height: 40, color: '#ffffff' }} />
            ) : (
              <BrainCircuit style={{ width: 42, height: 42, color: '#ffffff', animation: 'float 3s infinite ease-in-out' }} />
            )}
          </div>
        </div>

        <h1 style={{
          fontSize: '2rem',
          fontWeight: 800,
          margin: 0,
          letterSpacing: '-0.03em',
          background: 'linear-gradient(to right, #ffffff, #cbd5e1)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          NeuroDetect Lite
        </h1>
        <p style={{
          fontSize: '0.875rem',
          color: '#64748b',
          marginTop: '0.4rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
        }}>
          Alzheimer&apos;s MRI Analysis Pipeline
        </p>

        {/* Dynamic Section (Loading state or Error state) */}
        <div style={{ width: '100%', marginTop: '3rem' }}>
          {isError ? (
            <div style={{
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.15)',
              borderRadius: '16px',
              padding: '1.5rem',
              backdropFilter: 'blur(8px)',
            }}>
              <p style={{ color: '#fca5a5', fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.6, margin: 0 }}>
                {backend.message}
              </p>
              <p style={{ color: '#94a3b8', fontSize: '0.825rem', marginTop: '0.75rem', lineHeight: 1.5 }}>
                Try restarting the application. If the problem persists, ensure the models directory is intact in the application package resources.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.75rem' }}>
              {/* Elegant dynamic progress track */}
              <div style={{
                width: '100%',
                maxWidth: '320px',
                height: '4px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '999px',
                overflow: 'hidden',
                position: 'relative',
              }}>
                <div style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #2563eb, #7c3aed)',
                  borderRadius: '999px',
                  animation: 'pulse-bar 2.2s ease-in-out infinite',
                  width: '50%',
                }} />
              </div>

              {/* Status Message */}
              <div style={{ minHeight: '3.5rem' }}>
                <p style={{
                  fontSize: '0.95rem',
                  color: '#cbd5e1',
                  margin: 0,
                  lineHeight: 1.6,
                  fontWeight: 500,
                  animation: 'pulse-text 2s infinite ease-in-out',
                }}>
                  {backend.message}
                </p>
              </div>

              {/* CPU badges / details */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '999px',
                padding: '0.4rem 1rem',
                marginTop: '1rem',
              }}>
                <Cpu style={{ width: 14, height: 14, color: '#3b82f6' }} />
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>
                  CPU-ONLY EDGE INFERENCE • OFFLINE ACTIVE
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global CSS Inject */}
      <style>{`
        @keyframes pulse-ring {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-4px) rotate(3deg); }
        }
        @keyframes pulse-bar {
          0%   { transform: translateX(-120%); }
          50%  { transform: translateX(100%); }
          100% { transform: translateX(250%); }
        }
        @keyframes pulse-text {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
