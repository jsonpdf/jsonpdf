import { create } from 'zustand';
import type { Template, Element, Band, BandType, Section, PageConfig } from '@jsonpdf/core';
import { generateId } from '@jsonpdf/core';
import {
  createTemplate,
  validateTemplate,
  updateElement,
  removeElement,
  updateBand,
  updateSection,
  updateTemplate,
  addSection as addSectionOp,
  addBand as addBandOp,
  addElement as addElementOp,
  removeBand as removeBandOp,
  moveBand as moveBandOp,
  removeSection as removeSectionOp,
  reorderElement as reorderElementOp,
  moveElement as moveElementOp,
  moveSection as moveSectionOp,
  findBand,
} from '@jsonpdf/template';
import { createDefaultElement } from './constants/element-defaults';
import { temporal, type TemporalState } from './middleware/temporal';

export interface EditorState extends TemporalState {
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
  addElement: (bandId: string, elementType: string, x?: number, y?: number) => void;
  activeTab: 'editor' | 'preview';
  setActiveTab: (tab: 'editor' | 'preview') => void;
  importTemplate: (json: string) => { success: true } | { success: false; error: string };
  exportTemplate: () => string;
}

export const useEditorStore = create<EditorState>(
  temporal((set, get) => ({
    template: createTemplate(),
    zoom: 1.0,
    scrollX: 0,
    scrollY: 0,
    selectedElementId: null,
    selectedBandId: null,
    selectedSectionId: null,
    activeTab: 'editor',

    _undoStack: [],
    _redoStack: [],
    _isUndoRedoInProgress: false,
    undo: () => {
      const state = get();
      if (state._undoStack.length === 0) return;
      const undoStack = state._undoStack.slice(0, -1);
      const prevTemplate = state._undoStack[state._undoStack.length - 1];
      set({
        _isUndoRedoInProgress: true,
        template: prevTemplate,
        _undoStack: undoStack,
        _redoStack: [...state._redoStack, state.template],
        selectedElementId: null,
        selectedBandId: null,
        selectedSectionId: null,
      });
      set({ _isUndoRedoInProgress: false });
    },
    redo: () => {
      const state = get();
      if (state._redoStack.length === 0) return;
      const redoStack = state._redoStack.slice(0, -1);
      const nextTemplate = state._redoStack[state._redoStack.length - 1];
      set({
        _isUndoRedoInProgress: true,
        template: nextTemplate,
        _undoStack: [...state._undoStack, state.template],
        _redoStack: redoStack,
        selectedElementId: null,
        selectedBandId: null,
        selectedSectionId: null,
      });
      set({ _isUndoRedoInProgress: false });
    },
    canUndo: () => get()._undoStack.length > 0,
    canRedo: () => get()._redoStack.length > 0,

    setActiveTab: (tab) => {
      set({ activeTab: tab });
    },
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
    addElement: (bandId, elementType, x, y) => {
      set((state) => {
        const element = createDefaultElement(elementType);
        if (x != null) element.x = x;
        if (y != null) element.y = y;
        try {
          const newTemplate = addElementOp(state.template, bandId, element);
          const bandResult = findBand(newTemplate, bandId);
          return {
            template: newTemplate,
            selectedElementId: element.id,
            selectedBandId: bandId,
            selectedSectionId: bandResult?.section.id ?? null,
          };
        } catch {
          return state;
        }
      });
    },
    importTemplate: (json) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(json);
      } catch {
        return { success: false, error: 'Invalid JSON' };
      }
      const template = parsed as Template;
      const result = validateTemplate(template);
      if (!result.valid) {
        const msgs = result.errors.map((e) => `${e.path}: ${e.message}`).join('\n');
        return { success: false, error: msgs };
      }
      set({
        template,
        selectedElementId: null,
        selectedBandId: null,
        selectedSectionId: null,
      });
      return { success: true };
    },
    exportTemplate: () => {
      return JSON.stringify(get().template, null, 2);
    },
  })),
);
