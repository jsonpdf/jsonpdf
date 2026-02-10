import type { Element, Style } from '@jsonpdf/core';
import { UnknownElement } from './elements/UnknownElement';
import { ELEMENT_RENDERERS } from './element-renderers';

interface ReadOnlyElementRendererProps {
  element: Element;
  style: Style;
  styles: Record<string, Style>;
}

export function ReadOnlyElementRenderer({ element, style, styles }: ReadOnlyElementRendererProps) {
  const Renderer = ELEMENT_RENDERERS[element.type] ?? UnknownElement;
  return <Renderer element={element} style={style} styles={styles} bandId="" sectionId="" />;
}
