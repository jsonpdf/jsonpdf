import type { JSONSchema } from '@jsonpdf/core';

/** Supported barcode/QR format identifiers (bwip-js bcid values). */
export const SUPPORTED_FORMATS = [
  // 2D codes
  'qrcode',
  'datamatrix',
  'pdf417',
  'azteccode',
  'azteccodecompact',
  'maxicode',
  // Linear codes
  'code128',
  'code39',
  'ean13',
  'ean8',
  'upca',
  'upce',
  'itf14',
  'codabar',
  'interleaved2of5',
  'code93',
  'isbn',
  'issn',
  'gs1-128',
] as const;

export type BarcodeFormat = (typeof SUPPORTED_FORMATS)[number];

export interface BarcodeProps {
  /** Data to encode (required). */
  value: string;
  /** Barcode type — bwip-js bcid (required). */
  format: BarcodeFormat;
  /** Bar/module color as hex string. Default '#000000'. */
  barColor?: string;
  /** Background color as hex string. Default '#FFFFFF'. */
  backgroundColor?: string;
  /** Show human-readable text below linear barcodes. Default false. */
  includeText?: boolean;
  /** Font size for the human-readable text in points. */
  textSize?: number;
  /** Module scale factor. Default 3. Higher = larger PNG before fitting. */
  scale?: number;
  /** Bar height in mm for linear barcodes. Default 10. Ignored for 2D codes. */
  moduleHeight?: number;
  /** Quiet zone padding in modules. Default 2. */
  padding?: number;
}

export const barcodePropsSchema: JSONSchema = {
  type: 'object',
  required: ['value', 'format'],
  additionalProperties: false,
  properties: {
    value: { type: 'string', minLength: 1 },
    format: { type: 'string', enum: [...SUPPORTED_FORMATS] },
    barColor: { type: 'string' },
    backgroundColor: { type: 'string' },
    includeText: { type: 'boolean' },
    textSize: { type: 'number', minimum: 1 },
    scale: { type: 'number', minimum: 1 },
    moduleHeight: { type: 'number', minimum: 1 },
    padding: { type: 'number', minimum: 0 },
  },
};

export const BARCODE_DEFAULTS: BarcodeProps = {
  value: '',
  format: 'qrcode',
  barColor: '#000000',
  backgroundColor: '#FFFFFF',
  includeText: false,
  scale: 3,
  moduleHeight: 10,
  padding: 2,
};

/** Set of 2D barcode formats where moduleHeight does not apply. */
export const TWO_D_FORMATS: ReadonlySet<string> = new Set([
  'qrcode',
  'datamatrix',
  'pdf417',
  'azteccode',
  'azteccodecompact',
  'maxicode',
]);
