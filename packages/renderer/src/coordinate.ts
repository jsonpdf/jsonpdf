/**
 * Translate from template coordinates (top-left origin) to pdf-lib
 * coordinates (bottom-left origin).
 *
 * Template: (0, 0) = top-left of content area, Y goes down.
 * pdf-lib:  (0, 0) = bottom-left of page, Y goes up.
 *
 * Returns the top of the element in pdf-lib coordinates.
 */
export function templateToPdf(
  templateX: number,
  templateY: number,
  pageHeight: number,
  marginTop: number,
  marginLeft: number,
): { x: number; y: number } {
  return {
    x: marginLeft + templateX,
    y: pageHeight - marginTop - templateY,
  };
}
