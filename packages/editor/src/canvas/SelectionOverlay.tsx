import { useCallback } from 'react';
import { Group, Rect } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { SelectionGeometry } from '../hooks/useSelectionGeometry';
import type { SnapTargets } from '../snap/snap';
import { snapSize } from '../snap/snap';
import { useGuideStore } from '../snap/guide-store';

/** Visual constants. */
const OUTLINE_COLOR = '#2563eb';
const HANDLE_FILL = '#ffffff';
const HANDLE_STROKE = '#2563eb';
const HANDLE_SIZE = 8;

type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const CURSOR_MAP: Record<HandlePosition, string> = {
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
};

interface HandleDef {
  position: HandlePosition;
  /** Fractional x within bounds (0=left, 0.5=center, 1=right). */
  fx: number;
  /** Fractional y within bounds (0=top, 0.5=center, 1=bottom). */
  fy: number;
}

const HANDLES: HandleDef[] = [
  { position: 'nw', fx: 0, fy: 0 },
  { position: 'n', fx: 0.5, fy: 0 },
  { position: 'ne', fx: 1, fy: 0 },
  { position: 'e', fx: 1, fy: 0.5 },
  { position: 'se', fx: 1, fy: 1 },
  { position: 's', fx: 0.5, fy: 1 },
  { position: 'sw', fx: 0, fy: 1 },
  { position: 'w', fx: 0, fy: 0.5 },
];

export interface SnapInfo {
  targets: SnapTargets;
  /** Stage-to-band-local X offset: bandLocalX = stageX - stageOffsetX. */
  stageOffsetX: number;
  /** Stage-to-band-local Y offset: bandLocalY = stageY - stageOffsetY. */
  stageOffsetY: number;
  bandId: string;
  sectionIndex: number;
}

interface SelectionOverlayProps {
  geometry: SelectionGeometry;
  zoom: number;
  onResizeEnd: (x: number, y: number, width: number, height: number) => void;
  snapInfo: SnapInfo | null;
}

export function SelectionOverlay({ geometry, zoom, onResizeEnd, snapInfo }: SelectionOverlayProps) {
  const { x, y, width, height, rotation } = geometry;
  const strokeWidth = 1.5 / zoom;
  const handleSize = HANDLE_SIZE / zoom;
  const showHandles = rotation === 0;

  return (
    <Group>
      {/* Selection outline */}
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        stroke={OUTLINE_COLOR}
        strokeWidth={strokeWidth}
        listening={false}
      />

      {/* Resize handles (only when not rotated) */}
      {showHandles &&
        HANDLES.map((h) => (
          <ResizeHandle
            key={h.position}
            position={h.position}
            boundsX={x}
            boundsY={y}
            boundsWidth={width}
            boundsHeight={height}
            fx={h.fx}
            fy={h.fy}
            handleSize={handleSize}
            strokeWidth={strokeWidth}
            onResizeEnd={onResizeEnd}
            snapInfo={snapInfo}
          />
        ))}
    </Group>
  );
}

interface ResizeHandleProps {
  position: HandlePosition;
  boundsX: number;
  boundsY: number;
  boundsWidth: number;
  boundsHeight: number;
  fx: number;
  fy: number;
  handleSize: number;
  strokeWidth: number;
  onResizeEnd: (x: number, y: number, width: number, height: number) => void;
  snapInfo: SnapInfo | null;
}

function ResizeHandle({
  position,
  boundsX,
  boundsY,
  boundsWidth,
  boundsHeight,
  fx,
  fy,
  handleSize,
  strokeWidth,
  onResizeEnd,
  snapInfo,
}: ResizeHandleProps) {
  const half = handleSize / 2;
  const hx = boundsX + boundsWidth * fx - half;
  const hy = boundsY + boundsHeight * fy - half;

  const handleDragMove = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      if (!snapInfo || e.evt.altKey) {
        useGuideStore.getState().clearGuides();
        return;
      }

      const node = e.target;
      const dx = node.x() - hx;
      const dy = node.y() - hy;

      // Compute current stage-coord bounds from handle delta
      let newX = boundsX;
      let newY = boundsY;
      let newW = boundsWidth;
      let newH = boundsHeight;

      if (position.includes('w')) {
        newX = boundsX + dx;
        newW = boundsWidth - dx;
      } else if (position.includes('e')) {
        newW = boundsWidth + dx;
      }
      if (position.includes('n')) {
        newY = boundsY + dy;
        newH = boundsHeight - dy;
      } else if (position.includes('s')) {
        newH = boundsHeight + dy;
      }

      // Convert to band-local coords for snapping
      const localX = newX - snapInfo.stageOffsetX;
      const localY = newY - snapInfo.stageOffsetY;

      const snapped = snapSize(localX, localY, newW, newH, position, snapInfo.targets);

      // Compute the snap deltas
      const snapDx = snapped.x - localX;
      const snapDy = snapped.y - localY;
      const snapDw = snapped.width - newW;
      const snapDh = snapped.height - newH;

      // Adjust the handle node position to reflect snap
      // The handle position determines which direction to adjust
      if (snapDx !== 0 || snapDw !== 0) {
        if (position.includes('w')) {
          node.x(node.x() + snapDx);
        } else if (position.includes('e')) {
          node.x(node.x() + snapDw);
        }
      }
      if (snapDy !== 0 || snapDh !== 0) {
        if (position.includes('n')) {
          node.y(node.y() + snapDy);
        } else if (position.includes('s')) {
          node.y(node.y() + snapDh);
        }
      }

      useGuideStore.getState().setGuides(snapped.guides, snapInfo.bandId, snapInfo.sectionIndex);
    },
    [position, boundsX, boundsY, boundsWidth, boundsHeight, hx, hy, snapInfo],
  );

  const handleDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      useGuideStore.getState().clearGuides();
      const node = e.target;
      const dx = node.x() - hx;
      const dy = node.y() - hy;

      let newX = boundsX;
      let newY = boundsY;
      let newW = boundsWidth;
      let newH = boundsHeight;

      // Horizontal resize
      if (position.includes('w')) {
        newX = boundsX + dx;
        newW = boundsWidth - dx;
      } else if (position.includes('e')) {
        newW = boundsWidth + dx;
      }

      // Vertical resize
      if (position.includes('n')) {
        newY = boundsY + dy;
        newH = boundsHeight - dy;
      } else if (position.includes('s')) {
        newH = boundsHeight + dy;
      }

      // Clamp to minimum 1pt — only adjust origin for handles that move it
      if (newW < 1) {
        newW = 1;
        if (position.includes('w')) {
          newX = boundsX + boundsWidth - 1;
        }
      }
      if (newH < 1) {
        newH = 1;
        if (position.includes('n')) {
          newY = boundsY + boundsHeight - 1;
        }
      }

      onResizeEnd(newX, newY, newW, newH);

      // Reset handle position (Konva moved it)
      node.x(hx);
      node.y(hy);
    },
    [position, boundsX, boundsY, boundsWidth, boundsHeight, hx, hy, onResizeEnd],
  );

  const handleMouseEnter = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      if (stage) {
        stage.container().style.cursor = CURSOR_MAP[position];
      }
    },
    [position],
  );

  const handleMouseLeave = useCallback((e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (stage) {
      stage.container().style.cursor = 'default';
    }
  }, []);

  return (
    <Rect
      x={hx}
      y={hy}
      width={handleSize}
      height={handleSize}
      fill={HANDLE_FILL}
      stroke={HANDLE_STROKE}
      strokeWidth={strokeWidth}
      draggable
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    />
  );
}
