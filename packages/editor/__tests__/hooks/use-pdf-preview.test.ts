// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { createTemplate } from '@jsonpdf/template';

vi.mock('@jsonpdf/renderer', () => ({
  renderPdf: vi.fn(),
}));

import { renderPdf } from '@jsonpdf/renderer';
import { usePdfPreview } from '../../src/hooks/use-pdf-preview';

const mockRenderPdf = vi.mocked(renderPdf);

beforeEach(() => {
  vi.stubGlobal(
    'URL',
    Object.assign({}, globalThis.URL, {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('usePdfPreview', () => {
  it('starts with empty state', () => {
    const { result } = renderHook(() => usePdfPreview());
    expect(result.current.blobUrl).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('render() calls renderPdf and sets blobUrl', async () => {
    mockRenderPdf.mockResolvedValue({ bytes: new Uint8Array([1, 2, 3]), pageCount: 1 });

    const { result } = renderHook(() => usePdfPreview());

    await act(async () => {
      await result.current.render(createTemplate(), {});
    });

    expect(mockRenderPdf).toHaveBeenCalledOnce();
    expect(result.current.blobUrl).toBe('blob:mock-url');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('error from renderPdf populates error', async () => {
    mockRenderPdf.mockRejectedValue(new Error('Template validation failed'));

    const { result } = renderHook(() => usePdfPreview());

    await act(async () => {
      await result.current.render(createTemplate(), {});
    });

    expect(result.current.blobUrl).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Template validation failed');
  });

  it('revokes blob URL on unmount', async () => {
    mockRenderPdf.mockResolvedValue({ bytes: new Uint8Array([1]), pageCount: 1 });

    const { result, unmount } = renderHook(() => usePdfPreview());

    await act(async () => {
      await result.current.render(createTemplate(), {});
    });

    expect(result.current.blobUrl).toBe('blob:mock-url');
    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('revokes previous blob URL on re-render', async () => {
    let callCount = 0;
    mockRenderPdf.mockImplementation(async () => {
      callCount++;
      return { bytes: new Uint8Array([callCount]), pageCount: 1 };
    });

    (URL.createObjectURL as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce('blob:first')
      .mockReturnValueOnce('blob:second');

    const { result } = renderHook(() => usePdfPreview());

    await act(async () => {
      await result.current.render(createTemplate(), {});
    });

    expect(result.current.blobUrl).toBe('blob:first');

    await act(async () => {
      await result.current.render(createTemplate(), { x: 1 });
    });

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:first');
    expect(result.current.blobUrl).toBe('blob:second');
  });
});
