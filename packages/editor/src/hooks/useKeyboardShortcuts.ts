import { useEffect, useRef } from 'react';
import { useEditorStore } from '../store';
import type { Tool } from '../store';

const NUDGE_SMALL = 1;
const NUDGE_LARGE = 10;

/** Input-like elements where keyboard shortcuts should be suppressed. */
function isInputFocused(): boolean {
  const tag = document.activeElement?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function useKeyboardShortcuts() {
  const toolBeforeSpace = useRef<Tool | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isInputFocused()) return;

      const state = useEditorStore.getState();
      const mod = e.metaKey || e.ctrlKey;

      // Undo: Cmd+Z / Ctrl+Z
      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        state.undo();
        return;
      }

      // Redo: Cmd+Shift+Z / Ctrl+Shift+Z
      if (mod && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        state.redo();
        return;
      }

      // Redo: Ctrl+Y (Windows convention)
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        state.redo();
        return;
      }

      // Copy: Cmd+C / Ctrl+C
      if (mod && e.key === 'c') {
        e.preventDefault();
        state.copySelection();
        return;
      }

      // Paste: Cmd+V / Ctrl+V
      if (mod && e.key === 'v') {
        e.preventDefault();
        state.pasteClipboard();
        return;
      }

      // Duplicate: Cmd+D / Ctrl+D
      if (mod && e.key === 'd') {
        e.preventDefault();
        state.duplicateSelection();
        return;
      }

      // Select All: Cmd+A / Ctrl+A
      if (mod && e.key === 'a') {
        e.preventDefault();
        state.selectAllInBand();
        return;
      }

      if (e.key === 'Escape') {
        state.setSelection(null);
        return;
      }

      // Tool shortcuts — only fire without modifiers
      if (!mod && !e.shiftKey && !e.altKey) {
        // V → select tool
        if (e.key === 'v') {
          state.setActiveTool('select');
          return;
        }

        // H → pan tool
        if (e.key === 'h') {
          state.setActiveTool('pan');
          return;
        }

        // Space held → temporary pan (prevent default on repeats too to avoid scroll)
        if (e.key === ' ') {
          e.preventDefault();
          if (!e.repeat) {
            toolBeforeSpace.current = state.activeTool;
            state.setActiveTool('pan');
          }
          return;
        }
      }

      if (state.selectedElementIds.length === 0) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        state.deleteSelectedElements();
        return;
      }

      const nudge = e.shiftKey ? NUDGE_LARGE : NUDGE_SMALL;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          state.moveSelectedElements(-nudge, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          state.moveSelectedElements(nudge, 0);
          break;
        case 'ArrowUp':
          e.preventDefault();
          state.moveSelectedElements(0, -nudge);
          break;
        case 'ArrowDown':
          e.preventDefault();
          state.moveSelectedElements(0, nudge);
          break;
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (isInputFocused()) return;
      if (e.key === ' ' && toolBeforeSpace.current !== null) {
        useEditorStore.getState().setActiveTool(toolBeforeSpace.current);
        toolBeforeSpace.current = null;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
}
