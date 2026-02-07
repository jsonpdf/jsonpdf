export { renderPdf, type RenderOptions, type RenderResult } from './renderer.js';
export { createExpressionEngine, type ExpressionEngine } from './expression.js';
export { validateData, resolveDotPath, buildScope } from './data.js';
export { mergePageConfig, type LayoutBand, type LayoutPage, type LayoutResult } from './layout.js';
export type { BandInstance, ExpandedSection } from './band-expander.js';
export {
  embedFonts,
  collectFontSpecs,
  resolveStandardFont,
  mapWeight,
  isStandardFont,
  type FontSpec,
} from './fonts.js';
export { loadFontBytes } from './font-loader.js';
export { collectAnchors } from './anchors.js';
export { buildPdfOutline, type BookmarkEntry } from './bookmarks.js';
export { computeColumnLayout, type ColumnLayout } from './columns.js';
