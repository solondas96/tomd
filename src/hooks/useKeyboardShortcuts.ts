import { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { downloadAs } from '../lib/utils';

export function useKeyboardShortcuts() {
  const {
    currentMarkdown,
    currentFilename,
    isEditMode,
    setIsEditMode,
    undo,
    redo,
    canUndo,
    canRedo,
    settings,
    updateSettings,
    openSettings,
    setOpenSettings,
    openShortcuts,
    setOpenShortcuts,
    openFind,
    setOpenFind,
    openToc,
    setOpenToc,
    openHistory,
    setOpenHistory,
    openMetadata,
    setOpenMetadata,
    addToast,
  } = useApp();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement;
      const isInput = ['INPUT', 'TEXTAREA'].includes(target.tagName);

      if (isCtrlOrCmd && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setOpenFind(true);
        return;
      }

      if (e.key === 'Escape') {
        if (openFind) setOpenFind(false);
        else if (openShortcuts) setOpenShortcuts(false);
        else if (openSettings) setOpenSettings(false);
        else if (openHistory) setOpenHistory(false);
        else if (openToc) setOpenToc(false);
        else if (openMetadata) setOpenMetadata(false);
        return;
      }

      if (isCtrlOrCmd && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (currentMarkdown) {
          const stem = currentFilename.replace(/\.[^.]+$/, '') || 'document';
          downloadAs(currentMarkdown, `${stem}.md`, 'text/markdown');
          addToast('Downloaded .md document', 'success');
        }
        return;
      }

      if (isCtrlOrCmd && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setIsEditMode(!isEditMode);
        addToast(!isEditMode ? 'Edit mode enabled' : 'Editor locked', 'info', 1500);
        return;
      }

      if (isCtrlOrCmd && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (isEditMode && canUndo) {
          e.preventDefault();
          undo();
        }
        return;
      }

      if (isCtrlOrCmd && e.key.toLowerCase() === 'y') {
        if (isEditMode && canRedo) {
          e.preventDefault();
          redo();
        }
        return;
      }

      if (isCtrlOrCmd && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        const nextDark = !settings.darkMode;
        updateSettings({ darkMode: nextDark });
        addToast(nextDark ? 'Dark theme enabled' : 'Light theme enabled', 'info', 1500);
        return;
      }

      if (e.key === '?' && !isCtrlOrCmd && !isInput) {
        setOpenShortcuts(!openShortcuts);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentMarkdown,
    currentFilename,
    isEditMode,
    setIsEditMode,
    undo,
    redo,
    canUndo,
    canRedo,
    settings,
    updateSettings,
    openSettings,
    setOpenSettings,
    openShortcuts,
    setOpenShortcuts,
    openFind,
    setOpenFind,
    openToc,
    setOpenToc,
    openHistory,
    setOpenHistory,
    openMetadata,
    setOpenMetadata,
    addToast,
  ]);
}
