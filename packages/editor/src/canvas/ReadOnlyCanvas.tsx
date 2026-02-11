import { useMemo, useCallback } from 'react';
import { Stage, Layer, Group, Rect, Line, Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Style, Element } from '@jsonpdf/core';
import { useEditorStore } from '../store';
import { computeDesignLayout } from '../layout';
import type { DesignBand, DesignPage } from '../layout';
import { BAND_TYPE_META } from '../constants/band-types';
import { resolveElementStyle } from '../style';
import { PAGE_GAP, CANVAS_PADDING } from './TemplateCanvas';
import {
  SHADOW_OFFSET,
  SHADOW_COLOR,
  MARGIN_DASH,
  MARGIN_COLOR,
  MARGIN_WIDTH,
  LABEL_FONT_SIZE,
  LABEL_COLOR,
  LABEL_PADDING,
  BAND_BORDER_COLOR,
  BAND_BORDER_WIDTH,
} from './constants';
import { ReadOnlyElementRenderer } from './ReadOnlyElementRenderer';

export interface CanvasItemClick {
  kind: 'section' | 'band' | 'element';
  id: string;
}

interface ReadOnlyCanvasProps {
  viewportWidth: number;
  onItemClick?: (item: CanvasItemClick) => void;
}

export function ReadOnlyCanvas({ viewportWidth, onItemClick }: ReadOnlyCanvasProps) {
  const template = useEditorStore((s) => s.template);
  const zoom = useEditorStore((s) => s.zoom);

  const pages = useMemo(() => computeDesignLayout(template), [template]);

  const maxPageWidth = pages.reduce((max, p) => Math.max(max, p.pageConfig.width), 0);
  const totalHeight = pages.reduce(
    (sum, p) => sum + p.designHeight + PAGE_GAP,
    CANVAS_PADDING * 2 - PAGE_GAP,
  );

  const contentWidth = maxPageWidth + CANVAS_PADDING * 2;
  const stageWidth = Math.max(contentWidth * zoom, viewportWidth);
  const stageHeight = Math.max(totalHeight * zoom, 1);
  const stageWidthInPts = stageWidth / zoom;

  const pageXOffsets = useMemo(
    () => pages.map((p) => Math.max(CANVAS_PADDING, (stageWidthInPts - p.pageConfig.width) / 2)),
    [pages, stageWidthInPts],
  );

  const pageYOffsets = useMemo(() => {
    let currentY = CANVAS_PADDING;
    return pages.map((p) => {
      const y = currentY;
      currentY += p.designHeight + PAGE_GAP;
      return y;
    });
  }, [pages]);

  return (
    <Stage width={stageWidth} height={stageHeight} scaleX={zoom} scaleY={zoom}>
      <Layer>
        {pages.map((page, i) => (
          <ReadOnlyPage
            key={page.sectionId}
            page={page}
            x={pageXOffsets[i]}
            y={pageYOffsets[i]}
            styles={template.styles}
            onItemClick={onItemClick}
          />
        ))}
      </Layer>
    </Stage>
  );
}

/* ---------- Page ---------- */

interface ReadOnlyPageProps {
  page: DesignPage;
  x: number;
  y: number;
  styles: Record<string, Style>;
  onItemClick?: (item: CanvasItemClick) => void;
}

function ReadOnlyPage({ page, x, y, styles, onItemClick }: ReadOnlyPageProps) {
  const { width, margins } = page.pageConfig;
  const height = page.designHeight;
  const cw = width - margins.left - margins.right;

  const handlePageClick = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (useEditorStore.getState().activeTool !== 'select') return;
      // Only fire for clicks on the page background itself
      if (e.target === e.currentTarget) {
        onItemClick?.({ kind: 'section', id: page.sectionId });
      }
    },
    [onItemClick, page.sectionId],
  );

  return (
    <Group x={x} y={y}>
      <Rect x={SHADOW_OFFSET} y={SHADOW_OFFSET} width={width} height={height} fill={SHADOW_COLOR} />
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="#ffffff"
        onClick={handlePageClick}
        onTap={handlePageClick}
      />
      <Line
        points={[0, margins.top, width, margins.top]}
        stroke={MARGIN_COLOR}
        strokeWidth={MARGIN_WIDTH}
        dash={MARGIN_DASH}
        listening={false}
      />
      <Line
        points={[0, height - margins.bottom, width, height - margins.bottom]}
        stroke={MARGIN_COLOR}
        strokeWidth={MARGIN_WIDTH}
        dash={MARGIN_DASH}
        listening={false}
      />
      <Line
        points={[margins.left, 0, margins.left, height]}
        stroke={MARGIN_COLOR}
        strokeWidth={MARGIN_WIDTH}
        dash={MARGIN_DASH}
        listening={false}
      />
      <Line
        points={[width - margins.right, 0, width - margins.right, height]}
        stroke={MARGIN_COLOR}
        strokeWidth={MARGIN_WIDTH}
        dash={MARGIN_DASH}
        listening={false}
      />
      <Group x={margins.left} y={margins.top}>
        {page.bands.map((db) => (
          <ReadOnlyBand
            key={db.band.id}
            designBand={db}
            contentWidth={cw}
            styles={styles}
            onItemClick={onItemClick}
          />
        ))}
      </Group>
    </Group>
  );
}

/* ---------- Band ---------- */

interface ReadOnlyBandProps {
  designBand: DesignBand;
  contentWidth: number;
  styles: Record<string, Style>;
  onItemClick?: (item: CanvasItemClick) => void;
}

function ReadOnlyBand({ designBand, contentWidth, styles, onItemClick }: ReadOnlyBandProps) {
  const { band, offsetY, height } = designBand;
  const meta = BAND_TYPE_META[band.type];

  const handleBandClick = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (useEditorStore.getState().activeTool !== 'select') return;
      e.cancelBubble = true;
      onItemClick?.({ kind: 'band', id: band.id });
    },
    [onItemClick, band.id],
  );

  return (
    <Group x={0} y={offsetY}>
      <Rect
        x={0}
        y={0}
        width={contentWidth}
        height={height}
        fill={meta.fill}
        onClick={handleBandClick}
        onTap={handleBandClick}
      />
      <Line
        points={[0, height, contentWidth, height]}
        stroke={BAND_BORDER_COLOR}
        strokeWidth={BAND_BORDER_WIDTH}
        listening={false}
      />
      <Text
        x={LABEL_PADDING}
        y={LABEL_PADDING}
        text={meta.abbreviation}
        fontSize={LABEL_FONT_SIZE}
        fill={LABEL_COLOR}
        fontFamily="Arial, Helvetica, sans-serif"
        listening={false}
      />
      {band.elements.map((element) => (
        <ReadOnlyElement
          key={element.id}
          element={element}
          styles={styles}
          onItemClick={onItemClick}
        />
      ))}
    </Group>
  );
}

/* ---------- Element ---------- */

interface ReadOnlyElementProps {
  element: Element;
  styles: Record<string, Style>;
  onItemClick?: (item: CanvasItemClick) => void;
}

function ReadOnlyElement({ element, styles, onItemClick }: ReadOnlyElementProps) {
  const defaultStyle = useEditorStore((s) => s.template.defaultStyle);
  const style = resolveElementStyle(element, styles, defaultStyle);

  const handleClick = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (useEditorStore.getState().activeTool !== 'select') return;
      e.cancelBubble = true;
      onItemClick?.({ kind: 'element', id: element.id });
    },
    [onItemClick, element.id],
  );

  const handleMouseEnter = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (useEditorStore.getState().activeTool !== 'select') return;
    const stage = e.target.getStage();
    if (stage) stage.container().style.cursor = 'pointer';
  }, []);

  const handleMouseLeave = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (useEditorStore.getState().activeTool !== 'select') return;
    const stage = e.target.getStage();
    if (stage) stage.container().style.cursor = 'default';
  }, []);

  const hasBorder = style.borderWidth && style.borderWidth > 0;
  const hasBg =
    style.backgroundColor &&
    typeof style.backgroundColor === 'string' &&
    style.backgroundColor !== 'transparent';

  return (
    <Group
      x={element.rotation ? element.x + element.width / 2 : element.x}
      y={element.rotation ? element.y + element.height / 2 : element.y}
      rotation={element.rotation ?? 0}
      offsetX={element.rotation ? element.width / 2 : 0}
      offsetY={element.rotation ? element.height / 2 : 0}
      onClick={handleClick}
      onTap={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {hasBg && (
        <Rect
          x={0}
          y={0}
          width={element.width}
          height={element.height}
          fill={style.backgroundColor as string}
          cornerRadius={style.borderRadius ?? 0}
        />
      )}
      {hasBorder && (
        <Rect
          x={0}
          y={0}
          width={element.width}
          height={element.height}
          stroke={style.borderColor ?? '#000000'}
          strokeWidth={style.borderWidth}
          cornerRadius={style.borderRadius ?? 0}
        />
      )}
      <ReadOnlyElementRenderer element={element} style={style} styles={styles} />
    </Group>
  );
}
