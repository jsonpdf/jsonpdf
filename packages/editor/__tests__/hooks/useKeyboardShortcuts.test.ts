// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../../src/hooks/useKeyboardShortcuts';
import { useEditorStore } from '../../src/store';
import { createTemplate, addSection, addBand, addElement } from '@jsonpdf/template';

function setupTemplate() {
  let t = createTemplate();
  t = addSection(t, { id: 'sec1', bands: [] });
  t = addBand(t, 'sec1', { id: 'band1', type: 'body', height: 100, elements: [] });
  t = addElement(t, 'band1', {
    id: 'el1',
    type: 'text',
    x: 50,
    y: 60,
    width: 100,
    height: 40,
    properties: { content: 'test' },
  });
  t = addElement(t, 'band1', {
    id: 'el2',
    type: 'text',
    x: 10,
    y: 10,
    width: 80,
    height: 30,
    properties: { content: 'other' },
  });
  useEditorStore.getState().setTemplate(t);
}

function fireKey(key: string, opts: Partial<KeyboardEventInit> = {}) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...opts }));
}

describe('useKeyboardShortcuts', () => {
  let unmount: () => void;

  beforeEach(() => {
    useEditorStore.setState({
      template: createTemplate(),
      zoom: 1.0,
      scrollX: 0,
      scrollY: 0,
      selectedElementIds: [],
      selectedBandId: null,
      selectedSectionId: null,
      clipboard: null,
      _undoStack: [],
      _redoStack: [],
      _isUndoRedoInProgress: false,
    });
  });

  afterEach(() => {
    unmount?.();
  });

  it('Escape clears selection', () => {
    setupTemplate();
    useEditorStore.getState().setSelection('el1', 'band1', 'sec1');
    ({ unmount } = renderHook(() => useKeyboardShortcuts()));

    fireKey('Escape');

    expect(useEditorStore.getState().selectedElementIds).toEqual([]);
  });

  it('Delete removes selected element', () => {
    setupTemplate();
    useEditorStore.getState().setSelection('el1', 'band1', 'sec1');
    ({ unmount } = renderHook(() => useKeyboardShortcuts()));

    fireKey('Delete');

    const state = useEditorStore.getState();
    expect(state.template.sections[0].bands[0].elements).toHaveLength(1);
    expect(state.selectedElementIds).toEqual([]);
  });

  it('Backspace removes selected element', () => {
    setupTemplate();
    useEditorStore.getState().setSelection('el1', 'band1', 'sec1');
    ({ unmount } = renderHook(() => useKeyboardShortcuts()));

    fireKey('Backspace');

    expect(useEditorStore.getState().template.sections[0].bands[0].elements).toHaveLength(1);
  });

  it('ArrowRight nudges by 1pt', () => {
    setupTemplate();
    useEditorStore.getState().setSelection('el1', 'band1', 'sec1');
    ({ unmount } = renderHook(() => useKeyboardShortcuts()));

    fireKey('ArrowRight');

    const el = useEditorStore.getState().template.sections[0].bands[0].elements[0];
    expect(el.x).toBe(51);
    expect(el.y).toBe(60);
  });

  it('Shift+ArrowDown nudges by 10pt', () => {
    setupTemplate();
    useEditorStore.getState().setSelection('el1', 'band1', 'sec1');
    ({ unmount } = renderHook(() => useKeyboardShortcuts()));

    fireKey('ArrowDown', { shiftKey: true });

    const el = useEditorStore.getState().template.sections[0].bands[0].elements[0];
    expect(el.x).toBe(50);
    expect(el.y).toBe(70);
  });

  it('ArrowLeft nudges left by 1pt', () => {
    setupTemplate();
    useEditorStore.getState().setSelection('el1', 'band1', 'sec1');
    ({ unmount } = renderHook(() => useKeyboardShortcuts()));

    fireKey('ArrowLeft');

    const el = useEditorStore.getState().template.sections[0].bands[0].elements[0];
    expect(el.x).toBe(49);
  });

  it('ArrowUp nudges up by 1pt', () => {
    setupTemplate();
    useEditorStore.getState().setSelection('el1', 'band1', 'sec1');
    ({ unmount } = renderHook(() => useKeyboardShortcuts()));

    fireKey('ArrowUp');

    const el = useEditorStore.getState().template.sections[0].bands[0].elements[0];
    expect(el.y).toBe(59);
  });

  it('does nothing when nothing is selected (arrow keys)', () => {
    setupTemplate();
    ({ unmount } = renderHook(() => useKeyboardShortcuts()));

    fireKey('ArrowRight');

    const el = useEditorStore.getState().template.sections[0].bands[0].elements[0];
    expect(el.x).toBe(50);
  });

  it('does nothing when nothing is selected (delete)', () => {
    setupTemplate();
    ({ unmount } = renderHook(() => useKeyboardShortcuts()));

    fireKey('Delete');

    expect(useEditorStore.getState().template.sections[0].bands[0].elements).toHaveLength(2);
  });

  it('Cmd+Z triggers undo', () => {
    setupTemplate();
    useEditorStore.getState().updateElementPosition('el1', 99, 99);
    ({ unmount } = renderHook(() => useKeyboardShortcuts()));

    fireKey('z', { metaKey: true });

    const el = useEditorStore.getState().template.sections[0].bands[0].elements[0];
    expect(el.x).toBe(50);
    expect(el.y).toBe(60);
  });

  it('Ctrl+Z triggers undo', () => {
    setupTemplate();
    useEditorStore.getState().updateElementPosition('el1', 99, 99);
    ({ unmount } = renderHook(() => useKeyboardShortcuts()));

    fireKey('z', { ctrlKey: true });

    const el = useEditorStore.getState().template.sections[0].bands[0].elements[0];
    expect(el.x).toBe(50);
    expect(el.y).toBe(60);
  });

  it('Cmd+Shift+Z triggers redo', () => {
    setupTemplate();
    useEditorStore.getState().updateElementPosition('el1', 99, 99);
    useEditorStore.getState().undo();
    ({ unmount } = renderHook(() => useKeyboardShortcuts()));

    fireKey('z', { metaKey: true, shiftKey: true });

    const el = useEditorStore.getState().template.sections[0].bands[0].elements[0];
    expect(el.x).toBe(99);
  });

  it('Ctrl+Shift+Z triggers redo', () => {
    setupTemplate();
    useEditorStore.getState().updateElementPosition('el1', 99, 99);
    useEditorStore.getState().undo();
    ({ unmount } = renderHook(() => useKeyboardShortcuts()));

    fireKey('z', { ctrlKey: true, shiftKey: true });

    const el = useEditorStore.getState().template.sections[0].bands[0].elements[0];
    expect(el.x).toBe(99);
  });

  it('Ctrl+Y triggers redo', () => {
    setupTemplate();
    useEditorStore.getState().updateElementPosition('el1', 99, 99);
    useEditorStore.getState().undo();
    ({ unmount } = renderHook(() => useKeyboardShortcuts()));

    fireKey('y', { ctrlKey: true });

    const el = useEditorStore.getState().template.sections[0].bands[0].elements[0];
    expect(el.x).toBe(99);
  });

  it('undo works without element selection', () => {
    setupTemplate();
    useEditorStore.getState().updateElementPosition('el1', 99, 99);
    useEditorStore.getState().setSelection(null);
    ({ unmount } = renderHook(() => useKeyboardShortcuts()));

    fireKey('z', { metaKey: true });

    const el = useEditorStore.getState().template.sections[0].bands[0].elements[0];
    expect(el.x).toBe(50);
  });

  it('skips when focus is on input element', () => {
    setupTemplate();
    useEditorStore.getState().setSelection('el1', 'band1', 'sec1');
    ({ unmount } = renderHook(() => useKeyboardShortcuts()));

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    fireKey('Delete');

    expect(useEditorStore.getState().template.sections[0].bands[0].elements).toHaveLength(2);
    document.body.removeChild(input);
  });

  it('Cmd+C copies selection to clipboard', () => {
    setupTemplate();
    useEditorStore.getState().setSelection('el1', 'band1', 'sec1');
    ({ unmount } = renderHook(() => useKeyboardShortcuts()));

    fireKey('c', { metaKey: true });

    const clip = useEditorStore.getState().clipboard;
    expect(clip).not.toBeNull();
    expect(clip!.elements).toHaveLength(1);
    expect(clip!.elements[0].id).toBe('el1');
  });

  it('Cmd+V pastes from clipboard', () => {
    setupTemplate();
    useEditorStore.getState().setSelection('el1', 'band1', 'sec1');
    useEditorStore.getState().copySelection();
    ({ unmount } = renderHook(() => useKeyboardShortcuts()));

    fireKey('v', { metaKey: true });

    const els = useEditorStore.getState().template.sections[0].bands[0].elements;
    expect(els).toHaveLength(3); // el1, el2, pasted
    expect(els[2].x).toBe(50); // same position as el1
  });

  it('Cmd+D duplicates selection', () => {
    setupTemplate();
    useEditorStore.getState().setSelection('el1', 'band1', 'sec1');
    ({ unmount } = renderHook(() => useKeyboardShortcuts()));

    fireKey('d', { metaKey: true });

    const els = useEditorStore.getState().template.sections[0].bands[0].elements;
    expect(els).toHaveLength(3);
    expect(els[2].x).toBe(50); // same position as el1
    expect(els[2].y).toBe(60); // same position as el1
  });

  it('Cmd+A selects all elements in band', () => {
    setupTemplate();
    useEditorStore.getState().setSelection('el1', 'band1', 'sec1');
    ({ unmount } = renderHook(() => useKeyboardShortcuts()));

    fireKey('a', { metaKey: true });

    expect(useEditorStore.getState().selectedElementIds).toEqual(['el1', 'el2']);
  });

  it('arrow keys nudge all multi-selected elements', () => {
    setupTemplate();
    useEditorStore.setState({
      selectedElementIds: ['el1', 'el2'],
      selectedBandId: 'band1',
      selectedSectionId: 'sec1',
    });
    ({ unmount } = renderHook(() => useKeyboardShortcuts()));

    fireKey('ArrowRight');

    const els = useEditorStore.getState().template.sections[0].bands[0].elements;
    expect(els[0].x).toBe(51); // el1: 50 + 1
    expect(els[1].x).toBe(11); // el2: 10 + 1
  });

  it('Delete removes all multi-selected elements', () => {
    setupTemplate();
    useEditorStore.setState({
      selectedElementIds: ['el1', 'el2'],
      selectedBandId: 'band1',
      selectedSectionId: 'sec1',
    });
    ({ unmount } = renderHook(() => useKeyboardShortcuts()));

    fireKey('Delete');

    expect(useEditorStore.getState().template.sections[0].bands[0].elements).toHaveLength(0);
  });
});
