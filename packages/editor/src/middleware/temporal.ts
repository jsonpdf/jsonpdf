import type { StateCreator } from 'zustand';
import type { Template } from '@jsonpdf/core';

const MAX_HISTORY = 50;

export interface TemporalState {
  _undoStack: Template[];
  _redoStack: Template[];
  _isUndoRedoInProgress: boolean;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

/**
 * Zustand middleware that intercepts `set()` calls and tracks `template`
 * changes on undo/redo stacks. Any state update that changes the `template`
 * field by reference automatically pushes the previous template onto the
 * undo stack and clears the redo stack.
 */
export function temporal<T extends { template: Template } & TemporalState>(
  creator: StateCreator<T>,
): StateCreator<T> {
  return (set, get, store) => {
    const wrappedSet: typeof set = (...args) => {
      const prevTemplate = get().template;
      (set as (...a: unknown[]) => void)(...args);
      const nextState = get();
      if (nextState._isUndoRedoInProgress) return;
      if (nextState.template === prevTemplate) return;
      const undoStack = [...nextState._undoStack, prevTemplate].slice(-MAX_HISTORY);
      set({ _undoStack: undoStack, _redoStack: [] } as unknown as T);
    };
    store.setState = wrappedSet;
    return creator(wrappedSet, get, store);
  };
}
