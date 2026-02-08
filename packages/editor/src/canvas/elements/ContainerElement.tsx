import { Group, Rect } from 'react-konva';
import type { ElementRendererChildProps } from '../ElementRenderer';
import { ElementRenderer } from '../ElementRenderer';

const DASH = [3, 3];
const STROKE_COLOR = '#aaaaaa';

export function ContainerElement({ element, styles }: ElementRendererChildProps) {
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
      {(element.elements ?? []).map((child) => (
        <ElementRenderer key={child.id} element={child} styles={styles} />
      ))}
    </Group>
  );
}
