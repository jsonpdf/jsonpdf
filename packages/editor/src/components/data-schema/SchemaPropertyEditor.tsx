import { useState, useCallback } from 'react';
import type { JSONSchema } from '@jsonpdf/core';
import { useEditorStore } from '../../store';
import {
  getSchemaAtPath,
  listSchemaProperties,
  createDefaultPropertySchema,
} from '@jsonpdf/template';
import type { SchemaPropertyType } from '@jsonpdf/template';
import css from './DataPanel.module.css';

const TYPE_OPTIONS: SchemaPropertyType[] = [
  'string',
  'number',
  'integer',
  'boolean',
  'object',
  'array',
];
const STRING_FORMATS = ['', 'date', 'date-time', 'email', 'uri', 'uuid'];

/** Read an optional field from a JSONSchema, returning undefined when absent. */
function field(schema: JSONSchema, key: string): unknown {
  return key in schema ? schema[key] : undefined;
}

interface SchemaPropertyEditorProps {
  path: string;
}

export function SchemaPropertyEditor({ path }: SchemaPropertyEditorProps) {
  const template = useEditorStore((s) => s.template);
  const setSelectedSchemaPath = useEditorStore((s) => s.setSelectedSchemaPath);
  const updateSchemaPropertySchema = useEditorStore((s) => s.updateSchemaPropertySchema);
  const removeSchemaProperty = useEditorStore((s) => s.removeSchemaProperty);
  const renameSchemaProperty = useEditorStore((s) => s.renameSchemaProperty);
  const toggleSchemaRequired = useEditorStore((s) => s.toggleSchemaRequired);
  const addSchemaProperty = useEditorStore((s) => s.addSchemaProperty);

  const segments = path.split('.');
  const propertyName = segments[segments.length - 1];
  const isItemsNode = propertyName === '$items';

  const schema = getSchemaAtPath(template.dataSchema, path);
  const [editingName, setEditingName] = useState(propertyName);

  // Determine if this property is required by checking the parent
  const parentPath = segments.length > 1 ? segments.slice(0, -1).join('.') : '';
  const parentSchema = parentPath
    ? getSchemaAtPath(template.dataSchema, parentPath)
    : template.dataSchema;
  const requiredArr = (field(parentSchema ?? {}, 'required') as string[] | undefined) ?? [];
  const isRequired = requiredArr.includes(propertyName);

  const handleBack = useCallback(() => {
    setSelectedSchemaPath(null);
  }, [setSelectedSchemaPath]);

  const handleNameBlur = useCallback(() => {
    const trimmed = editingName.trim();
    if (trimmed && trimmed !== propertyName) {
      renameSchemaProperty(path, trimmed);
    } else {
      setEditingName(propertyName);
    }
  }, [editingName, propertyName, path, renameSchemaProperty]);

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        (e.target as HTMLInputElement).blur();
      } else if (e.key === 'Escape') {
        setEditingName(propertyName);
        (e.target as HTMLInputElement).blur();
      }
    },
    [propertyName],
  );

  const handleTypeChange = useCallback(
    (newType: SchemaPropertyType) => {
      if (!schema) return;
      const currentType = field(schema, 'type') as string | undefined;
      if (currentType === newType) return;

      // Warn if changing away from object/array with children
      if (
        (currentType === 'object' || currentType === 'array') &&
        listSchemaProperties(template.dataSchema, path).length > 0
      ) {
        const confirmed = window.confirm(
          `Changing type will remove all child properties. Continue?`,
        );
        if (!confirmed) return;
      }

      const newSchema = createDefaultPropertySchema(newType);
      // Preserve description if it exists
      const desc = field(schema, 'description') as string | undefined;
      if (desc) {
        newSchema['description'] = desc;
      }
      updateSchemaPropertySchema(path, newSchema);
    },
    [schema, template.dataSchema, path, updateSchemaPropertySchema],
  );

  const handleToggleRequired = useCallback(() => {
    toggleSchemaRequired(path);
  }, [path, toggleSchemaRequired]);

  const updateFieldValue = useCallback(
    (key: string, value: unknown) => {
      if (!schema) return;
      const updated = Object.fromEntries(
        Object.entries(schema).filter(([k]) => k !== key),
      ) as JSONSchema;
      if (value !== '' && value !== undefined) {
        updated[key] = value;
      }
      updateSchemaPropertySchema(path, updated);
    },
    [schema, path, updateSchemaPropertySchema],
  );

  const handleDelete = useCallback(() => {
    const confirmed = window.confirm(`Delete property "${propertyName}"?`);
    if (!confirmed) return;
    removeSchemaProperty(path);
  }, [propertyName, path, removeSchemaProperty]);

  // State for adding child property inline
  const [isAddingChild, setIsAddingChild] = useState(false);
  const handleAddChildKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        const name = (e.target as HTMLInputElement).value.trim();
        if (name) {
          addSchemaProperty(path, name, 'string');
        }
        setIsAddingChild(false);
      } else if (e.key === 'Escape') {
        setIsAddingChild(false);
      }
    },
    [path, addSchemaProperty],
  );

  if (!schema) {
    return null;
  }

  const type = field(schema, 'type') as SchemaPropertyType | undefined;

  return (
    <div className={css.panel}>
      <div className={css.editorHeader}>
        <button className={css.backBtn} onClick={handleBack} aria-label="Back to property list">
          &larr;
        </button>
        {isItemsNode ? (
          <span className={css.nameInput} style={{ fontWeight: 600 }}>
            [items]
          </span>
        ) : (
          <input
            className={css.nameInput}
            value={editingName}
            onChange={(e) => {
              setEditingName(e.target.value);
            }}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
          />
        )}
      </div>
      <div className={css.editorBody}>
        {/* Type selector */}
        <div className={css.fieldGroup}>
          <label className={css.fieldLabel}>Type</label>
          <select
            className={css.fieldSelect}
            value={type ?? ''}
            onChange={(e) => {
              handleTypeChange(e.target.value as SchemaPropertyType);
            }}
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Required toggle */}
        {!isItemsNode && (
          <label className={css.checkboxRow}>
            <input type="checkbox" checked={isRequired} onChange={handleToggleRequired} />
            Required
          </label>
        )}

        {/* Description */}
        <div className={css.fieldGroup}>
          <label className={css.fieldLabel}>Description</label>
          <input
            className={css.fieldInput}
            value={(field(schema, 'description') as string | undefined) ?? ''}
            placeholder="Optional description..."
            onChange={(e) => {
              updateFieldValue('description', e.target.value || undefined);
            }}
          />
        </div>

        {/* Default value */}
        {type && type !== 'object' && (
          <DefaultValueField schema={schema} type={type} updateField={updateFieldValue} />
        )}

        {/* Type-specific constraints */}
        {type === 'string' && <StringConstraints schema={schema} updateField={updateFieldValue} />}
        {(type === 'number' || type === 'integer') && (
          <NumberConstraints schema={schema} updateField={updateFieldValue} />
        )}
        {type === 'object' && (
          <ObjectConstraints
            schema={schema}
            path={path}
            dataSchema={template.dataSchema}
            isAddingChild={isAddingChild}
            onAddChild={() => {
              setIsAddingChild(true);
            }}
            onAddChildKeyDown={handleAddChildKeyDown}
            onAddChildBlur={() => {
              setIsAddingChild(false);
            }}
          />
        )}
        {type === 'array' && (
          <ArrayConstraints
            schema={schema}
            updateField={updateFieldValue}
            onNavigateItems={() => {
              setSelectedSchemaPath(`${path}.$items`);
            }}
          />
        )}

        {/* Delete */}
        {!isItemsNode && (
          <button className={css.deleteBtn} onClick={handleDelete}>
            Delete Property
          </button>
        )}
      </div>
    </div>
  );
}

// ---- Constraint sub-components ----

function StringConstraints({
  schema,
  updateField,
}: {
  schema: JSONSchema;
  updateField: (key: string, value: unknown) => void;
}) {
  const enumValues = field(schema, 'enum') as string[] | undefined;
  const enumText = enumValues ? enumValues.join('\n') : '';

  return (
    <>
      <div className={css.sectionLabel}>Constraints</div>
      <div className={css.fieldGroup}>
        <label className={css.fieldLabel}>Format</label>
        <select
          className={css.fieldSelect}
          value={(field(schema, 'format') as string | undefined) ?? ''}
          onChange={(e) => {
            updateField('format', e.target.value || undefined);
          }}
        >
          {STRING_FORMATS.map((f) => (
            <option key={f} value={f}>
              {f || '(none)'}
            </option>
          ))}
        </select>
      </div>
      <div className={css.fieldGroup}>
        <label className={css.fieldLabel}>Min Length</label>
        <input
          className={css.fieldInput}
          type="number"
          min={0}
          value={(field(schema, 'minLength') as number | undefined) ?? ''}
          onChange={(e) => {
            updateField('minLength', e.target.value ? Number(e.target.value) : undefined);
          }}
        />
      </div>
      <div className={css.fieldGroup}>
        <label className={css.fieldLabel}>Max Length</label>
        <input
          className={css.fieldInput}
          type="number"
          min={0}
          value={(field(schema, 'maxLength') as number | undefined) ?? ''}
          onChange={(e) => {
            updateField('maxLength', e.target.value ? Number(e.target.value) : undefined);
          }}
        />
      </div>
      <div className={css.fieldGroup}>
        <label className={css.fieldLabel}>Pattern</label>
        <input
          className={css.fieldInput}
          value={(field(schema, 'pattern') as string | undefined) ?? ''}
          placeholder="Regex pattern..."
          onChange={(e) => {
            updateField('pattern', e.target.value || undefined);
          }}
        />
      </div>
      <div className={css.fieldGroup}>
        <label className={css.fieldLabel}>Enum (one per line)</label>
        <textarea
          className={css.fieldTextarea}
          value={enumText}
          placeholder="value1&#10;value2&#10;value3"
          onChange={(e) => {
            const lines = e.target.value.split('\n').filter((l) => l.length > 0);
            updateField('enum', lines.length > 0 ? lines : undefined);
          }}
        />
      </div>
    </>
  );
}

function NumberConstraints({
  schema,
  updateField,
}: {
  schema: JSONSchema;
  updateField: (key: string, value: unknown) => void;
}) {
  const enumValues = field(schema, 'enum') as number[] | undefined;
  const enumText = enumValues ? enumValues.join('\n') : '';

  return (
    <>
      <div className={css.sectionLabel}>Constraints</div>
      <div className={css.fieldGroup}>
        <label className={css.fieldLabel}>Minimum</label>
        <input
          className={css.fieldInput}
          type="number"
          value={(field(schema, 'minimum') as number | undefined) ?? ''}
          onChange={(e) => {
            updateField('minimum', e.target.value ? Number(e.target.value) : undefined);
          }}
        />
      </div>
      <div className={css.fieldGroup}>
        <label className={css.fieldLabel}>Maximum</label>
        <input
          className={css.fieldInput}
          type="number"
          value={(field(schema, 'maximum') as number | undefined) ?? ''}
          onChange={(e) => {
            updateField('maximum', e.target.value ? Number(e.target.value) : undefined);
          }}
        />
      </div>
      <div className={css.fieldGroup}>
        <label className={css.fieldLabel}>Exclusive Minimum</label>
        <input
          className={css.fieldInput}
          type="number"
          value={(field(schema, 'exclusiveMinimum') as number | undefined) ?? ''}
          onChange={(e) => {
            updateField('exclusiveMinimum', e.target.value ? Number(e.target.value) : undefined);
          }}
        />
      </div>
      <div className={css.fieldGroup}>
        <label className={css.fieldLabel}>Exclusive Maximum</label>
        <input
          className={css.fieldInput}
          type="number"
          value={(field(schema, 'exclusiveMaximum') as number | undefined) ?? ''}
          onChange={(e) => {
            updateField('exclusiveMaximum', e.target.value ? Number(e.target.value) : undefined);
          }}
        />
      </div>
      <div className={css.fieldGroup}>
        <label className={css.fieldLabel}>Multiple Of</label>
        <input
          className={css.fieldInput}
          type="number"
          value={(field(schema, 'multipleOf') as number | undefined) ?? ''}
          onChange={(e) => {
            updateField('multipleOf', e.target.value ? Number(e.target.value) : undefined);
          }}
        />
      </div>
      <div className={css.fieldGroup}>
        <label className={css.fieldLabel}>Enum (one per line)</label>
        <textarea
          className={css.fieldTextarea}
          value={enumText}
          placeholder="1&#10;2&#10;3"
          onChange={(e) => {
            const lines = e.target.value
              .split('\n')
              .filter((l) => l.length > 0)
              .map(Number)
              .filter((n) => !isNaN(n));
            updateField('enum', lines.length > 0 ? lines : undefined);
          }}
        />
      </div>
    </>
  );
}

function ObjectConstraints({
  schema,
  path,
  dataSchema,
  isAddingChild,
  onAddChild,
  onAddChildKeyDown,
  onAddChildBlur,
}: {
  schema: JSONSchema;
  path: string;
  dataSchema: JSONSchema;
  isAddingChild: boolean;
  onAddChild: () => void;
  onAddChildKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onAddChildBlur: () => void;
}) {
  const children = listSchemaProperties(dataSchema, path);
  const propCount = Object.keys(
    (field(schema, 'properties') as Record<string, unknown> | undefined) ?? {},
  ).length;

  return (
    <>
      <div className={css.sectionLabel}>Children</div>
      <div className={css.childInfo}>
        {String(propCount)} child propert{propCount === 1 ? 'y' : 'ies'}
      </div>
      {children.map((child) => (
        <div key={child.path} className={css.childInfo}>
          {child.name}: {child.type ?? 'unknown'}
        </div>
      ))}
      {isAddingChild ? (
        <input
          className={css.addInput}
          placeholder="Property name..."
          autoFocus
          onKeyDown={onAddChildKeyDown}
          onBlur={onAddChildBlur}
        />
      ) : (
        <button className={css.addBtn} onClick={onAddChild}>
          + Add Child Property
        </button>
      )}
    </>
  );
}

function DefaultValueField({
  schema,
  type,
  updateField,
}: {
  schema: JSONSchema;
  type: SchemaPropertyType;
  updateField: (key: string, value: unknown) => void;
}) {
  const current = field(schema, 'default');

  if (type === 'boolean') {
    return (
      <label className={css.checkboxRow}>
        <input
          type="checkbox"
          checked={(current as boolean | undefined) ?? false}
          onChange={(e) => {
            updateField('default', e.target.checked || undefined);
          }}
        />
        Default Value
      </label>
    );
  }

  if (type === 'number' || type === 'integer') {
    return (
      <div className={css.fieldGroup}>
        <label className={css.fieldLabel}>Default</label>
        <input
          className={css.fieldInput}
          type="number"
          step={type === 'integer' ? 1 : 'any'}
          value={(current as number | undefined) ?? ''}
          placeholder="No default"
          onChange={(e) => {
            updateField('default', e.target.value ? Number(e.target.value) : undefined);
          }}
        />
      </div>
    );
  }

  if (type === 'array') {
    return <ArrayDefaultField current={current} updateField={updateField} />;
  }

  // string (and any other scalar type)
  return (
    <div className={css.fieldGroup}>
      <label className={css.fieldLabel}>Default</label>
      <input
        className={css.fieldInput}
        value={(current as string | undefined) ?? ''}
        placeholder="No default"
        onChange={(e) => {
          updateField('default', e.target.value || undefined);
        }}
      />
    </div>
  );
}

function ArrayDefaultField({
  current,
  updateField,
}: {
  current: unknown;
  updateField: (key: string, value: unknown) => void;
}) {
  const [text, setText] = useState(() =>
    current !== undefined ? JSON.stringify(current, null, 2) : '',
  );

  const handleBlur = useCallback(() => {
    const val = text.trim();
    if (!val) {
      updateField('default', undefined);
      return;
    }
    try {
      const parsed: unknown = JSON.parse(val);
      if (Array.isArray(parsed)) {
        updateField('default', parsed);
      }
    } catch {
      // Revert to last valid value on blur if JSON is invalid
      setText(current !== undefined ? JSON.stringify(current, null, 2) : '');
    }
  }, [text, current, updateField]);

  return (
    <div className={css.fieldGroup}>
      <label className={css.fieldLabel}>Default (JSON array)</label>
      <textarea
        className={css.fieldTextarea}
        value={text}
        placeholder='["value1", "value2"]'
        onChange={(e) => {
          setText(e.target.value);
        }}
        onBlur={handleBlur}
      />
    </div>
  );
}

function ArrayConstraints({
  schema,
  updateField,
  onNavigateItems,
}: {
  schema: JSONSchema;
  updateField: (key: string, value: unknown) => void;
  onNavigateItems: () => void;
}) {
  const items = field(schema, 'items') as JSONSchema | undefined;
  const itemsType = (field(items ?? {}, 'type') as string | undefined) ?? '';

  return (
    <>
      <div className={css.sectionLabel}>Items</div>
      <div className={css.fieldGroup}>
        <label className={css.fieldLabel}>Items Type</label>
        <select
          className={css.fieldSelect}
          value={itemsType}
          onChange={(e) => {
            const newType = e.target.value as SchemaPropertyType;
            updateField('items', createDefaultPropertySchema(newType));
          }}
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      {(itemsType === 'object' || itemsType === 'array') && (
        <button className={css.addBtn} onClick={onNavigateItems}>
          Edit Items Schema
        </button>
      )}
      <div className={css.sectionLabel}>Constraints</div>
      <div className={css.fieldGroup}>
        <label className={css.fieldLabel}>Min Items</label>
        <input
          className={css.fieldInput}
          type="number"
          min={0}
          value={(field(schema, 'minItems') as number | undefined) ?? ''}
          onChange={(e) => {
            updateField('minItems', e.target.value ? Number(e.target.value) : undefined);
          }}
        />
      </div>
      <div className={css.fieldGroup}>
        <label className={css.fieldLabel}>Max Items</label>
        <input
          className={css.fieldInput}
          type="number"
          min={0}
          value={(field(schema, 'maxItems') as number | undefined) ?? ''}
          onChange={(e) => {
            updateField('maxItems', e.target.value ? Number(e.target.value) : undefined);
          }}
        />
      </div>
      <label className={css.checkboxRow}>
        <input
          type="checkbox"
          checked={(field(schema, 'uniqueItems') as boolean | undefined) ?? false}
          onChange={(e) => {
            updateField('uniqueItems', e.target.checked || undefined);
          }}
        />
        Unique Items
      </label>
    </>
  );
}
