import { useEffect } from 'react';
import { useEditorStore } from '../store';

const NUDGE_SMALL = 1;
const NUDGE_LARGE = 10;

/** Input-like elements where keyboard shortcuts should be suppressed. */
function isInputFocused(): boolean {
  const tag = document.activeElement?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function useKeyboardShortcuts() {
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

      if (e.key === 'Escape') {
        state.setSelection(null);
        return;
      }

      if (!state.selectedElementId) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        state.deleteSelectedElement();
        return;
      }

      const nudge = e.shiftKey ? NUDGE_LARGE : NUDGE_SMALL;
      const el = findSelectedElement(state);
      if (!el) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          state.updateElementPosition(state.selectedElementId, el.x - nudge, el.y);
          break;
        case 'ArrowRight':
          e.preventDefault();
          state.updateElementPosition(state.selectedElementId, el.x + nudge, el.y);
          break;
        case 'ArrowUp':
          e.preventDefault();
          state.updateElementPosition(state.selectedElementId, el.x, el.y - nudge);
          break;
        case 'ArrowDown':
          e.preventDefault();
          state.updateElementPosition(state.selectedElementId, el.x, el.y + nudge);
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}

/** Find the currently selected element in the template to read its x/y. */
function findSelectedElement(state: ReturnType<typeof useEditorStore.getState>) {
  const id = state.selectedElementId;
  if (!id) return null;
  for (const section of state.template.sections) {
    for (const band of section.bands) {
      const found = findInElements(band.elements, id);
      if (found) return found;
    }
  }
  return null;
}

function findInElements(
  elements: { id: string; x: number; y: number; elements?: typeof elements }[],
  id: string,
): { x: number; y: number } | null {
  for (const el of elements) {
    if (el.id === id) return { x: el.x, y: el.y };
    if (el.elements) {
      const found = findInElements(el.elements, id);
      if (found) return found;
    }
  }
  return null;
}
