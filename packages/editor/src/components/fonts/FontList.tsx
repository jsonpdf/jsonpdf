import { useMemo, useCallback, useRef } from 'react';
import type { FontDeclaration } from '@jsonpdf/core';
import { useEditorStore } from '../../store';
import css from './FontsPanel.module.css';

interface FontListProps {
  onFileSelected: (pending: { fileName: string; data: string }) => void;
}

function weightLabel(w?: number): string {
  if (!w || w === 400) return 'Regular';
  if (w === 700) return 'Bold';
  return String(w);
}

export function FontList({ onFileSelected }: FontListProps) {
  const fonts = useEditorStore((s) => s.template.fonts);
  const removeFont = useEditorStore((s) => s.removeFont);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, FontDeclaration[]>();
    for (const f of fonts) {
      const arr = map.get(f.family) ?? [];
      arr.push(f);
      map.set(f.family, arr);
    }
    return map;
  }, [fonts]);

  const handleAddClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const bytes = new Uint8Array(reader.result as ArrayBuffer);
        let binary = '';
        for (const byte of bytes) {
          binary += String.fromCharCode(byte);
        }
        const base64 = btoa(binary);
        const fileName = file.name.replace(/\.[^.]+$/, '');
        onFileSelected({ fileName, data: base64 });
      };
      reader.readAsArrayBuffer(file);
      e.target.value = '';
    },
    [onFileSelected],
  );

  return (
    <div className={css.panel}>
      <div className={css.listHeader}>Fonts</div>
      <div className={css.listBody}>
        {grouped.size === 0 && <div className={css.emptyState}>No fonts declared</div>}
        {[...grouped.entries()].map(([family, variants]) => (
          <div key={family} className={css.familyGroup}>
            <div className={css.familyName}>{family}</div>
            {variants.map((v, i) => (
              <div key={i} className={css.variantRow}>
                <span className={css.variantLabel}>
                  {weightLabel(v.weight)}
                  {v.style === 'italic' ? ' Italic' : ''}
                </span>
                <button
                  className={css.deleteVariantBtn}
                  onClick={() => {
                    removeFont(v.family, v.weight, v.style);
                  }}
                  aria-label={`Remove ${family} ${weightLabel(v.weight)}`}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        ))}
        <button className={css.addBtn} onClick={handleAddClick}>
          + Add Font
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".ttf,.otf,.woff,.woff2"
          className={css.hiddenInput}
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
