import { useCallback, useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import styles from './preview-layout.module.css';

interface DataEditorProps {
  value: string;
  onChange: (value: string) => void;
  dataSchema?: Record<string, unknown>;
}

export function DataEditor({ value, onChange, dataSchema }: DataEditorProps) {
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);

  const handleMount: OnMount = useCallback(
    (_ed, monaco) => {
      monacoRef.current = monaco;

      // NOTE: setDiagnosticsOptions applies globally to all Monaco JSON models.
      // If multiple editors with different schemas coexist, they would conflict.
      monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        schemas: [
          {
            uri: 'jsonpdf://data-schema',
            fileMatch: ['*'],
            schema: dataSchema ?? {},
          },
        ],
      });
    },
    [dataSchema],
  );

  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        schemas: [
          {
            uri: 'jsonpdf://data-schema',
            fileMatch: ['*'],
            schema: dataSchema ?? {},
          },
        ],
      });
    }
  }, [dataSchema]);

  return (
    <div className={styles.editorWrapper}>
      <Editor
        language="json"
        value={value}
        onChange={(v) => {
          onChange(v ?? '');
        }}
        onMount={handleMount}
        options={{
          minimap: { enabled: false },
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          fontSize: 13,
          tabSize: 2,
          automaticLayout: true,
        }}
      />
    </div>
  );
}
