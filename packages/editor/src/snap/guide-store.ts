import { create } from 'zustand';
import type { SnapLine } from './snap';

interface GuideState {
  guides: SnapLine[];
  bandId: string | null;
  sectionIndex: number;
  setGuides: (guides: SnapLine[], bandId: string, sectionIndex: number) => void;
  clearGuides: () => void;
}

export const useGuideStore = create<GuideState>((set) => ({
  guides: [],
  bandId: null,
  sectionIndex: 0,
  setGuides: (guides, bandId, sectionIndex) => {
    set({ guides, bandId, sectionIndex });
  },
  clearGuides: () => {
    set({ guides: [], bandId: null, sectionIndex: 0 });
  },
}));
