import { useCallback, useMemo } from 'react';
import type { Element, Style } from '@jsonpdf/core';
import { useEditorStore } from '../../store';
import { PropertyGroup, NumberField, TextField, SelectField, ColorField } from '../fields';
import { TextProperties } from './element-props/TextProperties';
import { ImageProperties } from './element-props/ImageProperties';
import { LineProperties } from './element-props/LineProperties';
import { ShapeProperties } from './element-props/ShapeProperties';
import { ElementTypeProperties } from './element-props/CommonProperties';
import styles from './Panel.module.css';

const FONT_WEIGHT_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'bold', label: 'Bold' },
];

const FONT_STYLE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'italic', label: 'Italic' },
];

const TEXT_ALIGN_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
  { value: 'justify', label: 'Justify' },
];

function elementTypeLabel(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

interface ElementPanelProps {
  element: Element;
}

export function ElementPanel({ element }: ElementPanelProps) {
  const templateStyles = useEditorStore((s) => s.template.styles);
  const updateElementProps = useEditorStore((s) => s.updateElementProps);

  const styleOptions = useMemo(
    () => Object.keys(templateStyles).map((name) => ({ value: name, label: name })),
    [templateStyles],
  );

  const update = useCallback(
    (updates: Partial<Omit<Element, 'id'>>) => {
      updateElementProps(element.id, updates);
    },
    [element.id, updateElementProps],
  );

  const onPropertyChange = useCallback(
    (key: string, value: unknown) => {
      update({ properties: { ...element.properties, [key]: value } });
    },
    [element.properties, update],
  );

  const onStyleOverrideChange = useCallback(
    (key: string, value: unknown) => {
      const current = { ...element.styleOverrides } as Record<string, unknown>;
      if (value === undefined) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- cleaning up removed override
        delete current[key];
      } else {
        current[key] = value;
      }
      update({
        styleOverrides: Object.keys(current).length > 0 ? (current as Partial<Style>) : undefined,
      });
    },
    [element.styleOverrides, update],
  );

  const overrides = element.styleOverrides ?? {};

  return (
    <div>
      <div className={styles.panelHeader}>{elementTypeLabel(element.type)} Element</div>
      <div className={styles.panelSubheader}>{element.id}</div>

      {/* Common Layout */}
      <PropertyGroup label="Layout">
        <NumberField
          label="X"
          value={element.x}
          onChange={(v) => {
            update({ x: v ?? 0 });
          }}
        />
        <NumberField
          label="Y"
          value={element.y}
          onChange={(v) => {
            update({ y: v ?? 0 });
          }}
        />
        <NumberField
          label="Width"
          value={element.width}
          onChange={(v) => {
            update({ width: v ?? 1 });
          }}
          min={1}
        />
        <NumberField
          label="Height"
          value={element.height}
          onChange={(v) => {
            update({ height: v ?? 1 });
          }}
          min={1}
        />
        <NumberField
          label="Rotation"
          value={element.rotation}
          onChange={(v) => {
            update({ rotation: v });
          }}
        />
      </PropertyGroup>

      {/* Style reference + condition */}
      <PropertyGroup label="Style">
        <SelectField
          label="Style"
          value={element.style}
          onChange={(v) => {
            update({ style: v });
          }}
          options={styleOptions}
          allowEmpty
        />
        <TextField
          label="Condition"
          value={element.condition}
          onChange={(v) => {
            update({ condition: v });
          }}
          placeholder="Liquid expression"
        />
      </PropertyGroup>

      {/* Type-specific properties */}
      <PropertyGroup label={elementTypeLabel(element.type)}>
        <TypeSpecificProperties
          key={element.id}
          element={element}
          onPropertyChange={onPropertyChange}
        />
      </PropertyGroup>

      {/* Style overrides */}
      <PropertyGroup label="Style Overrides" defaultOpen={false}>
        <TextField
          label="Font"
          value={overrides.fontFamily}
          onChange={(v) => {
            onStyleOverrideChange('fontFamily', v);
          }}
        />
        <NumberField
          label="Size"
          value={overrides.fontSize}
          onChange={(v) => {
            onStyleOverrideChange('fontSize', v);
          }}
          min={1}
        />
        <SelectField
          label="Weight"
          value={overrides.fontWeight}
          onChange={(v) => {
            onStyleOverrideChange('fontWeight', v);
          }}
          options={FONT_WEIGHT_OPTIONS}
          allowEmpty
        />
        <SelectField
          label="Style"
          value={overrides.fontStyle}
          onChange={(v) => {
            onStyleOverrideChange('fontStyle', v);
          }}
          options={FONT_STYLE_OPTIONS}
          allowEmpty
        />
        <ColorField
          label="Color"
          value={overrides.color}
          onChange={(v) => {
            onStyleOverrideChange('color', v);
          }}
        />
        <ColorField
          label="Background"
          value={
            typeof overrides.backgroundColor === 'string' ? overrides.backgroundColor : undefined
          }
          onChange={(v) => {
            onStyleOverrideChange('backgroundColor', v);
          }}
        />
        <SelectField
          label="Align"
          value={overrides.textAlign}
          onChange={(v) => {
            onStyleOverrideChange('textAlign', v);
          }}
          options={TEXT_ALIGN_OPTIONS}
          allowEmpty
        />
        <NumberField
          label="Line H."
          value={overrides.lineHeight}
          onChange={(v) => {
            onStyleOverrideChange('lineHeight', v);
          }}
          min={0.5}
          step={0.1}
        />
        <NumberField
          label="Opacity"
          value={overrides.opacity}
          onChange={(v) => {
            onStyleOverrideChange('opacity', v);
          }}
          min={0}
          max={1}
          step={0.1}
        />
        <NumberField
          label="Border W."
          value={overrides.borderWidth}
          onChange={(v) => {
            onStyleOverrideChange('borderWidth', v);
          }}
          min={0}
        />
        <ColorField
          label="Border C."
          value={overrides.borderColor}
          onChange={(v) => {
            onStyleOverrideChange('borderColor', v);
          }}
        />
        <NumberField
          label="Radius"
          value={overrides.borderRadius}
          onChange={(v) => {
            onStyleOverrideChange('borderRadius', v);
          }}
          min={0}
        />
        <NumberField
          label="Padding"
          value={typeof overrides.padding === 'number' ? overrides.padding : undefined}
          onChange={(v) => {
            onStyleOverrideChange('padding', v);
          }}
          min={0}
        />
      </PropertyGroup>
    </div>
  );
}

function TypeSpecificProperties({
  element,
  onPropertyChange,
}: {
  element: Element;
  onPropertyChange: (key: string, value: unknown) => void;
}) {
  switch (element.type) {
    case 'text':
      return <TextProperties element={element} onPropertyChange={onPropertyChange} />;
    case 'image':
      return <ImageProperties element={element} onPropertyChange={onPropertyChange} />;
    case 'line':
      return <LineProperties element={element} onPropertyChange={onPropertyChange} />;
    case 'shape':
      return <ShapeProperties element={element} onPropertyChange={onPropertyChange} />;
    default:
      return <ElementTypeProperties element={element} onPropertyChange={onPropertyChange} />;
  }
}
