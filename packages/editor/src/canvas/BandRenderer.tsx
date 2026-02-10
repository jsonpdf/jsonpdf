import { useCallback, useMemo } from 'react';
import { Group, Rect, Line, Text } from 'react-konva';
import type { Style } from '@jsonpdf/core';
import type { DesignBand } from '../layout';
import { useEditorStore } from '../store';
import { BAND_TYPE_META } from '../constants/band-types';
import { BandGeometryContext } from '../snap/band-context';
import { ElementRenderer } from './ElementRenderer';
import { BandResizeHandle } from './BandResizeHandle';
import {
  LABEL_FONT_SIZE,
  LABEL_COLOR,
  LABEL_PADDING,
  BAND_BORDER_COLOR,
  BAND_BORDER_WIDTH,
} from './constants';

/** Selected band highlight. */
const SELECTED_FILL = 'rgba(37, 99, 235, 0.08)';
const SELECTED_STROKE = '#2563eb';
const SELECTED_STROKE_WIDTH = 1;

interface BandRendererProps {
  designBand: DesignBand;
  contentWidth: number;
  styles: Record<string, Style>;
  sectionId: string;
  sectionIndex: number;
}

export function BandRenderer({
  designBand,
  contentWidth,
  styles,
  sectionId,
  sectionIndex,
}: BandRendererProps) {
  const { band, offsetY, height } = designBand;
  const meta = BAND_TYPE_META[band.type];
  const selectedBandId = useEditorStore((s) => s.selectedBandId);
  const zoom = useEditorStore((s) => s.zoom);
  const isBandSelected = selectedBandId === band.id;

  const bandGeo = useMemo(
    () => ({ contentWidth, bandHeight: height, sectionIndex }),
    [contentWidth, height, sectionIndex],
  );

  const handleBandClick = useCallback(() => {
    // Only select band if no element intercepted the click
    useEditorStore.getState().setSelection(null, band.id, sectionId);
  }, [band.id, sectionId]);

  return (
    <BandGeometryContext.Provider value={bandGeo}>
      <Group x={0} y={offsetY}>
        {/* Band tint background */}
        <Rect
          x={0}
          y={0}
          width={contentWidth}
          height={height}
          fill={meta.fill}
          onClick={handleBandClick}
          onTap={handleBandClick}
        />

        {/* Selected band highlight */}
        {isBandSelected && (
          <Rect
            x={0}
            y={0}
            width={contentWidth}
            height={height}
            fill={SELECTED_FILL}
            stroke={SELECTED_STROKE}
            strokeWidth={SELECTED_STROKE_WIDTH}
            listening={false}
          />
        )}

        {/* Bottom border */}
        <Line
          points={[0, height, contentWidth, height]}
          stroke={BAND_BORDER_COLOR}
          strokeWidth={BAND_BORDER_WIDTH}
        />

        {/* Type abbreviation label */}
        <Text
          x={LABEL_PADDING}
          y={LABEL_PADDING}
          text={meta.abbreviation}
          fontSize={LABEL_FONT_SIZE}
          fill={LABEL_COLOR}
          fontFamily="Arial, Helvetica, sans-serif"
          listening={false}
        />

        {/* Elements */}
        {band.elements.map((element) => (
          <ElementRenderer
            key={element.id}
            element={element}
            styles={styles}
            bandId={band.id}
            sectionId={sectionId}
          />
        ))}

        {/* Band height resize handle */}
        <BandResizeHandle
          bandId={band.id}
          bandHeight={height}
          contentWidth={contentWidth}
          zoom={zoom}
        />
      </Group>
    </BandGeometryContext.Provider>
  );
}
