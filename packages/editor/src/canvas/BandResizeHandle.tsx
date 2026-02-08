import { useRef, useCallback } from 'react';
import { Rect } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useEditorStore } from '../store';

/** Height of the invisible drag zone (in canvas points, scaled by zoom). */
const HIT_HEIGHT = 6;

interface BandResizeHandleProps {
  bandId: string;
  bandHeight: number;
  contentWidth: number;
  zoom: number;
}

export function BandResizeHandle({
  bandId,
  bandHeight,
  contentWidth,
  zoom,
}: BandResizeHandleProps) {
  const scaledHitHeight = HIT_HEIGHT / zoom;
  const dragStartX = useRef(0);

  // Position the handle inside the band, straddling the bottom border from above
  const handleY = bandHeight - scaledHitHeight;

  const handleDragStart = useCallback((e: KonvaEventObject<DragEvent>) => {
    dragStartX.current = e.target.getAbsolutePosition().x;
  }, []);

  const handleDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      const node = e.target;
      // deltaY is how far the handle moved from its initial position
      const deltaY = node.y() - handleY;
      const newHeight = Math.max(10, bandHeight + deltaY);
      useEditorStore.getState().updateBandHeight(bandId, newHeight);
    },
    [bandId, bandHeight, handleY],
  );

  const handleDragBound = useCallback((pos: { x: number; y: number }) => {
    return { x: dragStartX.current, y: pos.y };
  }, []);

  const handleClick = useCallback((e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Prevent band selection when clicking the resize handle
    e.cancelBubble = true;
  }, []);

  const handleMouseEnter = useCallback((e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (stage) {
      stage.container().style.cursor = 'ns-resize';
    }
  }, []);

  const handleMouseLeave = useCallback((e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (stage) {
      stage.container().style.cursor = 'default';
    }
  }, []);

  return (
    <Rect
      x={0}
      y={handleY}
      width={contentWidth}
      height={scaledHitHeight}
      fill="transparent"
      draggable
      onDragStart={handleDragStart}
      dragBoundFunc={handleDragBound}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onTap={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    />
  );
}
