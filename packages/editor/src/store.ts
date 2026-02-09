import { create } from 'zustand';
import type { Template, Element, Band, BandType, Section, PageConfig } from '@jsonpdf/core';
import { generateId } from '@jsonpdf/core';
import {
  createTemplate,
  updateElement,
  removeElement,
  updateBand,
  updateSection,
  updateTemplate,
  addSection as addSectionOp,
  addBand as addBandOp,
  removeBand as removeBandOp,
  moveBand as moveBandOp,
  removeSection as removeSectionOp,
  reorderElement as reorderElementOp,
  moveElement as moveElementOp,
  moveSection as moveSectionOp,
} from '@jsonpdf/template';

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
  updateElementProps: (elementId: string, updates: Partial<Omit<Element, 'id'>>) => void;
  updateBandProps: (bandId: string, updates: Partial<Omit<Band, 'id' | 'elements'>>) => void;
  updateSectionProps: (sectionId: string, updates: Partial<Omit<Section, 'id' | 'bands'>>) => void;
  updateTemplateProps: (
    updates: Omit<Partial<Template>, 'version' | 'sections' | 'page'> & {
      page?: Partial<PageConfig>;
    },
  ) => void;
  reorderElement: (elementId: string, toIndex: number) => void;
  moveElementToBand: (elementId: string, toBandId: string, toIndex?: number) => void;
  removeBand: (bandId: string) => void;
  reorderBand: (bandId: string, sectionId: string, toIndex: number) => void;
  addBand: (sectionId: string, type: BandType) => void;
  addSection: () => void;
  removeSection: (sectionId: string) => void;
  moveSection: (sectionId: string, toIndex: number) => void;
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
  updateElementProps: (elementId, updates) => {
    set((state) => {
      try {
        return { template: updateElement(state.template, elementId, updates) };
      } catch {
        return state;
      }
    });
  },
  updateBandProps: (bandId, updates) => {
    set((state) => {
      try {
        return { template: updateBand(state.template, bandId, updates) };
      } catch {
        return state;
      }
    });
  },
  updateSectionProps: (sectionId, updates) => {
    set((state) => {
      try {
        return { template: updateSection(state.template, sectionId, updates) };
      } catch {
        return state;
      }
    });
  },
  updateTemplateProps: (updates) => {
    set((state) => {
      try {
        return { template: updateTemplate(state.template, updates) };
      } catch {
        return state;
      }
    });
  },
  reorderElement: (elementId, toIndex) => {
    set((state) => {
      try {
        return { template: reorderElementOp(state.template, elementId, toIndex) };
      } catch {
        return state;
      }
    });
  },
  moveElementToBand: (elementId, toBandId, toIndex) => {
    set((state) => {
      try {
        return { template: moveElementOp(state.template, elementId, toBandId, toIndex) };
      } catch {
        return state;
      }
    });
  },
  removeBand: (bandId) => {
    set((state) => {
      try {
        return {
          template: removeBandOp(state.template, bandId),
          selectedElementId: null,
          selectedBandId: null,
        };
      } catch {
        return state;
      }
    });
  },
  reorderBand: (bandId, sectionId, toIndex) => {
    set((state) => {
      try {
        return { template: moveBandOp(state.template, bandId, sectionId, toIndex) };
      } catch {
        return state;
      }
    });
  },
  addBand: (sectionId, type) => {
    set((state) => {
      const id = generateId('band');
      const band: Band = { id, type, height: 50, elements: [] };
      try {
        return {
          template: addBandOp(state.template, sectionId, band),
          selectedElementId: null,
          selectedBandId: id,
          selectedSectionId: sectionId,
        };
      } catch {
        return state;
      }
    });
  },
  addSection: () => {
    set((state) => {
      const sectionId = generateId('sec');
      const name = `Section ${String(state.template.sections.length + 1)}`;
      const section: Section = { id: sectionId, name, bands: [] };
      return {
        template: addSectionOp(state.template, section),
        selectedElementId: null,
        selectedBandId: null,
        selectedSectionId: sectionId,
      };
    });
  },
  removeSection: (sectionId) => {
    set((state) => {
      try {
        return {
          template: removeSectionOp(state.template, sectionId),
          selectedElementId: null,
          selectedBandId: null,
          selectedSectionId: null,
        };
      } catch {
        return state;
      }
    });
  },
  moveSection: (sectionId, toIndex) => {
    set((state) => {
      try {
        return { template: moveSectionOp(state.template, sectionId, toIndex) };
      } catch {
        return state;
      }
    });
  },
}));
