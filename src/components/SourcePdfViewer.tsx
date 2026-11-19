import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ZoomIn, ZoomOut, Loader2 } from 'lucide-react';

export const SourcePdfViewer: React.FC = () => {
  const { sourceFile } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function renderPdf() {
      if (!sourceFile || !window.pdfjsLib) return;
      setLoading(true);

      try {
        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = '';

        const buf = await sourceFile.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
        if (cancelled) return;
        setPageCount(pdf.numPages);

        for (let p = 1; p <= pdf.numPages; p++) {
          if (cancelled) break;
          const page = await pdf.getPage(p);
          const vp = page.getViewport({ scale });

          const wrapper = document.createElement('div');
          wrapper.className =
            'mb-6 bg-white shadow-xl rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 flex flex-col items-center';

          const canvas = document.createElement('canvas');
          canvas.width = vp.width;
          canvas.height = vp.height;
          canvas.className = 'max-w-full h-auto';

          const pageNum = document.createElement('div');
          pageNum.className =
            'w-full py-1 text-center text-[10px] text-zinc-400 font-semibold bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800';
          pageNum.textContent = `Page ${p} of ${pdf.numPages}`;

          wrapper.appendChild(canvas);
          wrapper.appendChild(pageNum);
          container.appendChild(wrapper);

          await page.render({
            canvasContext: canvas.getContext('2d'),
            viewport: vp,
          }).promise;
        }
      } catch (err) {
        console.warn('[toMD] Failed to render source PDF:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    renderPdf();

    return () => {
      cancelled = true;
    };
  }, [sourceFile, scale]);

  return (
    <div className="w-full h-full flex flex-col bg-zinc-100/70 dark:bg-zinc-950/60 overflow-hidden">
      {/* Zoom Toolbar */}
      <div className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
          Source PDF Viewer {pageCount > 0 && `(${pageCount} pages)`}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale((s) => Math.max(0.6, s - 0.2))}
            className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-zinc-500 w-12 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale((s) => Math.min(2.5, s + 0.2))}
            className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pages Container */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
        {loading && (
          <div className="flex items-center gap-2 my-12 text-sm text-zinc-500 font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
            <span>Rendering PDF pages...</span>
          </div>
        )}
        <div ref={containerRef} className="w-full max-w-3xl flex flex-col items-center" />
      </div>
    </div>
  );
};
