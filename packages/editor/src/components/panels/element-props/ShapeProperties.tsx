import type { Element } from '@jsonpdf/core';
import { ColorField, NumberField, SelectField, TextField } from '../../fields';

const SHAPE_TYPE_OPTIONS = [
  { value: 'rect', label: 'Rectangle' },
  { value: 'circle', label: 'Circle' },
  { value: 'ellipse', label: 'Ellipse' },
];

interface ShapePropertiesProps {
  element: Element;
  onPropertyChange: (key: string, value: unknown) => void;
}

export function ShapeProperties({ element, onPropertyChange }: ShapePropertiesProps) {
  const shapeType = (element.properties.shapeType as string | undefined) ?? 'rect';
  const dashPattern = element.properties.dashPattern as number[] | undefined;
  const dashString = dashPattern ? dashPattern.join(', ') : '';

  return (
    <>
      <SelectField
        label="Shape"
        value={shapeType}
        onChange={(v) => {
          onPropertyChange('shapeType', v ?? 'rect');
        }}
        options={SHAPE_TYPE_OPTIONS}
      />
      <ColorField
        label="Fill"
        value={element.properties.fill as string | undefined}
        onChange={(v) => {
          onPropertyChange('fill', v);
        }}
      />
      <ColorField
        label="Stroke"
        value={element.properties.stroke as string | undefined}
        onChange={(v) => {
          onPropertyChange('stroke', v);
        }}
      />
      <NumberField
        label="Stroke W."
        value={element.properties.strokeWidth as number | undefined}
        onChange={(v) => {
          onPropertyChange('strokeWidth', v);
        }}
        min={0}
        step={0.5}
      />
      {shapeType === 'rect' && (
        <NumberField
          label="Radius"
          value={element.properties.borderRadius as number | undefined}
          onChange={(v) => {
            onPropertyChange('borderRadius', v);
          }}
          min={0}
        />
      )}
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
