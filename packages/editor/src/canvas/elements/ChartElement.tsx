import { Group, Rect, Text } from 'react-konva';
import type { ElementRendererChildProps } from '../ElementRenderer';

const DASH = [4, 4];
const STROKE_COLOR = '#999999';
const LABEL_COLOR = '#666666';

export function ChartElement({ element }: ElementRendererChildProps) {
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
        text="[Chart]"
        fontSize={12}
        fill={LABEL_COLOR}
        fontFamily="Arial, Helvetica, sans-serif"
        align="center"
        verticalAlign="middle"
      />
    </Group>
  );
}
