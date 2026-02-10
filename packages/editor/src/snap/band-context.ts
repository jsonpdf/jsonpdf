import { createContext, useContext } from 'react';

export interface BandGeometry {
  contentWidth: number;
  bandHeight: number;
  sectionIndex: number;
}

export const BandGeometryContext = createContext<BandGeometry>({
  contentWidth: 0,
  bandHeight: 0,
  sectionIndex: 0,
});

export function useBandGeometry(): BandGeometry {
  return useContext(BandGeometryContext);
}
