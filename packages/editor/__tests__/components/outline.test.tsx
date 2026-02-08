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
      selectedElementId: null,
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
    expect(state.selectedElementId).toBeNull();
  });

  it('click band node selects band and section', () => {
    render(<OutlinePanel />);
    fireEvent.click(screen.getByText('Detail'));
    const state = useEditorStore.getState();
    expect(state.selectedBandId).toBe('band2');
    expect(state.selectedSectionId).toBe('sec1');
    expect(state.selectedElementId).toBeNull();
  });

  it('click element node selects element, band, and section', () => {
    render(<OutlinePanel />);
    fireEvent.click(screen.getByText('el-text'));
    const state = useEditorStore.getState();
    expect(state.selectedElementId).toBe('el-text');
    expect(state.selectedBandId).toBe('band2');
    expect(state.selectedSectionId).toBe('sec1');
  });

  it('selection highlight appears for selected node', () => {
    useEditorStore.setState({
      selectedElementId: 'el-text',
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
    expect(state.selectedElementId).toBe('el-frame');
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
});
