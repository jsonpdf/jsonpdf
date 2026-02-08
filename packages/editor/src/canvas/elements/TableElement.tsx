import { Group, Rect, Line, Text } from 'react-konva';
import type { ElementRendererChildProps } from '../ElementRenderer';

const BORDER_COLOR = '#cccccc';
const HEADER_BG = '#f0f0f0';
const HEADER_FONT_SIZE = 10;
const HEADER_HEIGHT = 24;

interface TableColumn {
  key: string;
  header?: string;
  width?: number;
  flex?: number;
}

export function TableElement({ element }: ElementRendererChildProps) {
  const props = element.properties;
  const columns = (props.columns as TableColumn[] | undefined) ?? [];

  // Compute column widths
  const totalFlex = columns.reduce((s, c) => s + (c.width ? 0 : (c.flex ?? 1)), 0);
  const fixedWidth = columns.reduce((s, c) => s + (c.width ?? 0), 0);
  const flexSpace = element.width - fixedWidth;

  let xOffset = 0;
  const colWidths = columns.map((c) => {
    const w = c.width ?? ((c.flex ?? 1) / totalFlex) * flexSpace;
    const x = xOffset;
    xOffset += w;
    return { x, width: w };
  });

  return (
    <Group>
      {/* Outer border */}
      <Rect
        x={0}
        y={0}
        width={element.width}
        height={element.height}
        stroke={BORDER_COLOR}
        strokeWidth={0.5}
      />

      {/* Header background */}
      <Rect x={0} y={0} width={element.width} height={HEADER_HEIGHT} fill={HEADER_BG} />

      {/* Header divider */}
      <Line
        points={[0, HEADER_HEIGHT, element.width, HEADER_HEIGHT]}
        stroke={BORDER_COLOR}
        strokeWidth={0.5}
      />

      {/* Column headers and dividers */}
      {columns.map((col, i) => (
        <Group key={col.key}>
          <Text
            x={colWidths[i].x + 4}
            y={4}
            width={colWidths[i].width - 8}
            height={HEADER_HEIGHT - 8}
            text={col.header ?? col.key}
            fontSize={HEADER_FONT_SIZE}
            fontStyle="bold"
            fill="#333333"
            fontFamily="Arial, Helvetica, sans-serif"
          />
          {i > 0 && (
            <Line
              points={[colWidths[i].x, 0, colWidths[i].x, element.height]}
              stroke={BORDER_COLOR}
              strokeWidth={0.5}
            />
          )}
        </Group>
      ))}
    </Group>
  );
}
