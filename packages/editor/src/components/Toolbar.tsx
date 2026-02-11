import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../store';
import styles from './Toolbar.module.css';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

export function Toolbar() {
  const name = useEditorStore((s) => s.template.name);
  const undoLen = useEditorStore((s) => s._undoStack.length);
  const redoLen = useEditorStore((s) => s._redoStack.length);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const hasSelection = useEditorStore((s) => s.selectedElementIds.length > 0);
  const hasClipboard = useEditorStore((s) => s.clipboard !== null);
  const hasBand = useEditorStore((s) => s.selectedBandId !== null);
  const copySelection = useEditorStore((s) => s.copySelection);
  const pasteClipboard = useEditorStore((s) => s.pasteClipboard);
  const duplicateSelection = useEditorStore((s) => s.duplicateSelection);
  const selectAllInBand = useEditorStore((s) => s.selectAllInBand);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileMenuRef = useRef<HTMLDivElement>(null);
  const editMenuRef = useRef<HTMLDivElement>(null);
  const [openMenu, setOpenMenu] = useState<'file' | 'edit' | null>(null);

  const closeMenu = useCallback(() => {
    setOpenMenu(null);
  }, []);

  useEffect(() => {
    if (!openMenu) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (fileMenuRef.current?.contains(target) || editMenuRef.current?.contains(target)) {
        return;
      }
      closeMenu();
    };
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [openMenu, closeMenu]);

  const toggleMenu = (menu: 'file' | 'edit') => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  const handleOpen = () => {
    closeMenu();
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = useEditorStore.getState().importTemplate(reader.result as string);
      if (!result.success) {
        alert(`Import failed:\n${result.error}`);
      }
    };
    reader.readAsText(file);

    // Reset so the same file can be re-imported
    e.target.value = '';
  };

  const handleSave = () => {
    closeMenu();
    const json = useEditorStore.getState().exportTemplate();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name || 'template'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUndo = () => {
    closeMenu();
    undo();
  };

  const handleRedo = () => {
    closeMenu();
    redo();
  };

  const handleCopy = () => {
    closeMenu();
    copySelection();
  };

  const handlePaste = () => {
    closeMenu();
    pasteClipboard();
  };

  const handleDuplicate = () => {
    closeMenu();
    duplicateSelection();
  };

  const handleSelectAll = () => {
    closeMenu();
    selectAllInBand();
  };

  return (
    <div className={styles.toolbar}>
      <div className={styles.titleRow}>
        <div className={styles.name}>{name}</div>
      </div>
      <div className={styles.menuBar}>
        <div className={styles.menuContainer} ref={fileMenuRef}>
          <button
            className={`${styles.menuBarBtn} ${openMenu === 'file' ? styles.menuBarBtnActive : ''}`}
            onClick={() => {
              toggleMenu('file');
            }}
            aria-haspopup="menu"
            aria-expanded={openMenu === 'file'}
          >
            File
          </button>
          {openMenu === 'file' && (
            <div className={styles.menu} role="menu">
              <button className={styles.menuItem} role="menuitem" onClick={handleOpen}>
                Open
              </button>
              <button className={styles.menuItem} role="menuitem" onClick={handleSave}>
                Save
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className={styles.hiddenInput}
            onChange={handleFileChange}
            aria-label="Open template file"
          />
        </div>
        <div className={styles.menuContainer} ref={editMenuRef}>
          <button
            className={`${styles.menuBarBtn} ${openMenu === 'edit' ? styles.menuBarBtnActive : ''}`}
            onClick={() => {
              toggleMenu('edit');
            }}
            aria-haspopup="menu"
            aria-expanded={openMenu === 'edit'}
          >
            Edit
          </button>
          {openMenu === 'edit' && (
            <div className={styles.menu} role="menu">
              <button
                className={`${styles.menuItem} ${undoLen === 0 ? styles.menuItemDisabled : ''}`}
                role="menuitem"
                disabled={undoLen === 0}
                onClick={handleUndo}
              >
                <span>Undo</span>
                <span className={styles.shortcutHint}>{isMac ? '\u2318Z' : 'Ctrl+Z'}</span>
              </button>
              <button
                className={`${styles.menuItem} ${redoLen === 0 ? styles.menuItemDisabled : ''}`}
                role="menuitem"
                disabled={redoLen === 0}
                onClick={handleRedo}
              >
                <span>Redo</span>
                <span className={styles.shortcutHint}>
                  {isMac ? '\u2318\u21E7Z' : 'Ctrl+Shift+Z'}
                </span>
              </button>
              <div className={styles.menuSeparator} />
              <button
                className={`${styles.menuItem} ${!hasSelection ? styles.menuItemDisabled : ''}`}
                role="menuitem"
                disabled={!hasSelection}
                onClick={handleCopy}
              >
                <span>Copy</span>
                <span className={styles.shortcutHint}>{isMac ? '\u2318C' : 'Ctrl+C'}</span>
              </button>
              <button
                className={`${styles.menuItem} ${!hasClipboard ? styles.menuItemDisabled : ''}`}
                role="menuitem"
                disabled={!hasClipboard}
                onClick={handlePaste}
              >
                <span>Paste</span>
                <span className={styles.shortcutHint}>{isMac ? '\u2318V' : 'Ctrl+V'}</span>
              </button>
              <button
                className={`${styles.menuItem} ${!hasSelection ? styles.menuItemDisabled : ''}`}
                role="menuitem"
                disabled={!hasSelection}
                onClick={handleDuplicate}
              >
                <span>Duplicate</span>
                <span className={styles.shortcutHint}>{isMac ? '\u2318D' : 'Ctrl+D'}</span>
              </button>
              <div className={styles.menuSeparator} />
              <button
                className={`${styles.menuItem} ${!hasBand ? styles.menuItemDisabled : ''}`}
                role="menuitem"
                disabled={!hasBand}
                onClick={handleSelectAll}
              >
                <span>Select All</span>
                <span className={styles.shortcutHint}>{isMac ? '\u2318A' : 'Ctrl+A'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
