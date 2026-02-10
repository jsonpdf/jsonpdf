import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initBrowser } from '@jsonpdf/renderer';
import { EditorShell } from '../src/components/EditorShell';
import { useEditorStore } from '../src/store';
import { buildSampleTemplate } from './sample-template';
import '../src/tokens.css';

async function boot() {
  // Initialize WASM for browser-based PDF rendering (preview panel)
  try {
    const wasmUrl = new URL('@resvg/resvg-wasm/index_bg.wasm', import.meta.url);
    await initBrowser(fetch(wasmUrl));
  } catch (err) {
    console.warn('Failed to initialize resvg WASM — PDF preview may not work:', err);
  }

  // Load sample template into the store
  useEditorStore.getState().setTemplate(buildSampleTemplate());

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <EditorShell />
    </StrictMode>,
  );
}

void boot();
