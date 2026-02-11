import { useMemo } from 'react';
import type { Style } from '@jsonpdf/core';
import { useEditorStore } from '../../store';
import { PropertyGroup, NumberField, SelectField, ColorField } from '../fields';

const FONT_WEIGHT_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'bold', label: 'Bold' },
];

const FONT_STYLE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'italic', label: 'Italic' },
];

const TEXT_DECORATION_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'underline', label: 'Underline' },
  { value: 'line-through', label: 'Strikethrough' },
  { value: 'underline line-through', label: 'Both' },
];

const TEXT_ALIGN_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
  { value: 'justify', label: 'Justify' },
];

interface StyleFieldsProps {
  values: Partial<Style>;
  onChange: (key: string, value: unknown) => void;
}

export function StyleFields({ values, onChange }: StyleFieldsProps) {
  const fonts = useEditorStore((s) => s.template.fonts);
  const fontFamilies = useMemo(() => [...new Set(fonts.map((f) => f.family))], [fonts]);
  return (
    <>
      <PropertyGroup label="Typography">
        <SelectField
          label="Font"
          value={values.fontFamily}
          onChange={(v) => {
            onChange('fontFamily', v);
          }}
          options={fontFamilies.map((f) => ({ value: f, label: f }))}
          allowEmpty
        />
        <NumberField
          label="Size"
          value={values.fontSize}
          onChange={(v) => {
            onChange('fontSize', v);
          }}
          min={1}
        />
        <SelectField
          label="Weight"
          value={values.fontWeight}
          onChange={(v) => {
            onChange('fontWeight', v);
          }}
          options={FONT_WEIGHT_OPTIONS}
          allowEmpty
        />
        <SelectField
          label="Style"
          value={values.fontStyle}
          onChange={(v) => {
            onChange('fontStyle', v);
          }}
          options={FONT_STYLE_OPTIONS}
          allowEmpty
        />
        <SelectField
          label="Decoration"
          value={values.textDecoration}
          onChange={(v) => {
            onChange('textDecoration', v);
          }}
          options={TEXT_DECORATION_OPTIONS}
          allowEmpty
        />
        <NumberField
          label="Letter Sp."
          value={values.letterSpacing}
          onChange={(v) => {
            onChange('letterSpacing', v);
          }}
          step={0.1}
        />
      </PropertyGroup>

      <PropertyGroup label="Colors">
        <ColorField
          label="Color"
          value={values.color}
          onChange={(v) => {
            onChange('color', v);
          }}
        />
        <ColorField
          label="Background"
          value={typeof values.backgroundColor === 'string' ? values.backgroundColor : undefined}
          onChange={(v) => {
            onChange('backgroundColor', v);
          }}
        />
      </PropertyGroup>

      <PropertyGroup label="Text Layout">
        <SelectField
          label="Align"
          value={values.textAlign}
          onChange={(v) => {
            onChange('textAlign', v);
          }}
          options={TEXT_ALIGN_OPTIONS}
          allowEmpty
        />
        <NumberField
          label="Line H."
          value={values.lineHeight}
          onChange={(v) => {
            onChange('lineHeight', v);
          }}
          min={0.5}
          step={0.1}
        />
      </PropertyGroup>

      <PropertyGroup label="Borders">
        <NumberField
          label="Border W."
          value={values.borderWidth}
          onChange={(v) => {
            onChange('borderWidth', v);
          }}
          min={0}
        />
        <ColorField
          label="Border C."
          value={values.borderColor}
          onChange={(v) => {
            onChange('borderColor', v);
          }}
        />
        <NumberField
          label="Radius"
          value={values.borderRadius}
          onChange={(v) => {
            onChange('borderRadius', v);
          }}
          min={0}
        />
      </PropertyGroup>

      <PropertyGroup label="Spacing">
        <NumberField
          label="Padding"
          value={typeof values.padding === 'number' ? values.padding : undefined}
          onChange={(v) => {
            onChange('padding', v);
          }}
          min={0}
        />
        <NumberField
          label="Opacity"
          value={values.opacity}
          onChange={(v) => {
            onChange('opacity', v);
          }}
          min={0}
          max={1}
          step={0.1}
        />
      </PropertyGroup>

      <PropertyGroup label="Pagination" defaultOpen={false}>
        <NumberField
          label="Widows"
          value={values.widows}
          onChange={(v) => {
            onChange('widows', v);
          }}
          min={0}
        />
        <NumberField
          label="Orphans"
          value={values.orphans}
          onChange={(v) => {
            onChange('orphans', v);
          }}
          min={0}
        />
      </PropertyGroup>
    </>
  );
}
