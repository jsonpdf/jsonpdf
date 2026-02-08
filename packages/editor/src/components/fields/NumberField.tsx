import { useState, useEffect, useCallback } from 'react';
import styles from './Fields.module.css';

interface NumberFieldProps {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  placeholder,
}: NumberFieldProps) {
  const [local, setLocal] = useState(value === undefined ? '' : String(value));

  // Sync local state when the external value changes (e.g. canvas drag)
  useEffect(() => {
    setLocal(value === undefined ? '' : String(value));
  }, [value]);

  const commit = useCallback(() => {
    if (local === '') {
      onChange(undefined);
      return;
    }
    let num = parseFloat(local);
    if (isNaN(num)) {
      // Revert to external value
      setLocal(value === undefined ? '' : String(value));
      return;
    }
    if (min !== undefined && num < min) num = min;
    if (max !== undefined && num > max) num = max;
    onChange(num);
    setLocal(String(num));
  }, [local, value, onChange, min, max]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // Blur triggers commit via onBlur — no need to call commit() here
      (e.target as HTMLInputElement).blur();
    }
  }, []);

  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      <input
        className={styles.fieldInput}
        type="number"
        value={local}
        onChange={(e) => {
          setLocal(e.target.value);
        }}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
      />
    </div>
  );
}
