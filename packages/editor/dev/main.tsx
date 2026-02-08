import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { EditorShell } from '../src/components/EditorShell';
import { useEditorStore } from '../src/store';
import { buildSampleTemplate } from './sample-template';
import '../src/tokens.css';

// Load sample template into the store
useEditorStore.getState().setTemplate(buildSampleTemplate());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EditorShell />
  </StrictMode>,
);
