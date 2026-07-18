import { Group, Rect } from 'react-konva';
import type { ElementRendererChildProps } from '../ElementRenderer';
import { ElementRenderer } from '../ElementRenderer';
import { computeContainerChildLayouts } from '../container-layout';

const DASH = [3, 3];
const STROKE_COLOR = '#aaaaaa';

export function ContainerElement({
  element,
  styles,
  bandId,
  sectionId,
}: ElementRendererChildProps) {
  const childLayouts = computeContainerChildLayouts(element);
  const isAbsolute = (element.properties.layout ?? 'absolute') === 'absolute';

  return (
    <Group>
      <Rect
        x={0}
        y={0}
        width={element.width}
        height={element.height}
        stroke={STROKE_COLOR}
        strokeWidth={0.5}
        dash={DASH}
      />
      {isAbsolute
        ? childLayouts.map((layout) => (
            <ElementRenderer
              key={layout.element.id}
              element={layout.element}
              styles={styles}
              bandId={bandId}
              sectionId={sectionId}
            />
          ))
        : childLayouts.map((layout) => (
            <Group key={layout.element.id} x={layout.offsetX} y={layout.offsetY}>
              <ElementRenderer
                element={{ ...layout.element, x: 0, y: 0 }}
                styles={styles}
                bandId={bandId}
                sectionId={sectionId}
                dragEnabled={false}
              />
            </Group>
          ))}
    </Group>
  );
}
