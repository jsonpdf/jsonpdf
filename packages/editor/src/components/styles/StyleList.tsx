import { useState, useRef, useMemo, useCallback } from 'react';
import { useEditorStore } from '../../store';
import { countStyleUsage } from './count-style-usage';
import css from './StylesPanel.module.css';

export function StyleList() {
  const template = useEditorStore((s) => s.template);
  const selectedStyleName = useEditorStore((s) => s.selectedStyleName);
  const setSelectedStyleName = useEditorStore((s) => s.setSelectedStyleName);
  const addNewStyle = useEditorStore((s) => s.addNewStyle);
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const styleEntries = useMemo(() => Object.keys(template.styles), [template.styles]);

  const usageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const name of styleEntries) {
      counts[name] = countStyleUsage(name, template);
    }
    return counts;
  }, [styleEntries, template]);

  const handleAddClick = useCallback(() => {
    setIsAdding(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  const handleAddKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        const name = (e.target as HTMLInputElement).value.trim();
        if (name && !styleEntries.includes(name)) {
          addNewStyle(name, {});
          setSelectedStyleName(name);
        }
        setIsAdding(false);
      } else if (e.key === 'Escape') {
        setIsAdding(false);
      }
    },
    [addNewStyle, setSelectedStyleName, styleEntries],
  );

  const handleAddBlur = useCallback(() => {
    setIsAdding(false);
  }, []);

  return (
    <div className={css.panel}>
      <div className={css.listHeader}>Styles</div>
      <div className={css.listBody}>
        {styleEntries.length === 0 && !isAdding && (
          <div className={css.emptyState}>No styles defined</div>
        )}
        {styleEntries.map((name) => {
          const style = template.styles[name];
          const isSelected = selectedStyleName === name;
          const usage = usageCounts[name] ?? 0;
          return (
            <div
              key={name}
              className={`${css.styleItem} ${isSelected ? css.styleItemSelected : ''}`}
              onClick={() => {
                setSelectedStyleName(name);
              }}
            >
              <div
                className={css.swatch}
                style={{
                  backgroundColor:
                    typeof style.backgroundColor === 'string' ? style.backgroundColor : '#ffffff',
                  color: style.color ?? '#000000',
                  fontFamily: style.fontFamily,
                }}
              >
                A
              </div>
              <span className={css.styleName}>{name}</span>
              {usage > 0 && <span className={css.usageBadge}>{usage}</span>}
            </div>
          );
        })}
        {isAdding ? (
          <input
            ref={inputRef}
            className={css.addInput}
            placeholder="Style name…"
            onKeyDown={handleAddKeyDown}
            onBlur={handleAddBlur}
          />
        ) : (
          <button className={css.addStyleBtn} onClick={handleAddClick} aria-label="Add style">
            + Add Style
          </button>
        )}
      </div>
    </div>
  );
}
