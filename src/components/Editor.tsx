import React, { useRef, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Lock } from 'lucide-react';

interface EditorProps {
  value?: string;
  onChange?: (val: string) => void;
  className?: string;
}

export const Editor: React.FC<EditorProps> = ({ value, onChange, className }) => {
  const { currentMarkdown, updateMarkdown, isEditMode, setIsEditMode } = useApp();
  const textValue = value !== undefined ? value : currentMarkdown;
  const handleChange = onChange || updateMarkdown;

  const [localVal, setLocalVal] = useState(textValue);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync external changes
  useEffect(() => {
    setLocalVal(textValue);
  }, [textValue]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    setLocalVal(next);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      handleChange(next);
    }, 250);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab key support
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const next = localVal.substring(0, start) + '  ' + localVal.substring(end);
      setLocalVal(next);
      handleChange(next);
      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      }, 0);
    }
  };

  return (
    <div className={`relative w-full h-full flex flex-col ${className || ''}`}>
      {!isEditMode && (
        <div
          onClick={() => setIsEditMode(true)}
          className="absolute top-3 right-4 z-10 cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-900/80 dark:bg-zinc-100/80 text-white dark:text-zinc-900 backdrop-blur-xs opacity-70 hover:opacity-100 transition-opacity"
        >
          <Lock className="w-3 h-3" />
          <span>Click to edit</span>
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={localVal}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        readOnly={!isEditMode}
        placeholder="Your markdown will appear here..."
        spellCheck={false}
        className="w-full flex-1 p-6 font-mono text-sm leading-relaxed resize-none bg-transparent text-zinc-800 dark:text-zinc-200 focus:outline-none selection:bg-indigo-500/20"
      />
    </div>
  );
};
