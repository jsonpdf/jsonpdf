import { Rect, Circle, Ellipse } from 'react-konva';
import type { ElementRendererChildProps } from '../ElementRenderer';

export function ShapeElement({ element }: ElementRendererChildProps) {
  const props = element.properties;
  const shapeType = (props.shapeType as string | undefined) ?? 'rect';
  const fill = props.fill as string | undefined;
  const stroke = props.stroke as string | undefined;
  const strokeWidth = (props.strokeWidth as number | undefined) ?? 0;
  const dashPattern = props.dashPattern as number[] | undefined;
  const borderRadius = (props.borderRadius as number | undefined) ?? 0;

  if (shapeType === 'circle') {
    const radius = Math.min(element.width, element.height) / 2;
    return (
      <Circle
        x={element.width / 2}
        y={element.height / 2}
        radius={radius}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        dash={dashPattern}
      />
    );
  }

  if (shapeType === 'ellipse') {
    return (
      <Ellipse
        x={element.width / 2}
        y={element.height / 2}
        radiusX={element.width / 2}
        radiusY={element.height / 2}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        dash={dashPattern}
      />
    );
  }

  // Default: rect
  return (
    <Rect
      x={0}
      y={0}
      width={element.width}
      height={element.height}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      cornerRadius={borderRadius}
      dash={dashPattern}
    />
  );
}
