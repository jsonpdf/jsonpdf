import styles from './pdf-viewer.module.css';

interface PdfViewerProps {
  blobUrl: string | null;
  loading: boolean;
  error: string | null;
}

export function PdfViewer({ blobUrl, loading, error }: PdfViewerProps) {
  if (loading) {
    return (
      <div className={styles.viewer}>
        <div className={styles.message}>Rendering...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.viewer}>
        <div className={styles.error}>
          <pre>{error}</pre>
        </div>
      </div>
    );
  }

  if (blobUrl) {
    return (
      <div className={styles.viewer}>
        <iframe className={styles.iframe} src={blobUrl} title="PDF Preview" />
      </div>
    );
  }

  return (
    <div className={styles.viewer}>
      <div className={styles.message}>Enter data and click Render to generate a PDF preview</div>
    </div>
  );
}
