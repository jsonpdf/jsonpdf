import { useState, useRef, useCallback } from 'react';
import { useEditorStore } from '../../store';
import { listSchemaProperties } from '@jsonpdf/template';
import type { SchemaPropertyInfo } from '@jsonpdf/template';
import css from './DataPanel.module.css';

export function SchemaPropertyList() {
  const template = useEditorStore((s) => s.template);
  const setSelectedSchemaPath = useEditorStore((s) => s.setSelectedSchemaPath);
  const addSchemaProperty = useEditorStore((s) => s.addSchemaProperty);

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const rootProps = listSchemaProperties(template.dataSchema);

  const toggleExpand = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

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
        if (name) {
          addSchemaProperty('', name, 'string');
        }
        setIsAdding(false);
      } else if (e.key === 'Escape') {
        setIsAdding(false);
      }
    },
    [addSchemaProperty],
  );

  const handleAddBlur = useCallback(() => {
    setIsAdding(false);
  }, []);

  const renderProperty = (prop: SchemaPropertyInfo, depth: number) => {
    const hasChildren = prop.childCount > 0;
    const isExpanded = expanded.has(prop.path);

    return (
      <div key={prop.path}>
        <div
          className={css.propertyRow}
          style={{ paddingLeft: `${String(8 + depth * 16)}px` }}
          onClick={() => {
            setSelectedSchemaPath(prop.path);
          }}
        >
          {hasChildren ? (
            <button
              className={css.expandToggle}
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(prop.path);
              }}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? '\u25BE' : '\u25B8'}
            </button>
          ) : (
            <span className={css.expandPlaceholder} />
          )}
          <span className={css.propertyName}>{prop.name}</span>
          {prop.required && <span className={css.requiredDot} title="Required" />}
          {prop.type && <span className={css.typeBadge}>{prop.type}</span>}
        </div>
        {hasChildren && isExpanded && renderChildren(prop, depth + 1)}
      </div>
    );
  };

  const renderChildren = (prop: SchemaPropertyInfo, depth: number) => {
    const children = listSchemaProperties(template.dataSchema, prop.path);
    return children.map((child) => renderProperty(child, depth));
  };

  return (
    <div className={css.panel}>
      <div className={css.listHeader}>Data Schema</div>
      <div className={css.listBody}>
        {rootProps.length === 0 && !isAdding && (
          <div className={css.emptyState}>No data schema defined</div>
        )}
        {rootProps.map((prop) => renderProperty(prop, 0))}
        {isAdding ? (
          <input
            ref={inputRef}
            className={css.addInput}
            placeholder="Property name..."
            onKeyDown={handleAddKeyDown}
            onBlur={handleAddBlur}
          />
        ) : (
          <button className={css.addBtn} onClick={handleAddClick} aria-label="Add property">
            + Add Property
          </button>
        )}
      </div>
    </div>
  );
}
