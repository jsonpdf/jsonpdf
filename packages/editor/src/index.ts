import './tokens.css';

// Main component
export { EditorShell } from './components/EditorShell';

// Store
export { useEditorStore } from './store';
export type { EditorState } from './store';

// Canvas (advanced usage)
export { TemplateCanvas, CANVAS_PADDING } from './canvas/TemplateCanvas';

// Layout utilities
export { computeDesignLayout } from './layout';
export type { DesignPage, DesignBand } from './layout';

// Code
export { CodeLayout } from './components/code/code-layout';
export { TemplateEditor } from './components/code/template-editor';
export type { TemplateEditorHandle } from './components/code/template-editor';

// Preview
export { PreviewLayout } from './components/preview/preview-layout';
export { PdfViewer } from './components/preview/pdf-viewer';
export { DataEditor } from './components/preview/data-editor';
export { usePdfPreview } from './hooks/use-pdf-preview';
export type { PdfPreviewState } from './hooks/use-pdf-preview';
