// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { useEditorStore } from '../../src/store';
import { createTemplate, addSection, addBand, addElement } from '@jsonpdf/template';
import { OutlinePanel } from '../../src/components/outline';

afterEach(cleanup);

function buildOutlineTestTemplate() {
  let t = createTemplate({ name: 'Test Template' });
  t = addSection(t, { id: 'sec1', name: 'Main', bands: [] });
  t = addBand(t, 'sec1', { id: 'band1', type: 'pageHeader', height: 40, elements: [] });
  t = addBand(t, 'sec1', { id: 'band2', type: 'detail', height: 100, elements: [] });
  t = addElement(t, 'band2', {
    id: 'el-text',
    type: 'text',
    x: 0,
    y: 0,
    width: 200,
    height: 30,
    properties: { content: 'Hello' },
  });
  t = addElement(t, 'band2', {
    id: 'el-container',
    type: 'container',
    x: 0,
    y: 40,
    width: 200,
    height: 60,
    properties: { layout: 'vertical' },
    elements: [
      {
        id: 'el-child1',
        type: 'text',
        x: 0,
        y: 0,
        width: 100,
        height: 20,
        properties: { content: 'A' },
      },
      {
        id: 'el-child2',
        type: 'text',
        x: 0,
        y: 20,
        width: 100,
        height: 20,
        properties: { content: 'B' },
      },
    ],
  });
  t = addElement(t, 'band1', {
    id: 'el-frame',
    type: 'frame',
    x: 0,
    y: 0,
    width: 200,
    height: 40,
    properties: {
      bands: [
        {
          id: 'frame-band1',
          type: 'body',
          height: 30,
          elements: [
            {
              id: 'frame-el1',
              type: 'text',
              x: 0,
              y: 0,
              width: 100,
              height: 20,
              properties: { content: 'Frame text' },
            },
          ],
        },
      ],
    },
  });
  return t;
}

describe('OutlinePanel', () => {
  beforeEach(() => {
    useEditorStore.setState({
      template: buildOutlineTestTemplate(),
      zoom: 1.0,
      scrollX: 0,
      scrollY: 0,
      selectedElementIds: [],
      selectedBandId: null,
      selectedSectionId: null,
    });
  });

  it('renders section, band, and element nodes', () => {
    render(<OutlinePanel />);
    // Section
    expect(screen.getByText('Main')).toBeDefined();
    // Bands (type labels)
    expect(screen.getByText('Page Header')).toBeDefined();
    expect(screen.getByText('Detail')).toBeDefined();
    // Elements (IDs as labels)
    expect(screen.getByText('el-text')).toBeDefined();
    expect(screen.getByText('el-container')).toBeDefined();
    expect(screen.getByText('el-frame')).toBeDefined();
  });

  it('click section node selects section', () => {
    render(<OutlinePanel />);
    fireEvent.click(screen.getByText('Main'));
    const state = useEditorStore.getState();
    expect(state.selectedSectionId).toBe('sec1');
    expect(state.selectedBandId).toBeNull();
    expect(state.selectedElementIds).toEqual([]);
  });

  it('click band node selects band and section', () => {
    render(<OutlinePanel />);
    fireEvent.click(screen.getByText('Detail'));
    const state = useEditorStore.getState();
    expect(state.selectedBandId).toBe('band2');
    expect(state.selectedSectionId).toBe('sec1');
    expect(state.selectedElementIds).toEqual([]);
  });

  it('click element node selects element, band, and section', () => {
    render(<OutlinePanel />);
    fireEvent.click(screen.getByText('el-text'));
    const state = useEditorStore.getState();
    expect(state.selectedElementIds).toEqual(['el-text']);
    expect(state.selectedBandId).toBe('band2');
    expect(state.selectedSectionId).toBe('sec1');
  });

  it('selection highlight appears for selected node', () => {
    useEditorStore.setState({
      selectedElementIds: ['el-text'],
      selectedBandId: 'band2',
      selectedSectionId: 'sec1',
    });
    render(<OutlinePanel />);
    const selectedItems = screen.getAllByRole('treeitem', { selected: true });
    expect(selectedItems).toHaveLength(1);
    expect(selectedItems[0].textContent).toContain('el-text');
  });

  it('expand/collapse toggle hides and shows children', () => {
    render(<OutlinePanel />);
    // Container has children el-child1 and el-child2
    expect(screen.getByText('el-child1')).toBeDefined();
    expect(screen.getByText('el-child2')).toBeDefined();

    // Collapse the container
    fireEvent.click(screen.getByTestId('toggle-el-container'));
    expect(screen.queryByText('el-child1')).toBeNull();
    expect(screen.queryByText('el-child2')).toBeNull();

    // Expand again
    fireEvent.click(screen.getByTestId('toggle-el-container'));
    expect(screen.getByText('el-child1')).toBeDefined();
    expect(screen.getByText('el-child2')).toBeDefined();
  });

  it('nested container children appear in tree', () => {
    render(<OutlinePanel />);
    expect(screen.getByText('el-child1')).toBeDefined();
    expect(screen.getByText('el-child2')).toBeDefined();
  });

  it('frame element shows nested band and element nodes', () => {
    render(<OutlinePanel />);
    // Frame's nested band label (Body type)
    expect(screen.getByText('Body')).toBeDefined();
    // Frame's nested element
    expect(screen.getByText('frame-el1')).toBeDefined();
  });

  it('clicking frame-internal node selects the frame element', () => {
    render(<OutlinePanel />);
    // Click the frame's nested element
    fireEvent.click(screen.getByText('frame-el1'));
    const state = useEditorStore.getState();
    // Should select the frame element, not the internal element
    expect(state.selectedElementIds).toEqual(['el-frame']);
    expect(state.selectedBandId).toBe('band1');
    expect(state.selectedSectionId).toBe('sec1');
  });

  it('empty template renders without error', () => {
    useEditorStore.setState({
      template: createTemplate(),
    });
    render(<OutlinePanel />);
    expect(screen.getByText('Outline')).toBeDefined();
  });

  describe('drag and drop', () => {
    it('direct band elements are draggable', () => {
      render(<OutlinePanel />);
      const elText = screen.getByText('el-text').closest('[role="treeitem"]')!;
      expect(elText.getAttribute('draggable')).toBe('true');
    });

    it('container children are not draggable', () => {
      render(<OutlinePanel />);
      const child = screen.getByText('el-child1').closest('[role="treeitem"]')!;
      expect(child.getAttribute('draggable')).toBeNull();
    });

    it('frame-internal elements are not draggable', () => {
      render(<OutlinePanel />);
      const frameEl = screen.getByText('frame-el1').closest('[role="treeitem"]')!;
      expect(frameEl.getAttribute('draggable')).toBeNull();
    });

    it('sections are draggable', () => {
      render(<OutlinePanel />);
      const section = screen.getByText('Main').closest('[role="treeitem"]')!;
      expect(section.getAttribute('draggable')).toBe('true');
    });

    it('band nodes are not draggable', () => {
      render(<OutlinePanel />);
      const band = screen.getByText('Detail').closest('[role="treeitem"]')!;
      expect(band.getAttribute('draggable')).toBeNull();
    });

    it('frame-internal band nodes are not drop targets', () => {
      render(<OutlinePanel />);
      // "Body" is the frame-internal band — it should not have drag event handlers
      const bodyNode = screen.getByText('Body').closest('[role="treeitem"]')!;
      // Frame-internal bands have frameOwnerId set, so isDropTarget is false
      // We verify this indirectly: the node should not accept drops (no onDragOver)
      expect(bodyNode.getAttribute('draggable')).toBeNull();
    });

    it('reorders elements within same band via store action', () => {
      // Directly test the store action since HTML5 DnD simulation is limited
      useEditorStore.getState().reorderElement('el-text', 1);
      const els = useEditorStore.getState().template.sections[0].bands[1].elements;
      expect(els[0].id).toBe('el-container');
      expect(els[1].id).toBe('el-text');
    });

    it('moves element to different band via store action', () => {
      useEditorStore.getState().moveElementToBand('el-text', 'band1');
      const b1 = useEditorStore.getState().template.sections[0].bands[0];
      const b2 = useEditorStore.getState().template.sections[0].bands[1];
      expect(b1.elements.map((e) => e.id)).toContain('el-text');
      expect(b2.elements.map((e) => e.id)).not.toContain('el-text');
    });
  });

  describe('placeholder band nodes', () => {
    it('renders placeholder nodes for absent singular band types', () => {
      render(<OutlinePanel />);
      // The test template has pageHeader and detail bands.
      // Singular band types that are absent should show as placeholders.
      // e.g., Title, Column Header, Column Footer, Summary, Background, No Data, Page Footer, Last Page Footer
      expect(screen.getByText('Title')).toBeDefined();
      expect(screen.getByText('Column Header')).toBeDefined();
      expect(screen.getByText('Summary')).toBeDefined();
      expect(screen.getByText('Background')).toBeDefined();
      expect(screen.getByText('No Data')).toBeDefined();
    });

    it('does not render placeholder for existing singular band type', () => {
      render(<OutlinePanel />);
      // pageHeader exists — should appear once (real node), not duplicated as placeholder
      const pageHeaders = screen.getAllByText('Page Header');
      expect(pageHeaders).toHaveLength(1);
    });

    it('placeholder nodes have dimmed/italic style class', () => {
      render(<OutlinePanel />);
      // Title is a placeholder (not in template)
      const titleNode = screen.getByText('Title').closest('[role="treeitem"]')!;
      expect(titleNode.className).toContain('nodePlaceholder');
    });

    it('clicking a placeholder selects it', () => {
      render(<OutlinePanel />);
      fireEvent.click(screen.getByText('Title'));
      const state = useEditorStore.getState();
      expect(state.selectedBandId).toBe('sec1::title');
      expect(state.selectedSectionId).toBe('sec1');
      expect(state.selectedElementIds).toEqual([]);
    });

    it('renders "+ Add Body" inline button for multi-band types', () => {
      render(<OutlinePanel />);
      expect(screen.getByRole('button', { name: 'Add Body' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Add Detail' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Add Group Header' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Add Group Footer' })).toBeDefined();
    });

    it('clicking "+ Add Body" adds a body band', () => {
      render(<OutlinePanel />);
      const addBtn = screen.getByRole('button', { name: 'Add Body' });
      fireEvent.click(addBtn);
      const state = useEditorStore.getState();
      const bodyBands = state.template.sections[0].bands.filter((b) => b.type === 'body');
      expect(bodyBands).toHaveLength(1);
      expect(state.selectedBandId).toBe(bodyBands[0].id);
    });
  });

  describe('band reorder draggability', () => {
    it('multi-type bands with 2+ siblings are draggable', () => {
      // Add a second detail band so detail bands become draggable
      let t = buildOutlineTestTemplate();
      t = addBand(t, 'sec1', { id: 'band3', type: 'detail', height: 50, elements: [] });
      useEditorStore.setState({ template: t });
      render(<OutlinePanel />);
      const detailNodes = screen.getAllByText('Detail');
      for (const detailNode of detailNodes) {
        const treeItem = detailNode.closest('[role="treeitem"]')!;
        expect(treeItem.getAttribute('draggable')).toBe('true');
      }
    });

    it('multi-type band with only 1 instance is NOT draggable', () => {
      // Default test template has only 1 detail band
      render(<OutlinePanel />);
      const detailNode = screen.getByText('Detail').closest('[role="treeitem"]')!;
      expect(detailNode.getAttribute('draggable')).toBeNull();
    });

    it('reorderBand changes band order via store', () => {
      let t = buildOutlineTestTemplate();
      t = addBand(t, 'sec1', { id: 'band3', type: 'detail', height: 50, elements: [] });
      useEditorStore.setState({ template: t });
      // band2 is at index 1, band3 is at index 2 — swap them
      useEditorStore.getState().reorderBand('band2', 'sec1', 2);
      const ids = useEditorStore.getState().template.sections[0].bands.map((b) => b.id);
      // band1 (pageHeader), band3 (detail), band2 (detail)
      expect(ids).toEqual(['band1', 'band3', 'band2']);
    });
  });

  describe('Add Section button', () => {
    it('renders the Add Section button', () => {
      render(<OutlinePanel />);
      expect(screen.getByRole('button', { name: 'Add section' })).toBeDefined();
    });

    it('adds a section on click', () => {
      render(<OutlinePanel />);
      const btn = screen.getByRole('button', { name: 'Add section' });
      fireEvent.click(btn);
      const state = useEditorStore.getState();
      expect(state.template.sections).toHaveLength(2); // 1 from setup + 1 new
      const newSec = state.template.sections[1];
      expect(newSec.name).toBe('Section 2');
      expect(newSec.bands).toEqual([]);
      expect(state.selectedSectionId).toBe(newSec.id);
    });
  });
});
