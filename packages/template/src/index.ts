export { createTemplate } from './factory.js';
export { validateTemplate } from './validation.js';
export { migrateTemplate } from './migration.js';
export {
  // Add
  addSection,
  addBand,
  addElement,
  addStyle,
  addFont,
  // Update
  updateSection,
  updateBand,
  updateElement,
  updateStyle,
  updateTemplate,
  // Remove
  removeSection,
  removeBand,
  removeElement,
  removeStyle,
  removeFont,
  // Move
  moveSection,
  moveBand,
  moveElement,
  reorderElement,
  // Clone
  cloneSection,
  cloneBand,
  cloneElement,
  // Utility
  deepCloneWithNewIds,
} from './operations.js';
export {
  findSection,
  findBand,
  findElement,
  findFont,
  getElementsByType,
  getAllBandIds,
  getAllElementIds,
  type FindBandResult,
  type FindElementResult,
} from './queries.js';
export { generateSampleData, type SampleDataOptions } from './sample-data.js';
