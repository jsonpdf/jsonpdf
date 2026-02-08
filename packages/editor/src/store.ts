import { create } from 'zustand';
import type { Template } from '@jsonpdf/core';
import { createTemplate, updateElement, removeElement, updateBand } from '@jsonpdf/template';

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
  updateElementPosition: (elementId: string, x: number, y: number) => void;
  updateElementBounds: (elementId: string, x: number, y: number, w: number, h: number) => void;
  deleteSelectedElement: () => void;
  updateBandHeight: (bandId: string, height: number) => void;
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
  updateElementPosition: (elementId, x, y) => {
    set((state) => {
      try {
        return { template: updateElement(state.template, elementId, { x, y }) };
      } catch {
        return state;
      }
    });
  },
  updateElementBounds: (elementId, x, y, w, h) => {
    set((state) => {
      try {
        return {
          template: updateElement(state.template, elementId, {
            x,
            y,
            width: w,
            height: h,
          }),
        };
      } catch {
        return state;
      }
    });
  },
  deleteSelectedElement: () => {
    set((state) => {
      if (!state.selectedElementId) return state;
      try {
        return {
          template: removeElement(state.template, state.selectedElementId),
          selectedElementId: null,
          selectedBandId: null,
          selectedSectionId: null,
        };
      } catch {
        return state;
      }
    });
  },
  updateBandHeight: (bandId, height) => {
    const clamped = Math.max(10, height);
    set((state) => {
      try {
        return { template: updateBand(state.template, bandId, { height: clamped }) };
      } catch {
        return state;
      }
    });
  },
}));
