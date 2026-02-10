import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../../src/store';
import { createTemplate, addSection, addBand, addElement } from '@jsonpdf/template';

function resetStore() {
  // Set _isUndoRedoInProgress first so the template reset doesn't get captured
  useEditorStore.setState({ _isUndoRedoInProgress: true });
  useEditorStore.setState({
    template: createTemplate(),
    zoom: 1.0,
    scrollX: 0,
    scrollY: 0,
    selectedElementIds: [],
    selectedBandId: null,
    selectedSectionId: null,
    clipboard: null,
    activeTab: 'editor',
    _undoStack: [],
    _redoStack: [],
  });
  useEditorStore.setState({ _isUndoRedoInProgress: false });
}

function setupWithElement() {
  let t = createTemplate();
  t = addSection(t, { id: 'sec1', bands: [] });
  t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
  t = addElement(t, 'band1', {
    id: 'el1',
    type: 'text',
    x: 10,
    y: 20,
    width: 100,
    height: 50,
    properties: { content: 'test' },
  });
  useEditorStore.getState().setTemplate(t);
  // Clear the undo entry from setTemplate so we start clean
  useEditorStore.setState({ _undoStack: [], _redoStack: [] });
}

describe('temporal middleware', () => {
  beforeEach(() => {
    resetStore();
  });

  it('starts with empty stacks', () => {
    const state = useEditorStore.getState();
    expect(state._undoStack).toEqual([]);
    expect(state._redoStack).toEqual([]);
    expect(state.canUndo()).toBe(false);
    expect(state.canRedo()).toBe(false);
  });

  it('pushes to undo stack when template changes', () => {
    setupWithElement();
    const before = useEditorStore.getState().template;

    useEditorStore.getState().updateElementPosition('el1', 99, 99);

    const state = useEditorStore.getState();
    expect(state._undoStack).toHaveLength(1);
    expect(state._undoStack[0]).toBe(before);
    expect(state.canUndo()).toBe(true);
    expect(state._redoStack).toHaveLength(0);
  });

  it('undo restores previous template', () => {
    setupWithElement();
    const original = useEditorStore.getState().template;

    useEditorStore.getState().updateElementPosition('el1', 99, 99);
    useEditorStore.getState().undo();

    expect(useEditorStore.getState().template).toBe(original);
    expect(useEditorStore.getState().canUndo()).toBe(false);
  });

  it('undo pushes to redo stack', () => {
    setupWithElement();

    useEditorStore.getState().updateElementPosition('el1', 99, 99);
    const changed = useEditorStore.getState().template;

    useEditorStore.getState().undo();

    expect(useEditorStore.getState().canRedo()).toBe(true);
    expect(useEditorStore.getState()._redoStack[0]).toBe(changed);
  });

  it('redo restores undone template', () => {
    setupWithElement();

    useEditorStore.getState().updateElementPosition('el1', 99, 99);
    const changed = useEditorStore.getState().template;

    useEditorStore.getState().undo();
    useEditorStore.getState().redo();

    expect(useEditorStore.getState().template).toBe(changed);
    expect(useEditorStore.getState().canRedo()).toBe(false);
    expect(useEditorStore.getState().canUndo()).toBe(true);
  });

  it('multiple undo/redo chain', () => {
    setupWithElement();
    const t0 = useEditorStore.getState().template;

    useEditorStore.getState().updateElementPosition('el1', 50, 50);
    const t1 = useEditorStore.getState().template;

    useEditorStore.getState().updateElementPosition('el1', 70, 70);
    const t2 = useEditorStore.getState().template;

    // Undo twice
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().template).toBe(t1);
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().template).toBe(t0);

    // Redo twice
    useEditorStore.getState().redo();
    expect(useEditorStore.getState().template).toBe(t1);
    useEditorStore.getState().redo();
    expect(useEditorStore.getState().template).toBe(t2);
  });

  it('new change after undo clears redo stack', () => {
    setupWithElement();

    useEditorStore.getState().updateElementPosition('el1', 50, 50);
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().canRedo()).toBe(true);

    useEditorStore.getState().updateElementPosition('el1', 80, 80);
    expect(useEditorStore.getState().canRedo()).toBe(false);
    expect(useEditorStore.getState()._redoStack).toHaveLength(0);
  });

  it('non-template changes do not affect stacks', () => {
    setupWithElement();

    useEditorStore.getState().setZoom(2.0);
    useEditorStore.getState().setScroll(100, 200);
    useEditorStore.getState().setSelection('el1', 'band1', 'sec1');

    expect(useEditorStore.getState()._undoStack).toHaveLength(0);
    expect(useEditorStore.getState()._redoStack).toHaveLength(0);
  });

  it('caps history at 50 entries', () => {
    setupWithElement();

    for (let i = 0; i < 60; i++) {
      useEditorStore.getState().updateElementPosition('el1', i, i);
    }

    expect(useEditorStore.getState()._undoStack).toHaveLength(50);
  });

  it('undo with empty stack is a no-op', () => {
    setupWithElement();
    const before = useEditorStore.getState().template;

    useEditorStore.getState().undo();

    expect(useEditorStore.getState().template).toBe(before);
  });

  it('redo with empty stack is a no-op', () => {
    setupWithElement();
    const before = useEditorStore.getState().template;

    useEditorStore.getState().redo();

    expect(useEditorStore.getState().template).toBe(before);
  });

  it('clears selection on undo', () => {
    setupWithElement();
    useEditorStore.getState().setSelection('el1', 'band1', 'sec1');

    useEditorStore.getState().updateElementPosition('el1', 99, 99);
    useEditorStore.getState().setSelection('el1', 'band1', 'sec1');

    useEditorStore.getState().undo();

    const state = useEditorStore.getState();
    expect(state.selectedElementIds).toEqual([]);
    expect(state.selectedBandId).toBeNull();
    expect(state.selectedSectionId).toBeNull();
  });

  it('clears selection on redo', () => {
    setupWithElement();

    useEditorStore.getState().updateElementPosition('el1', 99, 99);
    useEditorStore.getState().undo();
    useEditorStore.getState().setSelection('el1', 'band1', 'sec1');

    useEditorStore.getState().redo();

    const state = useEditorStore.getState();
    expect(state.selectedElementIds).toEqual([]);
    expect(state.selectedBandId).toBeNull();
    expect(state.selectedSectionId).toBeNull();
  });

  it('importTemplate is undoable', () => {
    setupWithElement();
    const original = useEditorStore.getState().template;

    let imported = createTemplate({ name: 'Imported' });
    imported = addSection(imported, { id: 'sec-new', bands: [] });
    useEditorStore.getState().importTemplate(JSON.stringify(imported));

    expect(useEditorStore.getState().template.name).toBe('Imported');
    expect(useEditorStore.getState().canUndo()).toBe(true);

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().template).toBe(original);
  });
});
