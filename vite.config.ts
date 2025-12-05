import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // 👇 must match your GitHub repo name
  base: '/neon-breaker/',

  // 👇 GitHub Pages will serve files from this folder
  build: {
    outDir: 'docs',
  },

  // Dev server settings (same as before)
  server: {
    port: 3000,
    host: '0.0.0.0',
  },

  plugins: [react()],

  // Keep your alias so imports like "@/components/..." still work
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
