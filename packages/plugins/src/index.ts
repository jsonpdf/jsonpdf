// Plugin system types
export type { Plugin, MeasureContext, RenderContext, FontMap } from './types.js';
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
export { wrapText, measureTextWidth } from './text/word-wrap.js';

// Line plugin
export { linePlugin, type LineProps } from './line/line-plugin.js';

// List plugin
export { listPlugin, type ListProps } from './list/list-plugin.js';
export type { ListItem, ListItemInput } from './list/list-types.js';
export { isListItem, toListItem } from './list/list-types.js';
