import type { Element } from '@jsonpdf/core';
import { TextField, CheckboxField } from '../../fields';
import styles from '../Panel.module.css';

interface TextPropertiesProps {
  element: Element;
  onPropertyChange: (key: string, value: unknown) => void;
}

export function TextProperties({ element, onPropertyChange }: TextPropertiesProps) {
  const content = element.properties.content;
  const isRichText = Array.isArray(content);
  const autoHeight = element.properties.autoHeight as boolean | undefined;

  return (
    <>
      {isRichText ? (
        <div className={styles.readOnlyLabel}>
          Rich text ({String((content as unknown[]).length)} runs)
        </div>
      ) : (
        <TextField
          label="Content"
          value={content as string | undefined}
          onChange={(v) => {
            onPropertyChange('content', v ?? '');
          }}
          multiline
        />
      )}
      <CheckboxField
        label="Auto Height"
        value={autoHeight}
        onChange={(v) => {
          onPropertyChange('autoHeight', v);
        }}
      />
    </>
  );
}
