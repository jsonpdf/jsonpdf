import type { PDFPage, PDFDocument } from 'pdf-lib';
import { PDFName, PDFNumber, PDFArray, PDFDict, PDFRawStream } from 'pdf-lib';
import { parseColor } from '@jsonpdf/core';
import type { Gradient, LinearGradient, RadialGradient } from '@jsonpdf/core';

/**
 * Draw a gradient-filled rectangle on a PDF page.
 *
 * Uses PDF shading patterns (Type 2 axial for linear, Type 3 radial for radial).
 * The gradient is clipped to the specified rectangle.
 *
 * @param page - The pdf-lib page
 * @param doc - The pdf-lib document
 * @param x - Left edge in pdf-lib coordinates
 * @param y - Bottom edge in pdf-lib coordinates (NOT top)
 * @param width - Rectangle width
 * @param height - Rectangle height
 * @param gradient - The gradient definition
 * @param opacity - Optional opacity (0-1)
 */
export function drawGradientRect(
  page: PDFPage,
  doc: PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  gradient: Gradient,
  opacity?: number,
): void {
  const context = doc.context;

  // Build the color function from stops
  const colorFunction = buildColorFunction(context, gradient.stops);

  // Build the shading dictionary
  let shadingDict: PDFDict;
  if (gradient.type === 'linear') {
    shadingDict = buildAxialShading(context, gradient, x, y, width, height, colorFunction);
  } else {
    shadingDict = buildRadialShading(context, gradient, x, y, width, height, colorFunction);
  }

  const shadingRef = context.register(shadingDict);

  // Generate unique name for this shading resource
  const shadingName = `Sh${String(shadingRef.objectNumber)}`;

  // Add shading to page resources
  const pageDict = page.node;
  let resources = pageDict.get(PDFName.of('Resources')) as PDFDict | undefined;
  if (!resources) {
    resources = context.obj({});
    pageDict.set(PDFName.of('Resources'), resources);
  }
  let shadingResources = resources.get(PDFName.of('Shading')) as PDFDict | undefined;
  if (!shadingResources) {
    shadingResources = context.obj({});
    resources.set(PDFName.of('Shading'), shadingResources);
  }
  shadingResources.set(PDFName.of(shadingName), shadingRef);

  // Build graphics state for opacity if needed
  let gsName: string | undefined;
  if (opacity !== undefined && opacity < 1) {
    const gsDict = context.obj({
      Type: 'ExtGState',
      ca: PDFNumber.of(opacity),
      CA: PDFNumber.of(opacity),
    });
    const gsRef = context.register(gsDict);
    gsName = `GS${String(gsRef.objectNumber)}`;
    let extGState = resources.get(PDFName.of('ExtGState')) as PDFDict | undefined;
    if (!extGState) {
      extGState = context.obj({});
      resources.set(PDFName.of('ExtGState'), extGState);
    }
    extGState.set(PDFName.of(gsName), gsRef);
  }

  // Build content stream operators:
  // q (save state) → clip to rect → optional gs → sh (paint shading) → Q (restore)
  const ops: string[] = [];
  ops.push('q'); // save graphics state
  // Clip to rectangle
  ops.push(`${n(x)} ${n(y)} ${n(width)} ${n(height)} re W n`);
  // Apply opacity graphics state if needed
  if (gsName) {
    ops.push(`/${gsName} gs`);
  }
  // Paint the shading
  ops.push(`/${shadingName} sh`);
  ops.push('Q'); // restore graphics state

  // Inject the operators into the page content stream
  const stream = PDFRawStream.of(context.obj({}), new TextEncoder().encode(ops.join('\n')));
  const streamRef = context.register(stream);

  // Append to page contents
  const currentContents = pageDict.get(PDFName.of('Contents'));
  if (currentContents instanceof PDFArray) {
    currentContents.push(streamRef);
  } else if (currentContents) {
    const newArray = PDFArray.withContext(context);
    newArray.push(currentContents);
    newArray.push(streamRef);
    pageDict.set(PDFName.of('Contents'), newArray);
  } else {
    pageDict.set(PDFName.of('Contents'), streamRef);
  }
}

/** Format a number for PDF operators (avoid scientific notation). */
function n(v: number): string {
  return Number(v.toFixed(4)).toString();
}

interface GradientStop {
  color: string;
  position: number;
}

/**
 * Build a PDF Function object for gradient color interpolation.
 * Two stops → Type 2 exponential. More → Type 3 stitching.
 */
function buildColorFunction(context: PDFDocument['context'], stops: GradientStop[]): PDFDict {
  if (stops.length === 2) {
    const c0 = parseColor(stops[0].color);
    const c1 = parseColor(stops[1].color);
    return context.obj({
      FunctionType: 2,
      Domain: [0, 1],
      C0: [c0.r, c0.g, c0.b],
      C1: [c1.r, c1.g, c1.b],
      N: 1,
    }) as unknown as PDFDict;
  }

  // Multi-stop: Type 3 stitching function
  const functions: PDFDict[] = [];
  const bounds: number[] = [];
  const encode: number[] = [];

  for (let i = 0; i < stops.length - 1; i++) {
    const c0 = parseColor(stops[i].color);
    const c1 = parseColor(stops[i + 1].color);
    functions.push(
      context.obj({
        FunctionType: 2,
        Domain: [0, 1],
        C0: [c0.r, c0.g, c0.b],
        C1: [c1.r, c1.g, c1.b],
        N: 1,
      }) as unknown as PDFDict,
    );
    if (i > 0) {
      bounds.push(stops[i].position);
    }
    encode.push(0, 1);
  }

  return context.obj({
    FunctionType: 3,
    Domain: [0, 1],
    Functions: functions,
    Bounds: bounds,
    Encode: encode,
  }) as unknown as PDFDict;
}

/** Build a Type 2 (axial/linear) shading dictionary. */
function buildAxialShading(
  context: PDFDocument['context'],
  gradient: LinearGradient,
  x: number,
  y: number,
  width: number,
  height: number,
  colorFunction: PDFDict,
): PDFDict {
  // Convert angle to start/end coordinates
  const angleRad = (gradient.angle * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  // Project the rectangle corners onto the gradient direction
  const cx = x + width / 2;
  const cy = y + height / 2;
  const halfDiag = Math.abs((cos * width) / 2) + Math.abs((sin * height) / 2);

  const x0 = cx - cos * halfDiag;
  const y0 = cy + sin * halfDiag; // PDF Y is upward, angle 90 = top-to-bottom = -Y
  const x1 = cx + cos * halfDiag;
  const y1 = cy - sin * halfDiag;

  return context.obj({
    ShadingType: 2,
    ColorSpace: 'DeviceRGB',
    Coords: [x0, y0, x1, y1],
    Function: colorFunction,
    Extend: [true, true],
  }) as unknown as PDFDict;
}

/** Build a Type 3 (radial) shading dictionary. */
function buildRadialShading(
  context: PDFDocument['context'],
  gradient: RadialGradient,
  x: number,
  y: number,
  width: number,
  height: number,
  colorFunction: PDFDict,
): PDFDict {
  const cx = x + (gradient.cx ?? 0.5) * width;
  const cy = y + (gradient.cy ?? 0.5) * height;
  const r = (gradient.radius ?? 0.5) * Math.min(width, height);

  return context.obj({
    ShadingType: 3,
    ColorSpace: 'DeviceRGB',
    Coords: [cx, cy, 0, cx, cy, r],
    Function: colorFunction,
    Extend: [true, true],
  }) as unknown as PDFDict;
}
