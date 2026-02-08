import { useState, useEffect, useCallback } from 'react';
import styles from './Fields.module.css';

interface TextFieldProps {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  multiline?: boolean;
}

export function TextField({ label, value, onChange, placeholder, multiline }: TextFieldProps) {
  const [local, setLocal] = useState(value ?? '');

  useEffect(() => {
    setLocal(value ?? '');
  }, [value]);

  const commit = useCallback(() => {
    const trimmed = local === '' ? undefined : local;
    onChange(trimmed);
  }, [local, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!multiline && e.key === 'Enter') {
        // Blur triggers commit via onBlur — no need to call commit() here
        (e.target as HTMLElement).blur();
      }
    },
    [multiline],
  );

  if (multiline) {
    return (
      <div className={styles.field}>
        <label className={styles.fieldLabel}>{label}</label>
        <textarea
          className={styles.fieldTextarea}
          value={local}
          onChange={(e) => {
            setLocal(e.target.value);
          }}
          onBlur={commit}
          placeholder={placeholder}
          rows={3}
        />
      </div>
    );
  }

  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      <input
        className={styles.fieldInput}
        type="text"
        value={local}
        onChange={(e) => {
          setLocal(e.target.value);
        }}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
    </div>
  );
}
