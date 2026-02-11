import { useState, useCallback } from 'react';
import { useEditorStore } from '../../store';
import css from './FontsPanel.module.css';

const WEIGHT_OPTIONS = [
  { value: '100', label: '100 Thin' },
  { value: '200', label: '200 Extra Light' },
  { value: '300', label: '300 Light' },
  { value: '400', label: '400 Regular' },
  { value: '500', label: '500 Medium' },
  { value: '600', label: '600 Semi Bold' },
  { value: '700', label: '700 Bold' },
  { value: '800', label: '800 Extra Bold' },
  { value: '900', label: '900 Black' },
];

interface FontAddFormProps {
  fileName: string;
  data: string;
  onDone: () => void;
}

export function FontAddForm({ fileName, data, onDone }: FontAddFormProps) {
  const addFont = useEditorStore((s) => s.addFont);
  const [family, setFamily] = useState(fileName);
  const [weight, setWeight] = useState('400');
  const [fontStyle, setFontStyle] = useState<'normal' | 'italic'>('normal');

  const handleConfirm = useCallback(() => {
    if (!family.trim()) return;
    addFont({ family: family.trim(), weight: Number(weight), style: fontStyle, data });
    onDone();
  }, [family, weight, fontStyle, data, addFont, onDone]);

  return (
    <div className={css.panel}>
      <div className={css.formHeader}>
        <button className={css.backBtn} onClick={onDone}>
          &larr;
        </button>
        <span className={css.headerTitle}>Add Font</span>
      </div>
      <div className={css.formBody}>
        <label className={css.fieldLabel}>
          Family
          <input
            className={css.fieldInput}
            value={family}
            onChange={(e) => {
              setFamily(e.target.value);
            }}
          />
        </label>
        <label className={css.fieldLabel}>
          Weight
          <select
            className={css.fieldSelect}
            value={weight}
            onChange={(e) => {
              setWeight(e.target.value);
            }}
          >
            {WEIGHT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className={css.fieldLabel}>
          Style
          <select
            className={css.fieldSelect}
            value={fontStyle}
            onChange={(e) => {
              setFontStyle(e.target.value as 'normal' | 'italic');
            }}
          >
            <option value="normal">Normal</option>
            <option value="italic">Italic</option>
          </select>
        </label>
        <button className={css.confirmBtn} onClick={handleConfirm}>
          Add Font
        </button>
      </div>
    </div>
  );
}
