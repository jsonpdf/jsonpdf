import type { Template, Section, Band, Element, FontDeclaration } from '@jsonpdf/core';

/** Find a section by ID. */
export function findSection(template: Template, sectionId: string): Section | undefined {
  return template.sections.find((s) => s.id === sectionId);
}

/** Result of finding a band — includes parent context. */
export interface FindBandResult {
  band: Band;
  section: Section;
  sectionIndex: number;
  bandIndex: number;
}

/** Find a band by ID. Returns the band and its parent section context. */
export function findBand(template: Template, bandId: string): FindBandResult | undefined {
  for (let si = 0; si < template.sections.length; si++) {
    const section = template.sections[si];
    for (let bi = 0; bi < section.bands.length; bi++) {
      if (section.bands[bi].id === bandId) {
        return { band: section.bands[bi], section, sectionIndex: si, bandIndex: bi };
      }
    }
  }
  return undefined;
}

/** Result of finding an element — includes parent context and index within its immediate parent's elements array. */
export interface FindElementResult {
  element: Element;
  band: Band;
  section: Section;
  elementIndex: number;
}

/** Recursively search elements (including nested containers) for an element by ID. */
function findElementInList(
  elements: Element[],
  elementId: string,
): { element: Element; index: number } | undefined {
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (el.id === elementId) return { element: el, index: i };
    if (el.elements) {
      const found = findElementInList(el.elements, elementId);
      if (found) return found;
    }
  }
  return undefined;
}

/** Find an element by ID. Searches nested containers. Returns the element and its parent context. */
export function findElement(template: Template, elementId: string): FindElementResult | undefined {
  for (const section of template.sections) {
    for (const band of section.bands) {
      const result = findElementInList(band.elements, elementId);
      if (result) {
        return { element: result.element, band, section, elementIndex: result.index };
      }
    }
  }
  return undefined;
}

/** Recursively collect elements of a specific type. */
function collectByType(elements: Element[], type: string, result: Element[]): void {
  for (const el of elements) {
    if (el.type === type) result.push(el);
    if (el.elements) collectByType(el.elements, type, result);
  }
}

/** Get all elements of a specific type (including nested containers). */
export function getElementsByType(template: Template, type: string): Element[] {
  const result: Element[] = [];
  for (const section of template.sections) {
    for (const band of section.bands) {
      collectByType(band.elements, type, result);
    }
  }
  return result;
}

/** Get all band IDs in template order. */
export function getAllBandIds(template: Template): string[] {
  const ids: string[] = [];
  for (const section of template.sections) {
    for (const band of section.bands) {
      ids.push(band.id);
    }
  }
  return ids;
}

/** Recursively collect all element IDs. */
function collectElementIds(elements: Element[], ids: string[]): void {
  for (const el of elements) {
    ids.push(el.id);
    if (el.elements) collectElementIds(el.elements, ids);
  }
}

/** Get all element IDs in template order (including nested containers). */
export function getAllElementIds(template: Template): string[] {
  const ids: string[] = [];
  for (const section of template.sections) {
    for (const band of section.bands) {
      collectElementIds(band.elements, ids);
    }
  }
  return ids;
}

/** Find a font declaration by family (and optional weight/style). */
export function findFont(
  template: Template,
  family: string,
  weight?: number,
  fontStyle?: 'normal' | 'italic',
): FontDeclaration | undefined {
  return template.fonts.find((f) => {
    if (f.family !== family) return false;
    if (weight !== undefined && f.weight !== weight) return false;
    if (fontStyle !== undefined && f.style !== fontStyle) return false;
    return true;
  });
}
