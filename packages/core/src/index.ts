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
  GradientStop,
  LinearGradient,
  RadialGradient,
  Gradient,
  BackgroundColor,
  BorderSide,
  PaddingValue,
  Style,
  FontDeclaration,
} from './types.js';

// Schema
export { templateSchema } from './schema.js';

// Validation
export { validateTemplateSchema, validateWithSchema } from './validation.js';
export { makeExpressionAware, buildPluginAwareTemplateSchema } from './expression-schema.js';
export type { PluginSchemaEntry } from './expression-schema.js';

// Utilities
export { parseColor, toHex, isGradient, type RGB } from './utils/colors.js';
export { mmToPoints, inchesToPoints, pointsToMm, pointsToInches } from './utils/units.js';
export { generateId } from './utils/ids.js';
