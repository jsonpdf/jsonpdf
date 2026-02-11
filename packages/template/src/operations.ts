import type {
  Template,
  PageConfig,
  Section,
  Band,
  Element,
  Style,
  StyledRun,
  FontDeclaration,
} from '@jsonpdf/core';
import { generateId } from '@jsonpdf/core';

// ---- Helpers ----

/** Recursively update an element by ID within a list of elements (handles nested containers). */
function mapElementsById(
  elements: Element[],
  elementId: string,
  fn: (el: Element) => Element,
  found: { value: boolean },
): Element[] {
  return elements.map((el) => {
    if (el.id === elementId && !found.value) {
      found.value = true;
      return fn(el);
    }
    if (el.elements) {
      const children = mapElementsById(el.elements, elementId, fn, found);
      if (children !== el.elements) return { ...el, elements: children };
    }
    return el;
  });
}

/** Recursively remove an element by ID. Returns the filtered list and the removed element. */
function removeElementById(
  elements: Element[],
  elementId: string,
  removed: { value: Element | null },
): Element[] {
  const result: Element[] = [];
  let changed = false;
  for (const el of elements) {
    if (el.id === elementId && !removed.value) {
      removed.value = el;
      changed = true;
      continue;
    }
    if (el.elements) {
      const children = removeElementById(el.elements, elementId, removed);
      if (children !== el.elements) {
        result.push({ ...el, elements: children });
        changed = true;
        continue;
      }
    }
    result.push(el);
  }
  return changed ? result : elements;
}

/** Recursively assign new IDs to a cloned tree (mutates in place — call on fresh clones only). */
function replaceAllIds(node: Record<string, unknown>): void {
  if (typeof node.id === 'string') node.id = generateId();
  if (Array.isArray(node.bands)) {
    for (const b of node.bands) replaceAllIds(b as Record<string, unknown>);
  }
  if (Array.isArray(node.elements)) {
    for (const e of node.elements) replaceAllIds(e as Record<string, unknown>);
  }
}

/** Deep-clone an object with an `id` field, assigning new IDs recursively. */
export function deepCloneWithNewIds<T extends { id: string }>(obj: T): T {
  const clone = structuredClone(obj);
  replaceAllIds(clone as Record<string, unknown>);
  return clone;
}

// ---- ADD operations ----

/** Add a section to the template. Returns a new template. */
export function addSection(template: Template, section: Section, index?: number): Template {
  const sections = [...template.sections];
  sections.splice(index ?? sections.length, 0, section);
  return { ...template, sections };
}

/** Add a band to a section. Returns a new template. */
export function addBand(
  template: Template,
  sectionId: string,
  band: Band,
  index?: number,
): Template {
  const sectionIndex = template.sections.findIndex((s) => s.id === sectionId);
  if (sectionIndex === -1) {
    throw new Error(`Section "${sectionId}" not found`);
  }
  const section = template.sections[sectionIndex];
  const bands = [...section.bands];
  bands.splice(index ?? bands.length, 0, band);
  const sections = [...template.sections];
  sections[sectionIndex] = { ...section, bands };
  return { ...template, sections };
}

/** Add an element to a band. Returns a new template. */
export function addElement(
  template: Template,
  bandId: string,
  element: Element,
  index?: number,
): Template {
  let bandFound = false;
  const sections = template.sections.map((s) => ({
    ...s,
    bands: s.bands.map((b) => {
      if (b.id !== bandId || bandFound) return b;
      bandFound = true;
      const elements = [...b.elements];
      elements.splice(index ?? elements.length, 0, element);
      return { ...b, elements };
    }),
  }));
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!bandFound) {
    throw new Error(`Band "${bandId}" not found`);
  }
  return { ...template, sections };
}

/** Add a named style to the template. Returns a new template. */
export function addStyle(template: Template, name: string, style: Style): Template {
  if (Object.hasOwn(template.styles, name)) {
    throw new Error(`Style "${name}" already exists`);
  }
  return { ...template, styles: { ...template.styles, [name]: style } };
}

/** Add a font declaration to the template. Returns a new template. */
export function addFont(template: Template, font: FontDeclaration): Template {
  return { ...template, fonts: [...template.fonts, font] };
}

// ---- UPDATE operations ----

/** Update a section's properties (excluding id and bands). Returns a new template. */
export function updateSection(
  template: Template,
  sectionId: string,
  updates: Partial<Omit<Section, 'id' | 'bands'>>,
): Template {
  const idx = template.sections.findIndex((s) => s.id === sectionId);
  if (idx === -1) {
    throw new Error(`Section "${sectionId}" not found`);
  }
  const sections = [...template.sections];
  sections[idx] = { ...sections[idx], ...updates };
  return { ...template, sections };
}

/** Update a band's properties (excluding id and elements). Returns a new template. */
export function updateBand(
  template: Template,
  bandId: string,
  updates: Partial<Omit<Band, 'id' | 'elements'>>,
): Template {
  let bandFound = false;
  const sections = template.sections.map((s) => ({
    ...s,
    bands: s.bands.map((b) => {
      if (b.id !== bandId || bandFound) return b;
      bandFound = true;
      return { ...b, ...updates };
    }),
  }));
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!bandFound) {
    throw new Error(`Band "${bandId}" not found`);
  }
  return { ...template, sections };
}

/** Update an element's properties (excluding id). Searches nested containers. Returns a new template. */
export function updateElement(
  template: Template,
  elementId: string,
  updates: Partial<Omit<Element, 'id'>>,
): Template {
  const found = { value: false };
  const sections = template.sections.map((s) => ({
    ...s,
    bands: s.bands.map((b) => {
      const elements = mapElementsById(
        b.elements,
        elementId,
        (el) => ({ ...el, ...updates }),
        found,
      );
      if (elements !== b.elements) return { ...b, elements };
      return b;
    }),
  }));
  if (!found.value) {
    throw new Error(`Element "${elementId}" not found`);
  }
  return { ...template, sections };
}

/** Update a named style (merges with existing). Returns a new template. */
export function updateStyle(template: Template, name: string, updates: Partial<Style>): Template {
  if (!Object.hasOwn(template.styles, name)) {
    throw new Error(`Style "${name}" not found`);
  }
  return {
    ...template,
    styles: { ...template.styles, [name]: { ...template.styles[name], ...updates } },
  };
}

/** Update template-level properties (excluding version and sections). Deep-merges page margins. Returns a new template. */
export function updateTemplate(
  template: Template,
  updates: Omit<Partial<Template>, 'version' | 'sections' | 'page'> & {
    page?: Partial<PageConfig>;
  },
): Template {
  const result = { ...template, ...updates, version: template.version } as Template;
  if (updates.page) {
    result.page = {
      ...template.page,
      ...updates.page,
      margins: { ...template.page.margins, ...(updates.page.margins ?? {}) },
    };
  }
  return result;
}

// ---- REMOVE operations ----

/** Remove a section by ID. Returns a new template. */
export function removeSection(template: Template, sectionId: string): Template {
  const idx = template.sections.findIndex((s) => s.id === sectionId);
  if (idx === -1) {
    throw new Error(`Section "${sectionId}" not found`);
  }
  const sections = template.sections.filter((s) => s.id !== sectionId);
  return { ...template, sections };
}

/** Remove a band by ID. Returns a new template. */
export function removeBand(template: Template, bandId: string): Template {
  let bandFound = false;
  const sections = template.sections.map((s) => {
    const bands = s.bands.filter((b) => {
      if (b.id === bandId) {
        bandFound = true;
        return false;
      }
      return true;
    });
    if (bands.length !== s.bands.length) return { ...s, bands };
    return s;
  });
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!bandFound) {
    throw new Error(`Band "${bandId}" not found`);
  }
  return { ...template, sections };
}

/** Remove an element by ID. Searches nested containers. Returns a new template. */
export function removeElement(template: Template, elementId: string): Template {
  const removed = { value: null as Element | null };
  const sections = template.sections.map((s) => ({
    ...s,
    bands: s.bands.map((b) => {
      const elements = removeElementById(b.elements, elementId, removed);
      if (elements !== b.elements) return { ...b, elements };
      return b;
    }),
  }));
  if (!removed.value) {
    throw new Error(`Element "${elementId}" not found`);
  }
  return { ...template, sections };
}

/** Remove a named style. Returns a new template. */
export function removeStyle(template: Template, name: string): Template {
  if (!Object.hasOwn(template.styles, name)) {
    throw new Error(`Style "${name}" not found`);
  }
  const styles: Record<string, Style> = {};
  for (const [key, value] of Object.entries(template.styles)) {
    if (key !== name) styles[key] = value;
  }
  return { ...template, styles };
}

/** Remove a font declaration by family (and optional weight/style). Returns a new template. */
export function removeFont(
  template: Template,
  family: string,
  weight?: number,
  fontStyle?: 'normal' | 'italic',
): Template {
  const fonts = template.fonts.filter((f) => {
    if (f.family !== family) return true;
    if (weight !== undefined && f.weight !== weight) return true;
    if (fontStyle !== undefined && f.style !== fontStyle) return true;
    return false;
  });
  if (fonts.length === template.fonts.length) {
    throw new Error(`Font "${family}" not found`);
  }
  return { ...template, fonts };
}

// ---- MOVE operations ----

/** Move a section to a new index. Returns a new template. */
export function moveSection(template: Template, sectionId: string, toIndex: number): Template {
  const fromIndex = template.sections.findIndex((s) => s.id === sectionId);
  if (fromIndex === -1) {
    throw new Error(`Section "${sectionId}" not found`);
  }
  const sections = [...template.sections];
  const [moved] = sections.splice(fromIndex, 1);
  const clamped = Math.max(0, Math.min(toIndex, sections.length));
  sections.splice(clamped, 0, moved);
  return { ...template, sections };
}

/** Move a band to a new section and/or index. Returns a new template. */
export function moveBand(
  template: Template,
  bandId: string,
  toSectionId: string,
  toIndex: number,
): Template {
  // Find and remove the band from its current section
  let movedBand: Band | null = null;
  let sections = template.sections.map((s) => {
    const bands = s.bands.filter((b) => {
      if (b.id === bandId && !movedBand) {
        movedBand = b;
        return false;
      }
      return true;
    });
    if (bands.length !== s.bands.length) return { ...s, bands };
    return s;
  });
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!movedBand) {
    throw new Error(`Band "${bandId}" not found`);
  }

  // Insert into the target section
  const targetIdx = sections.findIndex((s) => s.id === toSectionId);
  if (targetIdx === -1) {
    throw new Error(`Section "${toSectionId}" not found`);
  }
  const targetSection = sections[targetIdx];
  const bands = [...targetSection.bands];
  const clamped = Math.max(0, Math.min(toIndex, bands.length));
  bands.splice(clamped, 0, movedBand);
  sections = [...sections];
  sections[targetIdx] = { ...targetSection, bands };
  return { ...template, sections };
}

/** Move an element to a different band. Returns a new template. */
export function moveElement(
  template: Template,
  elementId: string,
  toBandId: string,
  toIndex?: number,
): Template {
  // Remove element from its current location
  const removed = { value: null as Element | null };
  let sections = template.sections.map((s) => ({
    ...s,
    bands: s.bands.map((b) => {
      const elements = removeElementById(b.elements, elementId, removed);
      if (elements !== b.elements) return { ...b, elements };
      return b;
    }),
  }));
  if (!removed.value) {
    throw new Error(`Element "${elementId}" not found`);
  }
  const movedElement = removed.value;

  // Insert into target band
  let bandFound = false;
  sections = sections.map((s) => ({
    ...s,
    bands: s.bands.map((b) => {
      if (b.id !== toBandId || bandFound) return b;
      bandFound = true;
      const elements = [...b.elements];
      elements.splice(toIndex ?? elements.length, 0, movedElement);
      return { ...b, elements };
    }),
  }));
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!bandFound) {
    throw new Error(`Band "${toBandId}" not found`);
  }
  return { ...template, sections };
}

/** Recursively reorder an element within its parent's elements list. */
function reorderElementInList(
  elements: Element[],
  elementId: string,
  toIndex: number,
  done: { value: boolean },
): Element[] {
  const fromIndex = elements.findIndex((el) => el.id === elementId);
  if (fromIndex !== -1 && !done.value) {
    done.value = true;
    const result = [...elements];
    const [moved] = result.splice(fromIndex, 1);
    const clamped = Math.max(0, Math.min(toIndex, result.length));
    result.splice(clamped, 0, moved);
    return result;
  }
  return elements.map((el) => {
    if (done.value || !el.elements) return el;
    const children = reorderElementInList(el.elements, elementId, toIndex, done);
    if (children !== el.elements) return { ...el, elements: children };
    return el;
  });
}

/** Reorder an element within its parent's elements list (z-order). Searches nested containers. Returns a new template. */
export function reorderElement(template: Template, elementId: string, toIndex: number): Template {
  const done = { value: false };
  const sections = template.sections.map((s) => ({
    ...s,
    bands: s.bands.map((b) => {
      const elements = reorderElementInList(b.elements, elementId, toIndex, done);
      if (elements !== b.elements) return { ...b, elements };
      return b;
    }),
  }));
  if (!done.value) {
    throw new Error(`Element "${elementId}" not found`);
  }
  return { ...template, sections };
}

// ---- CLONE operations ----

/** Clone a section (deep copy with new IDs). Returns a new template. */
export function cloneSection(
  template: Template,
  sectionId: string,
  insertIndex?: number,
): Template {
  const idx = template.sections.findIndex((s) => s.id === sectionId);
  if (idx === -1) {
    throw new Error(`Section "${sectionId}" not found`);
  }
  const cloned = deepCloneWithNewIds(template.sections[idx]);
  const sections = [...template.sections];
  const insertAt = insertIndex ?? idx + 1;
  sections.splice(insertAt, 0, cloned);
  return { ...template, sections };
}

/** Clone a band (deep copy with new IDs). Returns a new template. */
export function cloneBand(template: Template, bandId: string, insertIndex?: number): Template {
  let cloned: Band | null = null;
  const sections = template.sections.map((s) => {
    const bandIdx = s.bands.findIndex((b) => b.id === bandId);
    if (bandIdx === -1 || cloned) return s;
    cloned = deepCloneWithNewIds(s.bands[bandIdx]);
    const bands = [...s.bands];
    bands.splice(insertIndex ?? bandIdx + 1, 0, cloned);
    return { ...s, bands };
  });
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!cloned) {
    throw new Error(`Band "${bandId}" not found`);
  }
  return { ...template, sections };
}

/** Recursively clone an element within its parent's elements list. */
function cloneElementInList(
  elements: Element[],
  elementId: string,
  insertIndex: number | undefined,
  done: { value: boolean },
): Element[] {
  const elIdx = elements.findIndex((el) => el.id === elementId);
  if (elIdx !== -1 && !done.value) {
    done.value = true;
    const newEl = deepCloneWithNewIds(elements[elIdx]);
    const result = [...elements];
    result.splice(insertIndex ?? elIdx + 1, 0, newEl);
    return result;
  }
  return elements.map((el) => {
    if (done.value || !el.elements) return el;
    const children = cloneElementInList(el.elements, elementId, insertIndex, done);
    if (children !== el.elements) return { ...el, elements: children };
    return el;
  });
}

/** Clone an element (deep copy with new IDs). Searches nested containers. Returns a new template. */
export function cloneElement(
  template: Template,
  elementId: string,
  insertIndex?: number,
): Template {
  const done = { value: false };
  const sections = template.sections.map((s) => ({
    ...s,
    bands: s.bands.map((b) => {
      const elements = cloneElementInList(b.elements, elementId, insertIndex, done);
      if (elements !== b.elements) return { ...b, elements };
      return b;
    }),
  }));
  if (!done.value) {
    throw new Error(`Element "${elementId}" not found`);
  }
  return { ...template, sections };
}

// ---- RENAME operations ----

/** Recursively rename style references in an element and its children. */
function renameStyleInElement(el: Element, oldName: string, newName: string): Element {
  let changed = false;
  let style = el.style;
  if (style === oldName) {
    style = newName;
    changed = true;
  }

  let conditionalStyles = el.conditionalStyles;
  if (conditionalStyles) {
    const orig = conditionalStyles;
    const mapped = orig.map((cs) => {
      if (cs.style === oldName) return { ...cs, style: newName };
      return cs;
    });
    if (mapped.some((cs, i) => cs !== orig[i])) {
      conditionalStyles = mapped;
      changed = true;
    }
  }

  let properties = el.properties;
  const content = properties.content;
  if (Array.isArray(content)) {
    const runs = content as StyledRun[];
    const mappedRuns = runs.map((run) => {
      if (run.style === oldName) return { ...run, style: newName };
      return run;
    });
    if (mappedRuns.some((r, i) => r !== runs[i])) {
      properties = { ...properties, content: mappedRuns };
      changed = true;
    }
  }

  let elements = el.elements;
  if (elements) {
    const origElements = elements;
    const mappedChildren = origElements.map((child) =>
      renameStyleInElement(child, oldName, newName),
    );
    if (mappedChildren.some((c, i) => c !== origElements[i])) {
      elements = mappedChildren;
      changed = true;
    }
  }

  const bands = properties.bands as Band[] | undefined;
  if (Array.isArray(bands)) {
    const origBands = bands;
    const mappedBands = origBands.map((band) => {
      const mappedElements = band.elements.map((child) =>
        renameStyleInElement(child, oldName, newName),
      );
      if (mappedElements.some((c, i) => c !== band.elements[i])) {
        return { ...band, elements: mappedElements };
      }
      return band;
    });
    if (mappedBands.some((b, i) => b !== origBands[i])) {
      properties = { ...properties, bands: mappedBands };
      changed = true;
    }
  }

  if (!changed) return el;
  return { ...el, style, conditionalStyles, properties, elements };
}

/** Rename a named style and update all references throughout the template. Returns a new template. */
export function renameStyle(template: Template, oldName: string, newName: string): Template {
  if (!Object.hasOwn(template.styles, oldName)) {
    throw new Error(`Style "${oldName}" not found`);
  }
  if (oldName === newName) return template;
  if (Object.hasOwn(template.styles, newName)) {
    throw new Error(`Style "${newName}" already exists`);
  }
  const styles: Record<string, Style> = {};
  for (const [key, value] of Object.entries(template.styles)) {
    styles[key === oldName ? newName : key] = value;
  }
  const sections = template.sections.map((s) => {
    const bands = s.bands.map((b) => {
      const elements = b.elements.map((el) => renameStyleInElement(el, oldName, newName));
      if (elements.some((e, i) => e !== b.elements[i])) return { ...b, elements };
      return b;
    });
    if (bands.some((b, i) => b !== s.bands[i])) return { ...s, bands };
    return s;
  });
  return { ...template, styles, sections };
}
