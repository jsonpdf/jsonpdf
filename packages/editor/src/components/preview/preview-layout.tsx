import { useCallback, useState } from 'react';
import { useEditorStore } from '../../store';
import { buildDefaultData } from '@jsonpdf/template';
import { usePdfPreview } from '../../hooks/use-pdf-preview';
import { DataEditor } from './data-editor';
import { PdfViewer } from './pdf-viewer';
import styles from './preview-layout.module.css';

export function PreviewLayout() {
  const template = useEditorStore((s) => s.template);
  const jsonText = useEditorStore((s) => s.previewDataText);
  const setJsonText = useEditorStore((s) => s.setPreviewDataText);
  const [parseError, setParseError] = useState<string | null>(null);
  const { blobUrl, loading, error, render } = usePdfPreview();

  const handleDefault = useCallback(() => {
    const data = buildDefaultData(template.dataSchema);
    setJsonText(JSON.stringify(data, null, 2));
  }, [template.dataSchema, setJsonText]);

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
          <div className={styles.toolbarActions}>
            <button className={styles.defaultBtn} onClick={handleDefault}>
              Default
            </button>
            <button className={styles.renderBtn} onClick={handleRender} disabled={loading}>
              Render
            </button>
          </div>
        </div>
        <DataEditor value={jsonText} onChange={setJsonText} dataSchema={template.dataSchema} />
      </div>
      <div className={styles.right}>
        <PdfViewer blobUrl={blobUrl} loading={loading} error={parseError ?? error} />
      </div>
    </div>
  );
}
