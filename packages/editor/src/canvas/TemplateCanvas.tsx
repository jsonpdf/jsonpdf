import { useMemo } from 'react';
import { Stage, Layer } from 'react-konva';
import { useEditorStore } from '../store';
import { computeDesignLayout } from '../layout';
import { PageRenderer } from './PageRenderer';

/** Gap between pages and padding around the canvas (in points). */
const PAGE_GAP = 40;
const CANVAS_PADDING = 40;

export function TemplateCanvas() {
  const template = useEditorStore((s) => s.template);
  const zoom = useEditorStore((s) => s.zoom);

  const pages = useMemo(() => computeDesignLayout(template), [template]);

  // Compute total canvas size
  const maxPageWidth = pages.reduce((max, p) => Math.max(max, p.pageConfig.width), 0);
  const totalHeight = pages.reduce(
    (sum, p) => sum + p.pageConfig.height + PAGE_GAP,
    CANVAS_PADDING * 2 - PAGE_GAP,
  );

  const stageWidth = (maxPageWidth + CANVAS_PADDING * 2) * zoom;
  const stageHeight = Math.max(totalHeight * zoom, 1);

  // Compute page Y offsets
  let currentY = CANVAS_PADDING;
  const pageOffsets = pages.map((p) => {
    const y = currentY;
    currentY += p.pageConfig.height + PAGE_GAP;
    return y;
  });

  return (
    <Stage width={stageWidth} height={stageHeight} scaleX={zoom} scaleY={zoom}>
      <Layer>
        {pages.map((page, i) => (
          <PageRenderer
            key={page.sectionId}
            page={page}
            x={CANVAS_PADDING}
            y={pageOffsets[i]}
            styles={template.styles}
          />
        ))}
      </Layer>
    </Stage>
  );
}
