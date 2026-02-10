import { Line } from 'react-konva';
import type { DesignPage } from '../layout';
import { useGuideStore } from '../snap/guide-store';

const GUIDE_COLOR = '#ff00ff';

interface AlignmentGuidesProps {
  pages: DesignPage[];
  pageXOffsets: number[];
  pageYOffsets: number[];
  zoom: number;
}

export function AlignmentGuides({ pages, pageXOffsets, pageYOffsets, zoom }: AlignmentGuidesProps) {
  const guides = useGuideStore((s) => s.guides);
  const bandId = useGuideStore((s) => s.bandId);
  const sectionIndex = useGuideStore((s) => s.sectionIndex);

  if (guides.length === 0 || bandId === null) return null;

  const page = pages[sectionIndex] as (typeof pages)[number] | undefined;
  if (!page) return null;

  const { margins } = page.pageConfig;
  const contentWidth = page.pageConfig.width - margins.left - margins.right;
  const pageX = pageXOffsets[sectionIndex];
  const pageY = pageYOffsets[sectionIndex];

  // Find the band offset within the page
  const designBand = page.bands.find((db) => db.band.id === bandId);
  if (!designBand) return null;

  const bandOffsetY = designBand.offsetY;
  const bandHeight = designBand.height;

  const strokeWidth = 0.5 / zoom;
  const dash = [3 / zoom, 3 / zoom];

  return (
    <>
      {guides.map((guide, i) => {
        if (guide.orientation === 'vertical') {
          const stageX = pageX + margins.left + guide.position;
          const stageY1 = pageY + margins.top + bandOffsetY;
          const stageY2 = stageY1 + bandHeight;
          return (
            <Line
              key={`v-${String(i)}`}
              points={[stageX, stageY1, stageX, stageY2]}
              stroke={GUIDE_COLOR}
              strokeWidth={strokeWidth}
              dash={dash}
              listening={false}
            />
          );
        }
        // horizontal
        const stageY = pageY + margins.top + bandOffsetY + guide.position;
        const stageX1 = pageX + margins.left;
        const stageX2 = stageX1 + contentWidth;
        return (
          <Line
            key={`h-${String(i)}`}
            points={[stageX1, stageY, stageX2, stageY]}
            stroke={GUIDE_COLOR}
            strokeWidth={strokeWidth}
            dash={dash}
            listening={false}
          />
        );
      })}
    </>
  );
}
