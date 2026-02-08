import { create } from 'zustand';
import type { Template } from '@jsonpdf/core';
import { createTemplate } from '@jsonpdf/template';

export interface EditorState {
  template: Template;
  zoom: number;
  scrollX: number;
  scrollY: number;
  selectedElementId: string | null;
  selectedBandId: string | null;
  selectedSectionId: string | null;

  setTemplate: (template: Template) => void;
  setZoom: (zoom: number) => void;
  setScroll: (x: number, y: number) => void;
  setSelection: (
    elementId: string | null,
    bandId?: string | null,
    sectionId?: string | null,
  ) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  template: createTemplate(),
  zoom: 1.0,
  scrollX: 0,
  scrollY: 0,
  selectedElementId: null,
  selectedBandId: null,
  selectedSectionId: null,

  setTemplate: (template) => {
    set({ template });
  },
  setZoom: (zoom) => {
    set({ zoom: Math.max(0.1, Math.min(5.0, zoom)) });
  },
  setScroll: (scrollX, scrollY) => {
    set({ scrollX, scrollY });
  },
  setSelection: (elementId, bandId, sectionId) => {
    set({
      selectedElementId: elementId,
      selectedBandId: bandId ?? null,
      selectedSectionId: sectionId ?? null,
    });
  },
}));
