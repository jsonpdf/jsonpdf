// Plugin system types
export type {
  Plugin,
  MeasureContext,
  RenderContext,
  FontMap,
  EmbeddedImage,
  ImageCache,
} from './types.js';
export { fontKey } from './types.js';

// Registry
export {
  PluginRegistry,
  registerPlugin,
  getPlugin,
  hasPlugin,
  getAllPlugins,
  clearPlugins,
} from './registry.js';

// Shared plugin utilities
export { getFont, getLineHeight } from './utils.js';

// Text plugin
export { textPlugin, type TextProps } from './text/text-plugin.js';
export { wrapText, measureTextWidth, type WrapOptions } from './text/word-wrap.js';

// Line plugin
export { linePlugin, type LineProps } from './line/line-plugin.js';

// List plugin
export { listPlugin, type ListProps } from './list/list-plugin.js';
export type { ListItem, ListItemInput } from './list/list-types.js';
export { isListItem, toListItem } from './list/list-types.js';

// Shape plugin
export { shapePlugin, type ShapeProps, roundedRectPath } from './shape/shape-plugin.js';

// Image plugin
export { imagePlugin, type ImageProps, computeFitDimensions } from './image/image-plugin.js';
export { createImageCache, loadImageBytes, detectFormat } from './image/image-loader.js';
export type { ImageFormat, LoadedImage } from './image/image-loader.js';

// Container plugin
export { containerPlugin, type ContainerProps } from './container/container-plugin.js';

// Table plugin
export { tablePlugin } from './table/table-plugin.js';
export { type TableProps, type TableColumn, computeColumnWidths } from './table/table-types.js';

// Barcode plugin
export { barcodePlugin } from './barcode/barcode-plugin.js';
export {
  type BarcodeProps,
  type BarcodeFormat,
  SUPPORTED_FORMATS,
} from './barcode/barcode-types.js';
export { generateBarcode, createBarcodeCache, toBwipColor } from './barcode/barcode-generator.js';
export type { BarcodeCache } from './barcode/barcode-generator.js';
