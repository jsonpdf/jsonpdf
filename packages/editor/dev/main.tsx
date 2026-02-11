import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initBrowser } from '@jsonpdf/renderer';
import { EditorShell } from '../src/components/EditorShell';
import interFontUrl from '@fontsource/inter/files/inter-latin-400-normal.woff2?url';
import '../src/tokens.css';

async function boot() {
  // Initialize WASM for browser-based PDF rendering (preview panel)
  try {
    const wasmUrl = new URL('@resvg/resvg-wasm/index_bg.wasm', import.meta.url);
    const [fontResponse, wasmResponse] = await Promise.all([fetch(interFontUrl), fetch(wasmUrl)]);
    const fontBuffer = new Uint8Array(await fontResponse.arrayBuffer());
    await initBrowser(wasmResponse, [fontBuffer]);
  } catch (err) {
    console.warn('Failed to initialize resvg WASM — PDF preview may not work:', err);
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <EditorShell />
    </StrictMode>,
  );
}

void boot();
