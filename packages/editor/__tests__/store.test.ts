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

    it('updateElementProps updates properties, style, rotation, condition', () => {
      setupTemplateWithElement();
      useEditorStore.getState().updateElementProps('el1', {
        rotation: 45,
        condition: 'show',
        style: 'heading',
        properties: { content: 'updated' },
      });
      const el = useEditorStore.getState().template.sections[0].bands[0].elements[0];
      expect(el.rotation).toBe(45);
      expect(el.condition).toBe('show');
      expect(el.style).toBe('heading');
      expect(el.properties.content).toBe('updated');
    });

    it('updateElementProps no-ops on nonexistent element', () => {
      setupTemplateWithElement();
      const before = useEditorStore.getState().template;
      useEditorStore.getState().updateElementProps('nonexistent', { rotation: 90 });
      expect(useEditorStore.getState().template).toBe(before);
    });

    it('updateBandProps updates autoHeight, condition, dataSource', () => {
      setupTemplateWithElement();
      useEditorStore
        .getState()
        .updateBandProps('band1', { autoHeight: true, condition: 'visible', dataSource: 'items' });
      const band = useEditorStore.getState().template.sections[0].bands[0];
      expect(band.autoHeight).toBe(true);
      expect(band.condition).toBe('visible');
      expect(band.dataSource).toBe('items');
    });

    it('updateBandProps no-ops on nonexistent band', () => {
      setupTemplateWithElement();
      const before = useEditorStore.getState().template;
      useEditorStore.getState().updateBandProps('nonexistent', { autoHeight: true });
      expect(useEditorStore.getState().template).toBe(before);
    });

    it('updateSectionProps no-ops on nonexistent section', () => {
      setupTemplateWithElement();
      const before = useEditorStore.getState().template;
      useEditorStore.getState().updateSectionProps('nonexistent', { name: 'test' });
      expect(useEditorStore.getState().template).toBe(before);
    });

    it('updateSectionProps updates name, columns, page overrides', () => {
      setupTemplateWithElement();
      useEditorStore
        .getState()
        .updateSectionProps('sec1', { name: 'Main', columns: 2, page: { width: 800 } });
      const section = useEditorStore.getState().template.sections[0];
      expect(section.name).toBe('Main');
      expect(section.columns).toBe(2);
      expect(section.page?.width).toBe(800);
    });

    it('updateTemplateProps updates name, description, page config with margin merge', () => {
      useEditorStore.getState().updateTemplateProps({
        name: 'New Name',
        description: 'A desc',
        page: { margins: { top: 20, right: 40, bottom: 40, left: 40 } },
      });
      const t = useEditorStore.getState().template;
      expect(t.name).toBe('New Name');
      expect(t.description).toBe('A desc');
      expect(t.page.margins.top).toBe(20);
      expect(t.page.margins.right).toBe(40);
    });
  });

  describe('reorderElement', () => {
    function setupTwoElements() {
      let t = createTemplate();
      t = addSection(t, { id: 'sec1', bands: [] });
      t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 100, elements: [] });
      t = addElement(t, 'b1', {
        id: 'el1',
        type: 'text',
        x: 0,
        y: 0,
        width: 100,
        height: 30,
        properties: { content: 'A' },
      });
      t = addElement(t, 'b1', {
        id: 'el2',
        type: 'text',
        x: 0,
        y: 30,
        width: 100,
        height: 30,
        properties: { content: 'B' },
      });
      useEditorStore.setState({ template: t });
    }

    it('reorders element within band', () => {
      setupTwoElements();
      useEditorStore.getState().reorderElement('el1', 1);
      const els = useEditorStore.getState().template.sections[0].bands[0].elements;
      expect(els[0].id).toBe('el2');
      expect(els[1].id).toBe('el1');
    });

    it('no-ops on nonexistent element', () => {
      setupTwoElements();
      const before = useEditorStore.getState().template;
      useEditorStore.getState().reorderElement('nonexistent', 0);
      expect(useEditorStore.getState().template).toBe(before);
    });

    it('reorders el2 to index 0 (move earlier)', () => {
      setupTwoElements();
      useEditorStore.getState().reorderElement('el2', 0);
      const els = useEditorStore.getState().template.sections[0].bands[0].elements;
      expect(els[0].id).toBe('el2');
      expect(els[1].id).toBe('el1');
    });

    it('reorder to same index is a no-op in terms of order', () => {
      setupTwoElements();
      useEditorStore.getState().reorderElement('el1', 0);
      const els = useEditorStore.getState().template.sections[0].bands[0].elements;
      expect(els[0].id).toBe('el1');
      expect(els[1].id).toBe('el2');
    });
  });

  describe('moveElementToBand', () => {
    function setupTwoBands() {
      let t = createTemplate();
      t = addSection(t, { id: 'sec1', bands: [] });
      t = addBand(t, 'sec1', { id: 'b1', type: 'body', height: 100, elements: [] });
      t = addBand(t, 'sec1', { id: 'b2', type: 'detail', height: 100, elements: [] });
      t = addElement(t, 'b1', {
        id: 'el1',
        type: 'text',
        x: 0,
        y: 0,
        width: 100,
        height: 30,
        properties: { content: 'A' },
      });
      t = addElement(t, 'b2', {
        id: 'el2',
        type: 'text',
        x: 0,
        y: 0,
        width: 100,
        height: 30,
        properties: { content: 'B' },
      });
      useEditorStore.setState({ template: t });
    }

    it('moves element to a different band', () => {
      setupTwoBands();
      useEditorStore.getState().moveElementToBand('el1', 'b2');
      const b1 = useEditorStore.getState().template.sections[0].bands[0];
      const b2 = useEditorStore.getState().template.sections[0].bands[1];
      expect(b1.elements).toHaveLength(0);
      expect(b2.elements).toHaveLength(2);
      expect(b2.elements[1].id).toBe('el1');
    });

    it('moves element to specific index', () => {
      setupTwoBands();
      useEditorStore.getState().moveElementToBand('el1', 'b2', 0);
      const b2 = useEditorStore.getState().template.sections[0].bands[1];
      expect(b2.elements[0].id).toBe('el1');
      expect(b2.elements[1].id).toBe('el2');
    });

    it('no-ops on nonexistent element', () => {
      setupTwoBands();
      const before = useEditorStore.getState().template;
      useEditorStore.getState().moveElementToBand('nonexistent', 'b2');
      expect(useEditorStore.getState().template).toBe(before);
    });
  });

  describe('addSection', () => {
    it('appends section with generated ID, name, and empty bands', () => {
      useEditorStore.getState().addSection();
      const state = useEditorStore.getState();
      expect(state.template.sections).toHaveLength(1);
      const sec = state.template.sections[0];
      expect(sec.id).toMatch(/^sec_/);
      expect(sec.name).toBe('Section 1');
      expect(sec.bands).toEqual([]);
    });

    it('increments section name based on existing count', () => {
      useEditorStore.getState().addSection();
      useEditorStore.getState().addSection();
      const state = useEditorStore.getState();
      expect(state.template.sections).toHaveLength(2);
      expect(state.template.sections[0].name).toBe('Section 1');
      expect(state.template.sections[1].name).toBe('Section 2');
    });

    it('auto-selects the new section', () => {
      useEditorStore.setState({
        selectedElementId: 'el1',
        selectedBandId: 'b1',
        selectedSectionId: 'sec1',
      });
      useEditorStore.getState().addSection();
      const state = useEditorStore.getState();
      expect(state.selectedElementId).toBeNull();
      expect(state.selectedBandId).toBeNull();
      expect(state.selectedSectionId).toBe(state.template.sections[0].id);
    });
  });

  describe('removeSection', () => {
    it('removes the section and clears selection', () => {
      let t = createTemplate();
      t = addSection(t, { id: 'sec1', name: 'One', bands: [] });
      t = addSection(t, { id: 'sec2', name: 'Two', bands: [] });
      useEditorStore.setState({
        template: t,
        selectedSectionId: 'sec1',
      });
      useEditorStore.getState().removeSection('sec1');
      const state = useEditorStore.getState();
      expect(state.template.sections).toHaveLength(1);
      expect(state.template.sections[0].id).toBe('sec2');
      expect(state.selectedSectionId).toBeNull();
      expect(state.selectedBandId).toBeNull();
      expect(state.selectedElementId).toBeNull();
    });

    it('no-ops for invalid section ID', () => {
      let t = createTemplate();
      t = addSection(t, { id: 'sec1', bands: [] });
      useEditorStore.setState({ template: t });
      const before = useEditorStore.getState().template;
      useEditorStore.getState().removeSection('nonexistent');
      expect(useEditorStore.getState().template).toBe(before);
    });
  });

  describe('moveSection', () => {
    function setupThreeSections() {
      let t = createTemplate();
      t = addSection(t, { id: 'sec1', name: 'One', bands: [] });
      t = addSection(t, { id: 'sec2', name: 'Two', bands: [] });
      t = addSection(t, { id: 'sec3', name: 'Three', bands: [] });
      useEditorStore.setState({ template: t });
    }

    it('moves section forward', () => {
      setupThreeSections();
      useEditorStore.getState().moveSection('sec1', 2);
      const ids = useEditorStore.getState().template.sections.map((s) => s.id);
      expect(ids).toEqual(['sec2', 'sec3', 'sec1']);
    });

    it('moves section backward', () => {
      setupThreeSections();
      useEditorStore.getState().moveSection('sec3', 0);
      const ids = useEditorStore.getState().template.sections.map((s) => s.id);
      expect(ids).toEqual(['sec3', 'sec1', 'sec2']);
    });

    it('no-ops for invalid section ID', () => {
      setupThreeSections();
      const before = useEditorStore.getState().template;
      useEditorStore.getState().moveSection('nonexistent', 0);
      expect(useEditorStore.getState().template).toBe(before);
    });
  });
});
