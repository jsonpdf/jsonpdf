import type { Element, Band } from '@jsonpdf/core';

/** Count how many elements reference a given style name. */
export function countStyleUsage(
  styleName: string,
  template: { sections: Array<{ bands: Array<{ elements: Element[] }> }> },
): number {
  let count = 0;
  function walkElements(elements: Element[]) {
    for (const el of elements) {
      if (el.style === styleName) count++;
      if (el.conditionalStyles) {
        for (const cs of el.conditionalStyles) {
          if (cs.style === styleName) count++;
        }
      }
      if (el.elements) walkElements(el.elements);
      const bands = el.properties.bands as Band[] | undefined;
      if (Array.isArray(bands)) {
        for (const band of bands) {
          walkElements(band.elements);
        }
      }
    }
  }
  for (const section of template.sections) {
    for (const band of section.bands) {
      walkElements(band.elements);
    }
  }
  return count;
}
