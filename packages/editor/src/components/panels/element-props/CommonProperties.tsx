import type { Element } from '@jsonpdf/core';
import { NumberField, TextField, SelectField, CheckboxField, ColorField } from '../../fields';
import styles from '../Panel.module.css';

interface CommonPropertiesProps {
  element: Element;
  onPropertyChange: (key: string, value: unknown) => void;
}

// ---- Container ----

const LAYOUT_OPTIONS = [
  { value: 'horizontal', label: 'Horizontal' },
  { value: 'vertical', label: 'Vertical' },
  { value: 'absolute', label: 'Absolute' },
  { value: 'grid', label: 'Grid' },
];

const ALIGN_OPTIONS = [
  { value: 'start', label: 'Start' },
  { value: 'center', label: 'Center' },
  { value: 'end', label: 'End' },
];

function ContainerProperties({ element, onPropertyChange }: CommonPropertiesProps) {
  const layout = (element.properties.layout as string | undefined) ?? 'absolute';

  return (
    <>
      <SelectField
        label="Layout"
        value={layout}
        onChange={(v) => {
          onPropertyChange('layout', v ?? 'absolute');
        }}
        options={LAYOUT_OPTIONS}
      />
      <NumberField
        label="Gap"
        value={element.properties.gap as number | undefined}
        onChange={(v) => {
          onPropertyChange('gap', v);
        }}
        min={0}
      />
      {layout === 'grid' && (
        <NumberField
          label="Grid Cols"
          value={element.properties.gridColumns as number | undefined}
          onChange={(v) => {
            onPropertyChange('gridColumns', v);
          }}
          min={1}
          step={1}
          placeholder="2"
        />
      )}
      <SelectField
        label="Align"
        value={element.properties.alignItems as string | undefined}
        onChange={(v) => {
          onPropertyChange('alignItems', v);
        }}
        options={ALIGN_OPTIONS}
        allowEmpty
      />
    </>
  );
}

// ---- Barcode ----

const BARCODE_FORMAT_OPTIONS = [
  { value: 'qrcode', label: 'QR Code' },
  { value: 'datamatrix', label: 'Data Matrix' },
  { value: 'pdf417', label: 'PDF417' },
  { value: 'code128', label: 'Code 128' },
  { value: 'code39', label: 'Code 39' },
  { value: 'ean13', label: 'EAN-13' },
  { value: 'ean8', label: 'EAN-8' },
  { value: 'upca', label: 'UPC-A' },
];

function BarcodeProperties({ element, onPropertyChange }: CommonPropertiesProps) {
  return (
    <>
      <TextField
        label="Value"
        value={element.properties.value as string | undefined}
        onChange={(v) => {
          onPropertyChange('value', v ?? '');
        }}
      />
      <SelectField
        label="Format"
        value={(element.properties.format as string | undefined) ?? 'qrcode'}
        onChange={(v) => {
          onPropertyChange('format', v ?? 'qrcode');
        }}
        options={BARCODE_FORMAT_OPTIONS}
      />
      <ColorField
        label="Bar Color"
        value={element.properties.barColor as string | undefined}
        onChange={(v) => {
          onPropertyChange('barColor', v);
        }}
      />
      <ColorField
        label="Background"
        value={element.properties.backgroundColor as string | undefined}
        onChange={(v) => {
          onPropertyChange('backgroundColor', v);
        }}
      />
      <CheckboxField
        label="Show Text"
        value={element.properties.includeText as boolean | undefined}
        onChange={(v) => {
          onPropertyChange('includeText', v);
        }}
      />
      <NumberField
        label="Text Size"
        value={element.properties.textSize as number | undefined}
        onChange={(v) => {
          onPropertyChange('textSize', v);
        }}
        min={1}
      />
      <NumberField
        label="Scale"
        value={element.properties.scale as number | undefined}
        onChange={(v) => {
          onPropertyChange('scale', v);
        }}
        min={1}
      />
      <NumberField
        label="Bar Height"
        value={element.properties.moduleHeight as number | undefined}
        onChange={(v) => {
          onPropertyChange('moduleHeight', v);
        }}
        min={1}
      />
      <NumberField
        label="Padding"
        value={element.properties.padding as number | undefined}
        onChange={(v) => {
          onPropertyChange('padding', v);
        }}
        min={0}
      />
    </>
  );
}

// ---- List ----

const LIST_TYPE_OPTIONS = [
  { value: 'bullet', label: 'Bullet' },
  { value: 'numbered', label: 'Numbered' },
  { value: 'lettered', label: 'Lettered' },
];

function ListProperties({ element, onPropertyChange }: CommonPropertiesProps) {
  const listType = (element.properties.listType as string | undefined) ?? 'bullet';
  const items = element.properties.items as unknown[] | undefined;

  return (
    <>
      <SelectField
        label="List Type"
        value={listType}
        onChange={(v) => {
          onPropertyChange('listType', v);
        }}
        options={LIST_TYPE_OPTIONS}
      />
      {listType === 'bullet' && (
        <TextField
          label="Bullet"
          value={element.properties.bulletStyle as string | undefined}
          onChange={(v) => {
            onPropertyChange('bulletStyle', v);
          }}
          placeholder="&bull;"
        />
      )}
      <NumberField
        label="Indent"
        value={element.properties.indent as number | undefined}
        onChange={(v) => {
          onPropertyChange('indent', v);
        }}
        min={0}
      />
      <NumberField
        label="Spacing"
        value={element.properties.itemSpacing as number | undefined}
        onChange={(v) => {
          onPropertyChange('itemSpacing', v);
        }}
        min={0}
      />
      <div className={styles.readOnlyLabel}>
        {items ? `${String(items.length)} items` : 'No items'}
      </div>
    </>
  );
}

// ---- Table (MVP: editable simple fields, complex fields read-only) ----

const FIT_OPTIONS = [
  { value: 'contain', label: 'Contain' },
  { value: 'cover', label: 'Cover' },
  { value: 'fill', label: 'Fill' },
  { value: 'none', label: 'None' },
];

function TableProperties({ element, onPropertyChange }: CommonPropertiesProps) {
  const columns = element.properties.columns as unknown[] | undefined;
  const rows = element.properties.rows as unknown[] | undefined;

  return (
    <>
      <CheckboxField
        label="Header"
        value={element.properties.showHeader as boolean | undefined}
        onChange={(v) => {
          onPropertyChange('showHeader', v);
        }}
      />
      <CheckboxField
        label="Repeat Hdr"
        value={element.properties.headerRepeat as boolean | undefined}
        onChange={(v) => {
          onPropertyChange('headerRepeat', v);
        }}
      />
      <NumberField
        label="Border W."
        value={element.properties.borderWidth as number | undefined}
        onChange={(v) => {
          onPropertyChange('borderWidth', v);
        }}
        min={0}
        step={0.5}
      />
      <ColorField
        label="Border Color"
        value={element.properties.borderColor as string | undefined}
        onChange={(v) => {
          onPropertyChange('borderColor', v);
        }}
      />
      <NumberField
        label="Cell Pad"
        value={element.properties.cellPadding as number | undefined}
        onChange={(v) => {
          onPropertyChange('cellPadding', v);
        }}
        min={0}
      />
      <div className={styles.readOnlyLabel}>
        {columns ? `${String(columns.length)} columns` : 'No columns'},{' '}
        {rows ? `${String(rows.length)} rows` : 'no rows'}
      </div>
    </>
  );
}

// ---- Chart (MVP: simple fields editable, spec read-only) ----

function ChartProperties({ element, onPropertyChange }: CommonPropertiesProps) {
  return (
    <>
      <SelectField
        label="Fit"
        value={(element.properties.fit as string | undefined) ?? 'contain'}
        onChange={(v) => {
          onPropertyChange('fit', v);
        }}
        options={FIT_OPTIONS}
      />
      <NumberField
        label="Scale"
        value={element.properties.scale as number | undefined}
        onChange={(v) => {
          onPropertyChange('scale', v);
        }}
        min={0.5}
        step={0.5}
      />
      <ColorField
        label="Background"
        value={element.properties.background as string | undefined}
        onChange={(v) => {
          onPropertyChange('background', v);
        }}
      />
      <div className={styles.readOnlyLabel}>Vega-Lite spec (JSON)</div>
    </>
  );
}

// ---- Frame (MVP: read-only) ----

function FrameProperties({ element }: CommonPropertiesProps) {
  const bands = element.properties.bands as unknown[] | undefined;
  return (
    <div className={styles.readOnlyLabel}>
      {bands ? `${String(bands.length)} bands` : 'No bands'}
    </div>
  );
}

// ---- Switch ----

export function ElementTypeProperties({ element, onPropertyChange }: CommonPropertiesProps) {
  switch (element.type) {
    case 'container':
      return <ContainerProperties element={element} onPropertyChange={onPropertyChange} />;
    case 'barcode':
      return <BarcodeProperties element={element} onPropertyChange={onPropertyChange} />;
    case 'list':
      return <ListProperties element={element} onPropertyChange={onPropertyChange} />;
    case 'table':
      return <TableProperties element={element} onPropertyChange={onPropertyChange} />;
    case 'chart':
      return <ChartProperties element={element} onPropertyChange={onPropertyChange} />;
    case 'frame':
      return <FrameProperties element={element} onPropertyChange={onPropertyChange} />;
    default:
      return null;
  }
}
