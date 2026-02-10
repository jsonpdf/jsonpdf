import { useCallback, useEffect, useRef, useState } from 'react';
import type { Template } from '@jsonpdf/core';
import { renderPdf } from '@jsonpdf/renderer';

export interface PdfPreviewState {
  blobUrl: string | null;
  loading: boolean;
  error: string | null;
}

export function usePdfPreview() {
  const [state, setState] = useState<PdfPreviewState>({
    blobUrl: null,
    loading: false,
    error: null,
  });
  const blobUrlRef = useRef<string | null>(null);

  const revokePrevious = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      revokePrevious();
    };
  }, [revokePrevious]);

  const render = useCallback(
    async (template: Template, data: Record<string, unknown>) => {
      setState({ blobUrl: null, loading: true, error: null });
      revokePrevious();

      try {
        const result = await renderPdf(template, { data });
        // Copy bytes to an owned ArrayBuffer — result.bytes may be a view over a larger buffer
        const blob = new Blob([new Uint8Array(result.bytes)], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setState({ blobUrl: url, loading: false, error: null });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setState({ blobUrl: null, loading: false, error: message });
      }
    },
    [revokePrevious],
  );

  return { ...state, render };
}
