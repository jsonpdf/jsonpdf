import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { templateSchema } from '@jsonpdf/core';
import styles from './code-layout.module.css';

interface TemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export interface TemplateEditorHandle {
  /** Reveal the line containing `"id": "<id>"` in the editor. */
  revealId: (id: string) => void;
}

export const TemplateEditor = forwardRef<TemplateEditorHandle, TemplateEditorProps>(
  function TemplateEditor({ value, onChange }, ref) {
    const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

    useImperativeHandle(ref, () => ({
      revealId(id: string) {
        const ed = editorRef.current;
        if (!ed) return;
        const model = ed.getModel();
        if (!model) return;

        const needle = `"id": "${id}"`;
        const match = model.findMatches(needle, false, false, true, null, false);
        if (match.length > 0) {
          const line = match[0].range.startLineNumber;
          ed.revealLineInCenter(line);
          ed.setPosition({ lineNumber: line, column: 1 });
          ed.focus();
        }
      },
    }));

    const handleMount: OnMount = useCallback((ed, monaco) => {
      monacoRef.current = monaco;
      editorRef.current = ed;

      monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        schemas: [
          {
            uri: 'jsonpdf://template-schema',
            fileMatch: ['*'],
            schema: templateSchema as Record<string, unknown>,
          },
        ],
      });
    }, []);

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
  },
);
