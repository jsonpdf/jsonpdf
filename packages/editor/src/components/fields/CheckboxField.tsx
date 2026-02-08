import styles from './Fields.module.css';

interface CheckboxFieldProps {
  label: string;
  value: boolean | undefined;
  onChange: (value: boolean) => void;
}

export function CheckboxField({ label, value, onChange }: CheckboxFieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      <input
        className={styles.fieldCheckbox}
        type="checkbox"
        checked={value ?? false}
        onChange={(e) => {
          onChange(e.target.checked);
        }}
      />
    </div>
  );
}
