import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../src/store';
import { createTemplate } from '@jsonpdf/template';

describe('useEditorStore', () => {
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

  it('has correct initial state', () => {
    const state = useEditorStore.getState();
    expect(state.template.name).toBe('Untitled Template');
    expect(state.zoom).toBe(1.0);
    expect(state.scrollX).toBe(0);
    expect(state.scrollY).toBe(0);
    expect(state.selectedElementId).toBeNull();
    expect(state.selectedBandId).toBeNull();
    expect(state.selectedSectionId).toBeNull();
  });

  it('setTemplate replaces the template', () => {
    const newTemplate = createTemplate({ name: 'Test Template' });
    useEditorStore.getState().setTemplate(newTemplate);
    expect(useEditorStore.getState().template.name).toBe('Test Template');
  });

  it('setZoom updates zoom', () => {
    useEditorStore.getState().setZoom(1.5);
    expect(useEditorStore.getState().zoom).toBe(1.5);
  });

  it('setZoom clamps to minimum 0.1', () => {
    useEditorStore.getState().setZoom(0.01);
    expect(useEditorStore.getState().zoom).toBe(0.1);
  });

  it('setZoom clamps to maximum 5.0', () => {
    useEditorStore.getState().setZoom(10);
    expect(useEditorStore.getState().zoom).toBe(5.0);
  });

  it('setScroll updates scroll positions', () => {
    useEditorStore.getState().setScroll(100, 200);
    const state = useEditorStore.getState();
    expect(state.scrollX).toBe(100);
    expect(state.scrollY).toBe(200);
  });

  it('setSelection sets all selection fields', () => {
    useEditorStore.getState().setSelection('el1', 'band1', 'sec1');
    const state = useEditorStore.getState();
    expect(state.selectedElementId).toBe('el1');
    expect(state.selectedBandId).toBe('band1');
    expect(state.selectedSectionId).toBe('sec1');
  });

  it('setSelection clears with null', () => {
    useEditorStore.getState().setSelection('el1', 'band1', 'sec1');
    useEditorStore.getState().setSelection(null);
    const state = useEditorStore.getState();
    expect(state.selectedElementId).toBeNull();
    expect(state.selectedBandId).toBeNull();
    expect(state.selectedSectionId).toBeNull();
  });

  it('setSelection defaults bandId and sectionId to null', () => {
    useEditorStore.getState().setSelection('el1');
    const state = useEditorStore.getState();
    expect(state.selectedElementId).toBe('el1');
    expect(state.selectedBandId).toBeNull();
    expect(state.selectedSectionId).toBeNull();
  });
});
