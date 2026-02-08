// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { useEditorStore } from '../../src/store';
import { createTemplate, addSection, addBand, addElement, addStyle } from '@jsonpdf/template';
import { Sidebar } from '../../src/components/Sidebar';

afterEach(cleanup);

function buildTestTemplate() {
  let t = createTemplate({ name: 'Test Template' });
  t = addStyle(t, 'heading', { fontFamily: 'Helvetica', fontSize: 24 });
  t = addSection(t, { id: 'sec1', name: 'Main', bands: [] });
  t = addBand(t, 'sec1', { id: 'band1', type: 'detail', height: 100, elements: [] });
  t = addElement(t, 'band1', {
    id: 'el1',
    type: 'text',
    x: 10,
    y: 20,
    width: 200,
    height: 50,
    style: 'heading',
    properties: { content: 'Hello world' },
  });
  t = addElement(t, 'band1', {
    id: 'el-shape',
    type: 'shape',
    x: 0,
    y: 0,
    width: 100,
    height: 80,
    properties: { shapeType: 'rect', fill: '#ff0000' },
  });
  t = addElement(t, 'band1', {
    id: 'el-img',
    type: 'image',
    x: 0,
    y: 0,
    width: 100,
    height: 80,
    properties: { src: 'test.png' },
  });
  return t;
}

describe('Sidebar routing', () => {
  beforeEach(() => {
    useEditorStore.setState({
      template: buildTestTemplate(),
      selectedElementId: null,
      selectedBandId: null,
      selectedSectionId: null,
    });
  });

  it('shows TemplatePanel when nothing selected', () => {
    render(<Sidebar />);
    expect(screen.getByText('Template')).toBeTruthy();
    expect(screen.getByDisplayValue('Test Template')).toBeTruthy();
  });

  it('shows SectionPanel when section selected', () => {
    useEditorStore.setState({ selectedSectionId: 'sec1' });
    render(<Sidebar />);
    expect(screen.getByText('sec1')).toBeTruthy();
    // "Section" appears both as header and group label — check for the section ID
  });

  it('shows BandPanel when band selected', () => {
    useEditorStore.setState({ selectedBandId: 'band1', selectedSectionId: 'sec1' });
    render(<Sidebar />);
    expect(screen.getByText('Detail Band')).toBeTruthy();
  });

  it('shows ElementPanel when element selected', () => {
    useEditorStore.setState({
      selectedElementId: 'el1',
      selectedBandId: 'band1',
      selectedSectionId: 'sec1',
    });
    render(<Sidebar />);
    expect(screen.getByText('Text Element')).toBeTruthy();
  });

  it('element selection takes priority over band', () => {
    useEditorStore.setState({
      selectedElementId: 'el1',
      selectedBandId: 'band1',
      selectedSectionId: 'sec1',
    });
    render(<Sidebar />);
    // Should show element panel, not band panel
    expect(screen.getByText('Text Element')).toBeTruthy();
    expect(screen.queryByText('Detail Band')).toBeNull();
  });
});

describe('TemplatePanel', () => {
  beforeEach(() => {
    useEditorStore.setState({
      template: buildTestTemplate(),
      selectedElementId: null,
      selectedBandId: null,
      selectedSectionId: null,
    });
  });

  it('displays and updates template name', () => {
    render(<Sidebar />);
    const input = screen.getByDisplayValue('Test Template');
    fireEvent.change(input, { target: { value: 'New Name' } });
    fireEvent.blur(input);
    expect(useEditorStore.getState().template.name).toBe('New Name');
  });
});

describe('SectionPanel', () => {
  beforeEach(() => {
    useEditorStore.setState({
      template: buildTestTemplate(),
      selectedElementId: null,
      selectedBandId: null,
      selectedSectionId: 'sec1',
    });
  });

  it('shows delete section button', () => {
    render(<Sidebar />);
    expect(screen.getByRole('button', { name: 'Delete section' })).toBeTruthy();
  });

  it('removes section on delete click', () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete section' }));
    const state = useEditorStore.getState();
    expect(state.template.sections).toHaveLength(0);
    expect(state.selectedSectionId).toBeNull();
  });
});

describe('BandPanel', () => {
  beforeEach(() => {
    useEditorStore.setState({
      template: buildTestTemplate(),
      selectedElementId: null,
      selectedBandId: 'band1',
      selectedSectionId: 'sec1',
    });
  });

  it('shows data group for detail bands', () => {
    render(<Sidebar />);
    expect(screen.getByText('Data')).toBeTruthy();
  });

  it('updates band height', () => {
    render(<Sidebar />);
    const input = screen.getByDisplayValue('100');
    fireEvent.change(input, { target: { value: '150' } });
    fireEvent.blur(input);
    expect(useEditorStore.getState().template.sections[0].bands[0].height).toBe(150);
  });
});

describe('ElementPanel', () => {
  beforeEach(() => {
    useEditorStore.setState({
      template: buildTestTemplate(),
      selectedElementId: 'el1',
      selectedBandId: 'band1',
      selectedSectionId: 'sec1',
    });
  });

  it('shows correct sub-panel for text element', () => {
    render(<Sidebar />);
    expect(screen.getByText('Text Element')).toBeTruthy();
    // Text content field should be present
    expect(screen.getByDisplayValue('Hello world')).toBeTruthy();
  });

  it('shows correct sub-panel for shape element', () => {
    useEditorStore.setState({ selectedElementId: 'el-shape' });
    render(<Sidebar />);
    expect(screen.getByText('Shape Element')).toBeTruthy();
  });

  it('shows correct sub-panel for image element', () => {
    useEditorStore.setState({ selectedElementId: 'el-img' });
    render(<Sidebar />);
    expect(screen.getByText('Image Element')).toBeTruthy();
    expect(screen.getByDisplayValue('test.png')).toBeTruthy();
  });

  it('updates element x position', () => {
    render(<Sidebar />);
    const input = screen.getByDisplayValue('10');
    fireEvent.change(input, { target: { value: '55' } });
    fireEvent.blur(input);
    expect(useEditorStore.getState().template.sections[0].bands[0].elements[0].x).toBe(55);
  });

  it('updates style overrides', () => {
    render(<Sidebar />);
    // Expand style overrides group
    fireEvent.click(screen.getByText('Style Overrides'));
    // Find the font Size input — empty spinbutton whose parent contains "Size"
    const sizeInputs = screen.getAllByRole('spinbutton');
    const fontSizeInput = sizeInputs.find(
      (input) =>
        (input as HTMLInputElement).value === '' &&
        input.closest('div')?.textContent?.includes('Size'),
    );
    expect(fontSizeInput).toBeDefined();
    fireEvent.change(fontSizeInput!, { target: { value: '18' } });
    fireEvent.blur(fontSizeInput!);
    expect(
      useEditorStore.getState().template.sections[0].bands[0].elements[0].styleOverrides?.fontSize,
    ).toBe(18);
  });

  it('updates element style reference', () => {
    render(<Sidebar />);
    const selects = screen.getAllByRole('combobox');
    const styleSelect = selects.find((s) => (s as HTMLSelectElement).value === 'heading');
    expect(styleSelect).toBeDefined();
    fireEvent.change(styleSelect!, { target: { value: '' } });
    expect(
      useEditorStore.getState().template.sections[0].bands[0].elements[0].style,
    ).toBeUndefined();
  });
});
