import { useState } from 'react';
import type { ReactNode } from 'react';
import styles from './PropertyGroup.module.css';

interface PropertyGroupProps {
  label: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function PropertyGroup({ label, defaultOpen = true, children }: PropertyGroupProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={styles.group}>
      <button
        className={styles.header}
        onClick={() => {
          setOpen(!open);
        }}
        type="button"
      >
        <span className={open ? styles.chevronOpen : styles.chevron}>&#9654;</span>
        {label}
      </button>
      {open && <div className={styles.content}>{children}</div>}
    </div>
  );
}
