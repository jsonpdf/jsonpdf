import type { Element } from '@jsonpdf/core';
import { ColorField, NumberField, SelectField, TextField } from '../../fields';

const DIRECTION_OPTIONS = [
  { value: 'horizontal', label: 'Horizontal' },
  { value: 'vertical', label: 'Vertical' },
];

interface LinePropertiesProps {
  element: Element;
  onPropertyChange: (key: string, value: unknown) => void;
}

export function LineProperties({ element, onPropertyChange }: LinePropertiesProps) {
  const dashPattern = element.properties.dashPattern as number[] | undefined;
  const dashString = dashPattern ? dashPattern.join(', ') : '';

  return (
    <>
      <ColorField
        label="Color"
        value={element.properties.color as string | undefined}
        onChange={(v) => {
          onPropertyChange('color', v);
        }}
      />
      <NumberField
        label="Thickness"
        value={element.properties.thickness as number | undefined}
        onChange={(v) => {
          onPropertyChange('thickness', v);
        }}
        min={0}
        step={0.5}
      />
      <SelectField
        label="Direction"
        value={(element.properties.direction as string | undefined) ?? 'horizontal'}
        onChange={(v) => {
          onPropertyChange('direction', v);
        }}
        options={DIRECTION_OPTIONS}
      />
      <TextField
        label="Dash"
        value={dashString || undefined}
        onChange={(v) => {
          if (!v) {
            onPropertyChange('dashPattern', undefined);
            return;
          }
          const nums = v
            .split(',')
            .map((s) => parseFloat(s.trim()))
            .filter((n) => !isNaN(n) && n >= 0);
          onPropertyChange('dashPattern', nums.length > 0 ? nums : undefined);
        }}
        placeholder="e.g. 4, 4"
      />
    </>
  );
}
