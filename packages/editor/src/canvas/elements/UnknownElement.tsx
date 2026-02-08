import { Group, Rect, Text } from 'react-konva';
import type { ElementRendererChildProps } from '../ElementRenderer';

const DASH = [3, 3];
const STROKE_COLOR = '#ef4444';
const LABEL_COLOR = '#ef4444';

export function UnknownElement({ element }: ElementRendererChildProps) {
  return (
    <Group>
      <Rect
        x={0}
        y={0}
        width={element.width}
        height={element.height}
        stroke={STROKE_COLOR}
        strokeWidth={1}
        dash={DASH}
      />
      <Text
        x={0}
        y={0}
        width={element.width}
        height={element.height}
        text={`[${element.type}]`}
        fontSize={10}
        fill={LABEL_COLOR}
        fontFamily="Arial, Helvetica, sans-serif"
        align="center"
        verticalAlign="middle"
      />
    </Group>
  );
}
