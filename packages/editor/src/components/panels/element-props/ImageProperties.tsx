import type { Element } from '@jsonpdf/core';
import { TextField, SelectField } from '../../fields';

const FIT_OPTIONS = [
  { value: 'contain', label: 'Contain' },
  { value: 'cover', label: 'Cover' },
  { value: 'fill', label: 'Fill' },
  { value: 'none', label: 'None' },
];

interface ImagePropertiesProps {
  element: Element;
  onPropertyChange: (key: string, value: unknown) => void;
}

export function ImageProperties({ element, onPropertyChange }: ImagePropertiesProps) {
  return (
    <>
      <TextField
        label="Source"
        value={element.properties.src as string | undefined}
        onChange={(v) => {
          onPropertyChange('src', v ?? '');
        }}
      />
      <SelectField
        label="Fit"
        value={(element.properties.fit as string | undefined) ?? 'contain'}
        onChange={(v) => {
          onPropertyChange('fit', v);
        }}
        options={FIT_OPTIONS}
      />
    </>
  );
}
