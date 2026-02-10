import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../../store';
import { TemplateEditor, type TemplateEditorHandle } from './template-editor';
import { ReadOnlyViewport } from './read-only-viewport';
import type { CanvasItemClick } from '../../canvas/ReadOnlyCanvas';
import styles from './code-layout.module.css';

export function CodeLayout() {
  const template = useEditorStore((s) => s.template);
  const importTemplate = useEditorStore((s) => s.importTemplate);
  const editorRef = useRef<TemplateEditorHandle>(null);

  const [jsonText, setJsonText] = useState(() => JSON.stringify(template, null, 2));
  const [applyError, setApplyError] = useState<string | null>(null);

  // Track whether we caused the store change so we don't re-seed the editor text.
  const weAppliedRef = useRef(false);

  // Re-seed from store when template changes externally (e.g. undo, switching tabs).
  useEffect(() => {
    if (weAppliedRef.current) {
      weAppliedRef.current = false;
      return;
    }
    setJsonText(JSON.stringify(template, null, 2));
    setApplyError(null);
  }, [template]);

  // Debounced auto-apply: parse, validate, and apply to store.
  useEffect(() => {
    const timer = setTimeout(() => {
      const result = importTemplate(jsonText);
      if (result.success) {
        weAppliedRef.current = true;
        setApplyError(null);
      } else {
        setApplyError(result.error);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [jsonText]); // intentionally only re-run when jsonText changes

  const handleChange = useCallback((value: string) => {
    setJsonText(value);
  }, []);

  const handleItemClick = useCallback((item: CanvasItemClick) => {
    editorRef.current?.revealId(item.id);
  }, []);

  return (
    <div className={styles.layout}>
      <div className={styles.left}>
        <div className={styles.toolbar}>
          <span className={styles.label}>Template</span>
        </div>
        {applyError && <div className={styles.error}>{applyError}</div>}
        <TemplateEditor ref={editorRef} value={jsonText} onChange={handleChange} />
      </div>
      <div className={styles.right}>
        <ReadOnlyViewport onItemClick={handleItemClick} />
      </div>
    </div>
  );
}
