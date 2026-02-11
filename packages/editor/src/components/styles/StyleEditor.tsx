import { useState, useCallback, useMemo } from 'react';
import type { Style } from '@jsonpdf/core';
import { useEditorStore } from '../../store';
import { countStyleUsage } from './count-style-usage';
import { StyleFields } from './StyleFields';
import css from './StylesPanel.module.css';

interface StyleEditorProps {
  styleName: string;
}

export function StyleEditor({ styleName }: StyleEditorProps) {
  const template = useEditorStore((s) => s.template);
  const setSelectedStyleName = useEditorStore((s) => s.setSelectedStyleName);
  const updateStyleProps = useEditorStore((s) => s.updateStyleProps);
  const removeStyleByName = useEditorStore((s) => s.removeStyleByName);
  const renameStyleByName = useEditorStore((s) => s.renameStyleByName);

  const style = template.styles[styleName] as Style | undefined;
  const [editingName, setEditingName] = useState(styleName);

  const usageCount = useMemo(() => countStyleUsage(styleName, template), [styleName, template]);

  const handleBack = useCallback(() => {
    setSelectedStyleName(null);
  }, [setSelectedStyleName]);

  const handleNameBlur = useCallback(() => {
    const trimmed = editingName.trim();
    if (trimmed && trimmed !== styleName) {
      renameStyleByName(styleName, trimmed);
    } else {
      setEditingName(styleName);
    }
  }, [editingName, styleName, renameStyleByName]);

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        (e.target as HTMLInputElement).blur();
      } else if (e.key === 'Escape') {
        setEditingName(styleName);
        (e.target as HTMLInputElement).blur();
      }
    },
    [styleName],
  );

  const handleFieldChange = useCallback(
    (key: string, value: unknown) => {
      updateStyleProps(styleName, { [key]: value });
    },
    [styleName, updateStyleProps],
  );

  const handleDelete = useCallback(() => {
    if (usageCount > 0) {
      const confirmed = window.confirm(
        `Style "${styleName}" is used by ${String(usageCount)} element${usageCount === 1 ? '' : 's'}. Delete anyway?`,
      );
      if (!confirmed) return;
    }
    removeStyleByName(styleName);
  }, [styleName, usageCount, removeStyleByName]);

  if (!style) {
    return null;
  }

  return (
    <div className={css.panel}>
      <div className={css.editorHeader}>
        <button className={css.backBtn} onClick={handleBack} aria-label="Back to styles list">
          ←
        </button>
        <input
          className={css.nameInput}
          value={editingName}
          onChange={(e) => {
            setEditingName(e.target.value);
          }}
          onBlur={handleNameBlur}
          onKeyDown={handleNameKeyDown}
        />
      </div>
      <div className={css.editorBody}>
        <div className={css.usageLabel}>
          Used by {usageCount} element{usageCount === 1 ? '' : 's'}
        </div>
        <StyleFields values={style} onChange={handleFieldChange} />
        <button className={css.deleteBtn} onClick={handleDelete}>
          Delete Style
        </button>
      </div>
    </div>
  );
}
