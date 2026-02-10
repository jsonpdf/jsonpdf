import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'konva',
        'react-konva',
        'zustand',
        '@monaco-editor/react',
        'monaco-editor',
        /^@jsonpdf\//,
      ],
    },
    cssCodeSplit: false,
  },
});
