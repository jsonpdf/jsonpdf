import { create } from 'zustand';
import type {
  Template,
  Element,
  Band,
  BandType,
  Section,
  PageConfig,
  Style,
  JSONSchema,
} from '@jsonpdf/core';
import type { SchemaPropertyType } from '@jsonpdf/template';
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
  addStyle as addStyleOp,
  updateStyle as updateStyleOp,
  removeStyle as removeStyleOp,
  renameStyle as renameStyleOp,
  findBand,
  findElement,
  deepCloneWithNewIds,
  addSchemaProperty as addSchemaPropertyOp,
  updateSchemaProperty as updateSchemaPropertyOp,
  removeSchemaProperty as removeSchemaPropertyOp,
  renameSchemaProperty as renameSchemaPropertyOp,
  toggleSchemaRequired as toggleSchemaRequiredOp,
  createDefaultPropertySchema,
} from '@jsonpdf/template';
import { createDefaultElement } from './constants/element-defaults';
import { MIN_ZOOM, MAX_ZOOM } from './constants/zoom';
import { temporal, type TemporalState } from './middleware/temporal';

export type Tool = 'select' | 'pan';

export interface EditorState extends TemporalState {
  template: Template;
  zoom: number;
  scrollX: number;
  scrollY: number;
  selectedElementIds: string[];
  selectedBandId: string | null;
  selectedSectionId: string | null;
  clipboard: { elements: Element[]; sourceBandId: string } | null;
  activeTool: Tool;

  setTemplate: (template: Template) => void;
  setActiveTool: (tool: Tool) => void;
  setZoom: (zoom: number) => void;
  setScroll: (x: number, y: number) => void;
  setSelection: (
    elementIds: string[] | string | null,
    bandId?: string | null,
    sectionId?: string | null,
  ) => void;
  toggleElementSelection: (elementId: string, bandId: string, sectionId: string) => void;
  copySelection: () => void;
  pasteClipboard: () => void;
  duplicateSelection: () => void;
  selectAllInBand: () => void;
  updateElementPosition: (elementId: string, x: number, y: number) => void;
  moveSelectedElements: (dx: number, dy: number) => void;
  updateElementBounds: (elementId: string, x: number, y: number, w: number, h: number) => void;
  resizeSelectedElements: (dx: number, dy: number, scaleX: number, scaleY: number) => void;
  deleteSelectedElements: () => void;
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
  activeTab: 'editor' | 'code' | 'preview';
  setActiveTab: (tab: 'editor' | 'code' | 'preview') => void;
  importTemplate: (json: string) => { success: true } | { success: false; error: string };
  exportTemplate: () => string;

  selectedStyleName: string | null;
  setSelectedStyleName: (name: string | null) => void;
  addNewStyle: (name: string, style: Style) => void;
  updateStyleProps: (name: string, updates: Partial<Style>) => void;
  removeStyleByName: (name: string) => void;
  renameStyleByName: (oldName: string, newName: string) => void;

  selectedSchemaPath: string | null;
  previewDataText: string;
  setSelectedSchemaPath: (path: string | null) => void;
  setPreviewDataText: (text: string) => void;
  addSchemaProperty: (parentPath: string, name: string, type: SchemaPropertyType) => void;
  updateSchemaPropertySchema: (path: string, updates: JSONSchema) => void;
  removeSchemaProperty: (path: string) => void;
  renameSchemaProperty: (path: string, newName: string) => void;
  toggleSchemaRequired: (path: string) => void;
}

/** Normalize setSelection input: null → [], string → [string], string[] → as-is. */
function normalizeIds(input: string[] | string | null): string[] {
  if (input === null) return [];
  if (typeof input === 'string') return [input];
  return input;
}

export const useEditorStore = create<EditorState>(
  temporal((set, get) => ({
    template: createTemplate(),
    zoom: 1.0,
    scrollX: 0,
    scrollY: 0,
    selectedElementIds: [],
    selectedBandId: null,
    selectedSectionId: null,
    clipboard: null,
    activeTool: 'select',
    activeTab: 'editor',
    selectedStyleName: null,
    selectedSchemaPath: null,
    previewDataText: '{}',

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
        selectedElementIds: [],
        selectedBandId: null,
        selectedSectionId: null,
        selectedStyleName: null,
        selectedSchemaPath: null,
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
        selectedElementIds: [],
        selectedBandId: null,
        selectedSectionId: null,
        selectedStyleName: null,
        selectedSchemaPath: null,
      });
      set({ _isUndoRedoInProgress: false });
    },
    canUndo: () => get()._undoStack.length > 0,
    canRedo: () => get()._redoStack.length > 0,

    setActiveTool: (tool) => {
      set({ activeTool: tool });
    },
    setActiveTab: (tab) => {
      set({ activeTab: tab });
    },
    setTemplate: (template) => {
      set({ template });
    },
    setZoom: (zoom) => {
      set({ zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)) });
    },
    setScroll: (scrollX, scrollY) => {
      set({ scrollX, scrollY });
    },
    setSelection: (elementIds, bandId, sectionId) => {
      set({
        selectedElementIds: normalizeIds(elementIds),
        selectedBandId: bandId ?? null,
        selectedSectionId: sectionId ?? null,
      });
    },
    toggleElementSelection: (elementId, bandId, sectionId) => {
      set((state) => {
        // If element is in a different band, replace selection
        if (state.selectedBandId && state.selectedBandId !== bandId) {
          return {
            selectedElementIds: [elementId],
            selectedBandId: bandId,
            selectedSectionId: sectionId,
          };
        }
        const existing = state.selectedElementIds;
        if (existing.includes(elementId)) {
          // Remove from selection
          const filtered = existing.filter((id) => id !== elementId);
          return {
            selectedElementIds: filtered,
            selectedBandId: filtered.length > 0 ? bandId : null,
            selectedSectionId: filtered.length > 0 ? sectionId : null,
          };
        }
        // Add to selection
        return {
          selectedElementIds: [...existing, elementId],
          selectedBandId: bandId,
          selectedSectionId: sectionId,
        };
      });
    },
    copySelection: () => {
      const state = get();
      if (state.selectedElementIds.length === 0 || !state.selectedBandId) return;
      const elements: Element[] = [];
      for (const id of state.selectedElementIds) {
        const result = findElement(state.template, id);
        if (result) elements.push(structuredClone(result.element));
      }
      if (elements.length > 0) {
        set({ clipboard: { elements, sourceBandId: state.selectedBandId } });
      }
    },
    pasteClipboard: () => {
      set((state) => {
        if (!state.clipboard) return state;
        const targetBandId = state.selectedBandId ?? state.clipboard.sourceBandId;
        let template = state.template;
        const newIds: string[] = [];
        try {
          for (const el of state.clipboard.elements) {
            const cloned = deepCloneWithNewIds(el);
            template = addElementOp(template, targetBandId, cloned);
            newIds.push(cloned.id);
          }
          const bandResult = findBand(template, targetBandId);
          return {
            template,
            selectedElementIds: newIds,
            selectedBandId: targetBandId,
            selectedSectionId: bandResult?.section.id ?? state.selectedSectionId,
          };
        } catch {
          return state;
        }
      });
    },
    duplicateSelection: () => {
      set((state) => {
        if (state.selectedElementIds.length === 0 || !state.selectedBandId) return state;
        let template = state.template;
        const newIds: string[] = [];
        try {
          for (const id of state.selectedElementIds) {
            const result = findElement(template, id);
            if (!result) continue;
            const cloned = deepCloneWithNewIds(result.element);
            template = addElementOp(template, state.selectedBandId, cloned);
            newIds.push(cloned.id);
          }
          return {
            template,
            selectedElementIds: newIds,
          };
        } catch {
          return state;
        }
      });
    },
    selectAllInBand: () => {
      const state = get();
      if (!state.selectedBandId) return;
      const bandResult = findBand(state.template, state.selectedBandId);
      if (!bandResult) return;
      const ids = bandResult.band.elements.map((el) => el.id);
      set({
        selectedElementIds: ids,
        selectedBandId: state.selectedBandId,
        selectedSectionId: bandResult.section.id,
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
    moveSelectedElements: (dx, dy) => {
      set((state) => {
        if (state.selectedElementIds.length === 0) return state;
        let template = state.template;
        try {
          for (const id of state.selectedElementIds) {
            const result = findElement(template, id);
            if (result) {
              template = updateElement(template, id, {
                x: result.element.x + dx,
                y: result.element.y + dy,
              });
            }
          }
          return { template };
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
    resizeSelectedElements: (dx, dy, scaleX, scaleY) => {
      set((state) => {
        if (state.selectedElementIds.length === 0) return state;
        const clampedScaleX = Math.max(0.01, scaleX);
        const clampedScaleY = Math.max(0.01, scaleY);
        const items: Array<{ id: string; x: number; y: number; width: number; height: number }> =
          [];
        for (const id of state.selectedElementIds) {
          const result = findElement(state.template, id);
          if (result) {
            const el = result.element;
            items.push({ id, x: el.x, y: el.y, width: el.width, height: el.height });
          }
        }
        if (items.length === 0) return state;
        const minX = Math.min(...items.map((e) => e.x));
        const minY = Math.min(...items.map((e) => e.y));
        let template = state.template;
        try {
          for (const item of items) {
            const relX = item.x - minX;
            const relY = item.y - minY;
            template = updateElement(template, item.id, {
              x: minX + dx + relX * clampedScaleX,
              y: minY + dy + relY * clampedScaleY,
              width: Math.max(1, item.width * clampedScaleX),
              height: Math.max(1, item.height * clampedScaleY),
            });
          }
          return { template };
        } catch {
          return state;
        }
      });
    },
    deleteSelectedElements: () => {
      set((state) => {
        if (state.selectedElementIds.length === 0) return state;
        let template = state.template;
        try {
          for (const id of state.selectedElementIds) {
            template = removeElement(template, id);
          }
          return {
            template,
            selectedElementIds: [],
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
            selectedElementIds: [],
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
            selectedElementIds: [],
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
          selectedElementIds: [],
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
            selectedElementIds: [],
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
            selectedElementIds: [element.id],
            selectedBandId: bandId,
            selectedSectionId: bandResult?.section.id ?? null,
          };
        } catch {
          return state;
        }
      });
    },
    setSelectedStyleName: (name) => {
      set({ selectedStyleName: name });
    },
    addNewStyle: (name, style) => {
      set((state) => {
        try {
          return { template: addStyleOp(state.template, name, style) };
        } catch {
          return state;
        }
      });
    },
    updateStyleProps: (name, updates) => {
      set((state) => {
        try {
          return { template: updateStyleOp(state.template, name, updates) };
        } catch {
          return state;
        }
      });
    },
    removeStyleByName: (name) => {
      set((state) => {
        try {
          return {
            template: removeStyleOp(state.template, name),
            selectedStyleName: state.selectedStyleName === name ? null : state.selectedStyleName,
          };
        } catch {
          return state;
        }
      });
    },
    renameStyleByName: (oldName, newName) => {
      set((state) => {
        try {
          return {
            template: renameStyleOp(state.template, oldName, newName),
            selectedStyleName:
              state.selectedStyleName === oldName ? newName : state.selectedStyleName,
          };
        } catch {
          return state;
        }
      });
    },
    setSelectedSchemaPath: (path) => {
      set({ selectedSchemaPath: path });
    },
    setPreviewDataText: (text) => {
      set({ previewDataText: text });
    },
    addSchemaProperty: (parentPath, name, type) => {
      set((state) => {
        try {
          const propSchema = createDefaultPropertySchema(type);
          const newSchema = addSchemaPropertyOp(
            state.template.dataSchema,
            parentPath,
            name,
            propSchema,
          );
          return { template: updateTemplate(state.template, { dataSchema: newSchema }) };
        } catch {
          return state;
        }
      });
    },
    updateSchemaPropertySchema: (path, updates) => {
      set((state) => {
        try {
          const newSchema = updateSchemaPropertyOp(state.template.dataSchema, path, updates);
          return { template: updateTemplate(state.template, { dataSchema: newSchema }) };
        } catch {
          return state;
        }
      });
    },
    removeSchemaProperty: (path) => {
      set((state) => {
        try {
          const newSchema = removeSchemaPropertyOp(state.template.dataSchema, path);
          return {
            template: updateTemplate(state.template, { dataSchema: newSchema }),
            selectedSchemaPath: state.selectedSchemaPath === path ? null : state.selectedSchemaPath,
          };
        } catch {
          return state;
        }
      });
    },
    renameSchemaProperty: (path, newName) => {
      set((state) => {
        try {
          const newSchema = renameSchemaPropertyOp(state.template.dataSchema, path, newName);
          // Update selectedSchemaPath if the renamed property (or a descendant) is selected
          let newPath = state.selectedSchemaPath;
          if (newPath) {
            const lastDot = path.lastIndexOf('.');
            const renamedPath =
              lastDot === -1 ? newName : `${path.substring(0, lastDot)}.${newName}`;
            if (newPath === path) {
              newPath = renamedPath;
            } else if (newPath.startsWith(`${path}.`)) {
              newPath = renamedPath + newPath.substring(path.length);
            }
          }
          return {
            template: updateTemplate(state.template, { dataSchema: newSchema }),
            selectedSchemaPath: newPath,
          };
        } catch {
          return state;
        }
      });
    },
    toggleSchemaRequired: (path) => {
      set((state) => {
        try {
          const newSchema = toggleSchemaRequiredOp(state.template.dataSchema, path);
          return { template: updateTemplate(state.template, { dataSchema: newSchema }) };
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
        selectedElementIds: [],
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
