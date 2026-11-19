import { useEffect } from 'react';
import { useApp } from '../context/AppContext';

export function useClipboardPaste() {
  const { isProcessing, processPastedContent, addToast } = useApp();

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      if (isProcessing || (activeEl && ['INPUT', 'TEXTAREA'].includes(activeEl.tagName))) {
        return;
      }

      const items = Array.from(e.clipboardData?.items || []);
      const imgItem = items.find((i) => i.type.startsWith('image/'));

      if (imgItem) {
        e.preventDefault();
        const blob = imgItem.getAsFile();
        if (!blob) return;
        addToast('Processing pasted image...', 'info');
        await processPastedContent(new File([blob], 'pasted-image.png', { type: blob.type }));
        return;
      }

      const htmlData = e.clipboardData?.getData('text/html');
      if (htmlData && htmlData.length > 50) {
        e.preventDefault();
        addToast('Converting pasted HTML...', 'info');
        await processPastedContent(new File([htmlData], 'pasted-content.html', { type: 'text/html' }));
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [isProcessing, processPastedContent, addToast]);
}
