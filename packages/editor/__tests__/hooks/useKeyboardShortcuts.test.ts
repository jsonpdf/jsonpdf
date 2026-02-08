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
      selectedElementId: null,
      selectedBandId: null,
      selectedSectionId: null,
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

    expect(useEditorStore.getState().selectedElementId).toBeNull();
  });

  it('Delete removes selected element', () => {
    setupTemplate();
    useEditorStore.getState().setSelection('el1', 'band1', 'sec1');
    ({ unmount } = renderHook(() => useKeyboardShortcuts()));

    fireKey('Delete');

    const state = useEditorStore.getState();
    expect(state.template.sections[0].bands[0].elements).toHaveLength(0);
    expect(state.selectedElementId).toBeNull();
  });

  it('Backspace removes selected element', () => {
    setupTemplate();
    useEditorStore.getState().setSelection('el1', 'band1', 'sec1');
    ({ unmount } = renderHook(() => useKeyboardShortcuts()));

    fireKey('Backspace');

    expect(useEditorStore.getState().template.sections[0].bands[0].elements).toHaveLength(0);
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

    expect(useEditorStore.getState().template.sections[0].bands[0].elements).toHaveLength(1);
  });

  it('skips when focus is on input element', () => {
    setupTemplate();
    useEditorStore.getState().setSelection('el1', 'band1', 'sec1');
    ({ unmount } = renderHook(() => useKeyboardShortcuts()));

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    fireKey('Delete');

    expect(useEditorStore.getState().template.sections[0].bands[0].elements).toHaveLength(1);
    document.body.removeChild(input);
  });
});
