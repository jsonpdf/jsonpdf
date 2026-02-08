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
