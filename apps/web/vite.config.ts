import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  base: '/interactive-vacations-chronicle/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@ivc/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
});
