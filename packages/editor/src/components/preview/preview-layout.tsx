import { useCallback, useState } from 'react';
import { useEditorStore } from '../../store';
import { usePdfPreview } from '../../hooks/use-pdf-preview';
import { DataEditor } from './data-editor';
import { PdfViewer } from './pdf-viewer';
import styles from './preview-layout.module.css';

export function PreviewLayout() {
  const template = useEditorStore((s) => s.template);
  const [jsonText, setJsonText] = useState('{}');
  const [parseError, setParseError] = useState<string | null>(null);
  const { blobUrl, loading, error, render } = usePdfPreview();

  const handleRender = useCallback(() => {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(jsonText) as Record<string, unknown>;
    } catch {
      setParseError('Invalid JSON — fix syntax errors before rendering');
      return;
    }
    setParseError(null);
    void render(template, data);
  }, [jsonText, template, render]);

  return (
    <div className={styles.layout}>
      <div className={styles.left}>
        <div className={styles.toolbar}>
          <span className={styles.label}>Data</span>
          <button className={styles.renderBtn} onClick={handleRender} disabled={loading}>
            Render
          </button>
        </div>
        <DataEditor value={jsonText} onChange={setJsonText} dataSchema={template.dataSchema} />
      </div>
      <div className={styles.right}>
        <PdfViewer blobUrl={blobUrl} loading={loading} error={parseError ?? error} />
      </div>
    </div>
  );
}
