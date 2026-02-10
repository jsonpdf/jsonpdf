import { useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import styles from './preview-layout.module.css';

interface DataEditorProps {
  value: string;
  onChange: (value: string) => void;
  dataSchema?: Record<string, unknown>;
}

export function DataEditor({ value, onChange, dataSchema }: DataEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);

  const handleMount: OnMount = (ed, monaco) => {
    editorRef.current = ed;
    monacoRef.current = monaco;

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
  };

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
