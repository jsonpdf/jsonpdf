import type { PDFDocument, PDFPage } from 'pdf-lib';
import type { MeasureContext, RenderContext, FontMap, ImageCache } from '@jsonpdf/plugins';
import type { Element, Style } from '@jsonpdf/core';
import { resolveElementStyle, resolveNamedStyle, normalizePadding } from './style-resolver.js';
import { templateToPdf } from './coordinate.js';

/** Create a MeasureContext for an element. */
export function createMeasureContext(
  element: Element,
  fonts: FontMap,
  styles: Record<string, Style>,
  pdfDoc: PDFDocument,
  imageCache: ImageCache,
): MeasureContext {
  const elementStyle = resolveElementStyle(element, styles);
  const padding = normalizePadding(elementStyle.padding);
  return {
    fonts,
    availableWidth: element.width - padding.left - padding.right,
    availableHeight: element.height - padding.top - padding.bottom,
    resolveStyle: (name: string) => resolveNamedStyle(name, styles),
    elementStyle,
    pdfDoc,
    imageCache,
  };
}

/** Create a RenderContext for an element. */
export function createRenderContext(
  element: Element,
  fonts: FontMap,
  styles: Record<string, Style>,
  page: PDFPage,
  bandOffsetY: number,
  pageHeight: number,
  marginTop: number,
  marginLeft: number,
  pdfDoc: PDFDocument,
  imageCache: ImageCache,
  measuredHeight?: number,
): RenderContext {
  const elementStyle = resolveElementStyle(element, styles);
  const padding = normalizePadding(elementStyle.padding);
  const { x, y } = templateToPdf(
    element.x,
    bandOffsetY + element.y,
    pageHeight,
    marginTop,
    marginLeft,
  );
  const height = measuredHeight ?? element.height;
  return {
    fonts,
    availableWidth: element.width - padding.left - padding.right,
    availableHeight: height - padding.top - padding.bottom,
    resolveStyle: (name: string) => resolveNamedStyle(name, styles),
    elementStyle,
    pdfDoc,
    imageCache,
    page,
    x: x + padding.left,
    y: y - padding.top,
    width: element.width - padding.left - padding.right,
    height: height - padding.top - padding.bottom,
  };
}
