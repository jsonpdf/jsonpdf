import { Group, Rect, Text } from 'react-konva';
import type { ElementRendererChildProps } from '../ElementRenderer';

const STROKE_COLOR = '#999999';
const LABEL_COLOR = '#666666';

export function BarcodeElement({ element }: ElementRendererChildProps) {
  const format = ((element.properties.format as string | undefined) ?? 'barcode').toUpperCase();

  return (
    <Group>
      <Rect
        x={0}
        y={0}
        width={element.width}
        height={element.height}
        stroke={STROKE_COLOR}
        strokeWidth={1}
      />
      <Text
        x={0}
        y={0}
        width={element.width}
        height={element.height}
        text={`[${format}]`}
        fontSize={10}
        fill={LABEL_COLOR}
        fontFamily="Arial, Helvetica, sans-serif"
        align="center"
        verticalAlign="middle"
      />
    </Group>
  );
}
