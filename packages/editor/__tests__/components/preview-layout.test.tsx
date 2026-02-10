// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { useEditorStore } from '../../src/store';
import { createTemplate } from '@jsonpdf/template';

vi.mock('@jsonpdf/renderer', () => ({
  renderPdf: vi.fn(),
}));

vi.mock('@monaco-editor/react', () => ({
  __esModule: true,
  default: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
    onMount?: unknown;
    language?: string;
    options?: unknown;
  }) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
      }}
    />
  ),
}));

import { PreviewLayout } from '../../src/components/preview/preview-layout';

beforeEach(() => {
  vi.stubGlobal(
    'URL',
    Object.assign({}, globalThis.URL, {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    }),
  );

  useEditorStore.setState({
    template: createTemplate(),
    activeTab: 'preview',
  });
});

afterEach(cleanup);

describe('PreviewLayout', () => {
  it('renders data editor and PDF viewer side by side', () => {
    render(<PreviewLayout />);
    expect(screen.getByTestId('monaco-editor')).toBeDefined();
    expect(screen.getByText('Enter data and click Render to generate a PDF preview')).toBeDefined();
  });

  it('renders Render button', () => {
    render(<PreviewLayout />);
    expect(screen.getByRole('button', { name: 'Render' })).toBeDefined();
  });

  it('Render button triggers rendering', async () => {
    const { renderPdf } = await import('@jsonpdf/renderer');
    const mockRenderPdf = vi.mocked(renderPdf);
    mockRenderPdf.mockResolvedValue({ bytes: new Uint8Array([1, 2, 3]), pageCount: 1 });

    render(<PreviewLayout />);

    fireEvent.click(screen.getByRole('button', { name: 'Render' }));

    // Wait for the async render to complete
    await vi.waitFor(() => {
      expect(screen.getByTitle('PDF Preview')).toBeDefined();
    });
  });

  it('displays error from rendering', async () => {
    const { renderPdf } = await import('@jsonpdf/renderer');
    const mockRenderPdf = vi.mocked(renderPdf);
    mockRenderPdf.mockRejectedValue(new Error('Render failed'));

    render(<PreviewLayout />);

    fireEvent.click(screen.getByRole('button', { name: 'Render' }));

    await vi.waitFor(() => {
      expect(screen.getByText('Render failed')).toBeDefined();
    });
  });
});
