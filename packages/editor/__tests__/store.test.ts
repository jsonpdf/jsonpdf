import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../src/store';
import { createTemplate, addSection, addBand, addElement } from '@jsonpdf/template';

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

  describe('mutation actions', () => {
    function setupTemplateWithElement() {
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
    }

    it('updateElementPosition updates element x/y', () => {
      setupTemplateWithElement();
      useEditorStore.getState().updateElementPosition('el1', 55, 77);
      const el = useEditorStore.getState().template.sections[0].bands[0].elements[0];
      expect(el.x).toBe(55);
      expect(el.y).toBe(77);
    });

    it('updateElementBounds updates element x/y/width/height', () => {
      setupTemplateWithElement();
      useEditorStore.getState().updateElementBounds('el1', 5, 10, 200, 80);
      const el = useEditorStore.getState().template.sections[0].bands[0].elements[0];
      expect(el.x).toBe(5);
      expect(el.y).toBe(10);
      expect(el.width).toBe(200);
      expect(el.height).toBe(80);
    });

    it('deleteSelectedElement removes element and clears selection', () => {
      setupTemplateWithElement();
      useEditorStore.getState().setSelection('el1', 'band1', 'sec1');
      useEditorStore.getState().deleteSelectedElement();
      const state = useEditorStore.getState();
      expect(state.template.sections[0].bands[0].elements).toHaveLength(0);
      expect(state.selectedElementId).toBeNull();
      expect(state.selectedBandId).toBeNull();
      expect(state.selectedSectionId).toBeNull();
    });

    it('deleteSelectedElement is a no-op when nothing selected', () => {
      setupTemplateWithElement();
      useEditorStore.getState().deleteSelectedElement();
      expect(useEditorStore.getState().template.sections[0].bands[0].elements).toHaveLength(1);
    });

    it('updateBandHeight updates band height', () => {
      setupTemplateWithElement();
      useEditorStore.getState().updateBandHeight('band1', 200);
      expect(useEditorStore.getState().template.sections[0].bands[0].height).toBe(200);
    });

    it('updateBandHeight clamps to minimum 10', () => {
      setupTemplateWithElement();
      useEditorStore.getState().updateBandHeight('band1', 3);
      expect(useEditorStore.getState().template.sections[0].bands[0].height).toBe(10);
    });
  });
});
