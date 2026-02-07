import type { Template, Section, Band, Element, Style, FontDeclaration } from '@jsonpdf/core';

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
