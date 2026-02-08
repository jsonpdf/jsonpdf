import { useState, useEffect, useCallback } from 'react';
import styles from './Fields.module.css';

interface ColorFieldProps {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

export function ColorField({ label, value, onChange }: ColorFieldProps) {
  const [local, setLocal] = useState(value ?? '');

  useEffect(() => {
    setLocal(value ?? '');
  }, [value]);

  const commit = useCallback(() => {
    const trimmed = local === '' ? undefined : local;
    onChange(trimmed);
  }, [local, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // Blur triggers commit via onBlur — no need to call commit() here
      (e.target as HTMLElement).blur();
    }
  }, []);

  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      <div className={styles.colorRow}>
        <input
          className={styles.colorSwatch}
          type="color"
          value={value || '#000000'}
          onChange={(e) => {
            const v = e.target.value;
            setLocal(v);
            onChange(v);
          }}
        />
        <input
          className={styles.colorText}
          type="text"
          value={local}
          onChange={(e) => {
            setLocal(e.target.value);
          }}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          placeholder="#000000"
        />
      </div>
    </div>
  );
}
