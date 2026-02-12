# @jsonpdf/plugins

Element type implementations for the jsonpdf rendering pipeline. Each plugin provides `measure()` and `render()` methods for a specific visual element type.

Plugins receive resolved values and never touch LiquidJS — expression resolution is handled upstream by the renderer.

## Plugins

| Plugin      | Description                                                                 |
| ----------- | --------------------------------------------------------------------------- |
| `text`      | Text rendering with word wrapping and decoration (underline, strikethrough) |
| `line`      | Line drawing with configurable dash patterns                                |
| `list`      | Bullet, numbered, and lettered lists                                        |
| `shape`     | Rectangle, circle, ellipse, and rounded rectangle                           |
| `image`     | Image rendering with fit modes (contain, cover, stretch, none)              |
| `container` | Horizontal, vertical, absolute, and grid layouts                            |
| `table`     | Table rendering with automatic column width calculation                     |
| `barcode`   | Barcode and QR code generation via bwip-js                                  |
| `chart`     | Chart rendering via Vega-Lite                                               |
| `frame`     | Nested band container for sub-layouts                                       |

## Platform abstraction

The package uses Node.js subpath imports (`#platform/*`) to swap implementations between Node and browser environments:

| Module                     | Node                       | Browser                                            |
| -------------------------- | -------------------------- | -------------------------------------------------- |
| `#platform/fs`             | Node `fs` for file reading | Throws (files must be inlined)                     |
| `#platform/svg-rasterizer` | `@resvg/resvg-js` (native) | `@resvg/resvg-wasm`                                |
| `#platform/init`           | No-op                      | Requires `initBrowser(resvgWasm)` before rendering |

Browser consumers must call `initBrowser(resvgWasm)` once before rendering.

## Usage

```ts
import { textPlugin, imagePlugin, PluginRegistry } from '@jsonpdf/plugins';

// Plugins are registered automatically when imported
// Use the registry to look up plugins by element type
const plugin = PluginRegistry.get('text');
```

## Exports

| Category  | Exports                                                                                       |
| --------- | --------------------------------------------------------------------------------------------- |
| Registry  | `PluginRegistry`, `registerPlugin`, `getPlugin`, `hasPlugin`, `getAllPlugins`, `clearPlugins` |
| Text      | `textPlugin`, `wrapText`, `measureTextWidth`                                                  |
| Line      | `linePlugin`                                                                                  |
| List      | `listPlugin`, `ListItem`, `isListItem`, `toListItem`                                          |
| Shape     | `shapePlugin`, `roundedRectPath`                                                              |
| Image     | `imagePlugin`, `computeFitDimensions`, `createImageCache`, `loadImageBytes`, `rasterizeSvg`   |
| Container | `containerPlugin`                                                                             |
| Table     | `tablePlugin`, `TableColumn`, `computeColumnWidths`                                           |
| Barcode   | `barcodePlugin`, `generateBarcode`, `createBarcodeCache`, `BarcodeFormat`                     |
| Chart     | `chartPlugin`, `generateChart`, `createChartCache`, `buildFinalSpec`                          |
| Frame     | `framePlugin`                                                                                 |
| Platform  | `readFileBytes`, `uint8ArrayToBase64`, `initBrowser`                                          |
