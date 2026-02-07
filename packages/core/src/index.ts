// Types
export type {
  JSONSchema,
  ValidationResult,
  ValidationError,
  Template,
  PageConfig,
  Section,
  BandType,
  Band,
  Element,
  ConditionalStyle,
  RichContent,
  StyledRun,
  BorderSide,
  PaddingValue,
  Style,
  FontDeclaration,
} from './types.js';

// Schema
export { templateSchema } from './schema.js';

// Validation
export { validateTemplateSchema, validateWithSchema } from './validation.js';

// Utilities
export { parseColor, toHex, type RGB } from './utils/colors.js';
export { mmToPoints, inchesToPoints, pointsToMm, pointsToInches } from './utils/units.js';
export { generateId } from './utils/ids.js';
