import { Line } from 'react-konva';
import type { ElementRendererChildProps } from '../ElementRenderer';

export function LineElement({ element }: ElementRendererChildProps) {
  const props = element.properties;
  const color = (props.color as string | undefined) ?? '#000000';
  const thickness = (props.thickness as number | undefined) ?? 1;
  const direction = (props.direction as string | undefined) ?? 'horizontal';
  const dashPattern = props.dashPattern as number[] | undefined;

  const points = direction === 'vertical' ? [0, 0, 0, element.height] : [0, 0, element.width, 0];

  return <Line points={points} stroke={color} strokeWidth={thickness} dash={dashPattern} />;
}
