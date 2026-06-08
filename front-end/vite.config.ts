import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // In Tauri production the frontend talks directly to localhost:8000
  // In dev mode (browser or tauri dev) we proxy through Vite
  const isTauriBuild = process.env.TAURI_ENV_TARGET_TRIPLE !== undefined;

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        }
      }
    },
    // In Tauri production, the frontend is loaded from the filesystem,
    // so relative paths are required
    base: isTauriBuild ? './' : '/',
    plugins: [react()],
    define: {
      // Expose whether we are in a Tauri build to the frontend
      '__IS_TAURI__': JSON.stringify(isTauriBuild),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      // Tauri uses ES modules
      target: ['es2021', 'chrome100', 'safari13'],
      // Don't minify source maps in CI for easier debugging
      sourcemap: false,
      // Output all assets alongside index.html for Tauri
      assetsDir: 'assets',
    },
    // Prevent Vite from obscuring Rust errors
    clearScreen: false,
    envPrefix: ['VITE_', 'TAURI_'],
  };
});
