import type { Band, JSONSchema } from '@jsonpdf/core';

export interface FrameProps {
  /** Nested bands to expand and render within the frame. */
  bands: Band[];
}

export const framePropsSchema: JSONSchema = {
  type: 'object',
  required: ['bands'],
  additionalProperties: false,
  properties: {
    bands: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['id', 'type', 'height', 'elements'],
      },
    },
  },
};

export const FRAME_DEFAULTS: FrameProps = { bands: [] };
