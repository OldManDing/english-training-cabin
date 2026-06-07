import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, '/');
            if (normalizedId.includes('/node_modules/react') || normalizedId.includes('/node_modules/react-dom')) {
              return 'react';
            }
            if (normalizedId.includes('/node_modules/lucide-react')) {
              return 'icons';
            }
            if (normalizedId.includes('/node_modules/dexie')) {
              return 'storage';
            }
            if (normalizedId.endsWith('/src/questionBank.ts')) {
              return 'question-bank';
            }
            if (normalizedId.endsWith('/src/data.ts')) {
              return 'learning-data';
            }
            if (normalizedId.includes('/src/domain/diagnostic/')) {
              return 'diagnostic-core';
            }
          },
        },
      },
    },
  };
});
