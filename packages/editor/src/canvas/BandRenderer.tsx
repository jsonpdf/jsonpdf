import { Group, Rect, Line, Text } from 'react-konva';
import type { Style } from '@jsonpdf/core';
import type { DesignBand } from '../layout';
import { BAND_TYPE_META } from '../constants/band-types';
import { ElementRenderer } from './ElementRenderer';

/** Band type label styling. */
const LABEL_FONT_SIZE = 9;
const LABEL_COLOR = '#888888';
const LABEL_PADDING = 4;

/** Band bottom border. */
const BORDER_COLOR = '#d0d0d0';
const BORDER_WIDTH = 0.5;

interface BandRendererProps {
  designBand: DesignBand;
  contentWidth: number;
  styles: Record<string, Style>;
}

export function BandRenderer({ designBand, contentWidth, styles }: BandRendererProps) {
  const { band, offsetY, height } = designBand;
  const meta = BAND_TYPE_META[band.type];

  return (
    <Group x={0} y={offsetY}>
      {/* Band tint background */}
      <Rect x={0} y={0} width={contentWidth} height={height} fill={meta.fill} />

      {/* Bottom border */}
      <Line
        points={[0, height, contentWidth, height]}
        stroke={BORDER_COLOR}
        strokeWidth={BORDER_WIDTH}
      />

      {/* Type abbreviation label */}
      <Text
        x={LABEL_PADDING}
        y={LABEL_PADDING}
        text={meta.abbreviation}
        fontSize={LABEL_FONT_SIZE}
        fill={LABEL_COLOR}
        fontFamily="Arial, Helvetica, sans-serif"
      />

      {/* Elements */}
      {band.elements.map((element) => (
        <ElementRenderer key={element.id} element={element} styles={styles} />
      ))}
    </Group>
  );
}
