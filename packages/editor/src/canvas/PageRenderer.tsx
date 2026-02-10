import { Group, Rect, Line } from 'react-konva';
import type { Style } from '@jsonpdf/core';
import type { DesignPage } from '../layout';
import { BandRenderer } from './BandRenderer';
import { SHADOW_OFFSET, SHADOW_COLOR, MARGIN_DASH, MARGIN_COLOR, MARGIN_WIDTH } from './constants';

interface PageRendererProps {
  page: DesignPage;
  x: number;
  y: number;
  styles: Record<string, Style>;
}

export function PageRenderer({ page, x, y, styles }: PageRendererProps) {
  const { width, margins } = page.pageConfig;
  const height = page.designHeight;
  const contentWidth = width - margins.left - margins.right;

  return (
    <Group x={x} y={y}>
      {/* Shadow */}
      <Rect x={SHADOW_OFFSET} y={SHADOW_OFFSET} width={width} height={height} fill={SHADOW_COLOR} />

      {/* Page background */}
      <Rect x={0} y={0} width={width} height={height} fill="#ffffff" />

      {/* Margin guides */}
      <Line
        points={[0, margins.top, width, margins.top]}
        stroke={MARGIN_COLOR}
        strokeWidth={MARGIN_WIDTH}
        dash={MARGIN_DASH}
      />
      <Line
        points={[0, height - margins.bottom, width, height - margins.bottom]}
        stroke={MARGIN_COLOR}
        strokeWidth={MARGIN_WIDTH}
        dash={MARGIN_DASH}
      />
      <Line
        points={[margins.left, 0, margins.left, height]}
        stroke={MARGIN_COLOR}
        strokeWidth={MARGIN_WIDTH}
        dash={MARGIN_DASH}
      />
      <Line
        points={[width - margins.right, 0, width - margins.right, height]}
        stroke={MARGIN_COLOR}
        strokeWidth={MARGIN_WIDTH}
        dash={MARGIN_DASH}
      />

      {/* Content area with bands */}
      <Group x={margins.left} y={margins.top}>
        {page.bands.map((db) => (
          <BandRenderer
            key={db.band.id}
            designBand={db}
            contentWidth={contentWidth}
            styles={styles}
            sectionId={page.sectionId}
            sectionIndex={page.sectionIndex}
          />
        ))}
      </Group>
    </Group>
  );
}
