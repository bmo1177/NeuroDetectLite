/**
 * useTauriBackend.ts
 * Listens for backend-ready / backend-error / backend-loading events
 * emitted by the Rust sidecar manager in lib.rs.
 *
 * In a web browser (no Tauri) the hook immediately reports ready=true
 * so the app works identically in both environments.
 */

import { useEffect, useState } from 'react';

export type BackendStatus = 'initializing' | 'loading' | 'ready' | 'error';

export interface BackendState {
  status: BackendStatus;
  message: string;
  port: number;
}

// Detect if we are running inside a Tauri WebView
const IS_TAURI = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export function useTauriBackend(): BackendState {
  const [state, setState] = useState<BackendState>({
    status: IS_TAURI ? 'initializing' : 'ready',
    message: IS_TAURI ? 'Starting NeuroDetect AI engine…' : 'Ready',
    port: 8000,
  });

  useEffect(() => {
    if (!IS_TAURI) return; // In browser mode, skip — backend assumed running

    let unlistenReady: (() => void) | undefined;
    let unlistenError: (() => void) | undefined;
    let unlistenLoading: (() => void) | undefined;

    const setupListeners = async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');

        unlistenReady = await listen<{ port: number }>('backend-ready', (event) => {
          setState({ status: 'ready', message: 'AI engine ready', port: event.payload.port });
        });

        unlistenError = await listen<{ error: string }>('backend-error', (event) => {
          setState((prev) => ({
            ...prev,
            status: 'error',
            message: event.payload.error,
          }));
        });

        unlistenLoading = await listen<{ message: string }>('backend-loading', (event) => {
          setState((prev) => ({
            ...prev,
            status: 'loading',
            message: event.payload.message,
          }));
        });

        // Also probe the current status (in case events already fired before listeners attached)
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const status = await invoke<{ ready: boolean; port: number }>('get_backend_status');
          if (status.ready) {
            setState({ status: 'ready', message: 'AI engine ready', port: status.port });
          }
        } catch {
          // Command not available yet — wait for events
        }
      } catch (err) {
        console.warn('[useTauriBackend] Could not set up Tauri listeners:', err);
        // Fallback: assume ready after 3s
        setTimeout(() => setState({ status: 'ready', message: 'Ready', port: 8000 }), 3000);
      }
    };

    setupListeners();

    return () => {
      unlistenReady?.();
      unlistenError?.();
      unlistenLoading?.();
    };
  }, []);

  return state;
}
