import styles from './Fields.module.css';

interface SelectFieldProps {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  options: Array<{ value: string; label: string }>;
  allowEmpty?: boolean;
}

export function SelectField({ label, value, onChange, options, allowEmpty }: SelectFieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      <select
        className={styles.fieldSelect}
        value={value ?? ''}
        onChange={(e) => {
          const val = e.target.value;
          onChange(val === '' ? undefined : val);
        }}
      >
        {allowEmpty && <option value="">None</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
