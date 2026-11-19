import React, { useEffect, useMemo, useRef } from 'react';
import { marked, Renderer } from 'marked';
import DOMPurify from 'dompurify';
import { useApp } from '../context/AppContext';
import { createSlugger, headingElementId, plainHeadingText } from '../lib/headings';

interface PreviewProps {
  content?: string;
  className?: string;
}

export const Preview: React.FC<PreviewProps> = ({ content, className }) => {
  const { currentMarkdown, headingJump } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const md = content !== undefined ? content : currentMarkdown;

  const html = useMemo(() => {
    if (!md.trim()) return '';
    try {
      // Ids come from the same slugger the TOC uses, so TOC links and heading ids always agree.
      const slugFor = createSlugger();
      const renderer = new Renderer();
      renderer.heading = function ({ tokens, depth, text }) {
        return `<h${depth} id="${headingElementId(slugFor(plainHeadingText(text)))}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
      };
      const parsed = marked.parse(md, { gfm: true, breaks: true, renderer }) as string;
      return DOMPurify.sanitize(parsed, {
        USE_PROFILES: { html: true },
        ADD_ATTR: ['target', 'rel'],
      });
    } catch (e) {
      console.warn('[toMD] Markdown parsing failed:', e);
      return `<p class="text-rose-500">Error rendering preview: ${String(e)}</p>`;
    }
  }, [md]);

  // Only react to jumps requested after this preview mounted, not a stale one from an earlier tab.
  const handledJumpNonce = useRef(headingJump?.nonce ?? 0);
  useEffect(() => {
    if (!headingJump || headingJump.nonce === handledJumpNonce.current) return;
    handledJumpNonce.current = headingJump.nonce;
    const target = Array.from(containerRef.current?.querySelectorAll<HTMLElement>('[id]') ?? []).find(
      (element) => element.id === headingElementId(headingJump.slug),
    );
    target?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [headingJump]);

  if (!md.trim()) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8 text-zinc-400 text-sm italic">
        Empty markdown document.
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`w-full h-full overflow-y-auto p-6 sm:p-10 ${className || ''}`}>
      <div
        className="prose prose-zinc dark:prose-invert max-w-4xl mx-auto
          prose-headings:scroll-mt-6 prose-headings:font-bold prose-headings:tracking-tight
          prose-h1:text-2xl sm:prose-h1:text-3xl prose-h1:border-b prose-h1:border-zinc-200 dark:prose-h1:border-zinc-800 prose-h1:pb-3 prose-h1:mb-6
          prose-h2:text-xl sm:prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
          prose-h3:text-lg sm:prose-h3:text-xl
          prose-p:leading-relaxed prose-p:text-zinc-700 dark:prose-p:text-zinc-300
          prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-pre:rounded-xl prose-pre:text-zinc-200
          prose-code:text-indigo-600 dark:prose-code:text-indigo-400 prose-code:font-mono prose-code:text-xs prose-code:bg-indigo-50/60 dark:prose-code:bg-indigo-950/40 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
          [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit
          prose-table:border-collapse prose-table:w-full prose-table:my-6
          prose-th:border prose-th:border-zinc-200 dark:prose-th:border-zinc-800 prose-th:bg-zinc-100/70 dark:prose-th:bg-zinc-800/60 prose-th:p-2.5 prose-th:text-xs prose-th:font-semibold
          prose-td:border prose-td:border-zinc-200 dark:prose-td:border-zinc-800 prose-td:p-2.5 prose-td:text-xs
          prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-50/30 dark:prose-blockquote:bg-indigo-950/20 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
          prose-hr:my-8 prose-hr:border-zinc-200 dark:prose-hr:border-zinc-800
          prose-img:rounded-xl prose-img:shadow-md"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};
