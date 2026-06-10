'use client';

import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  minHeight?: number;
}

export function MarkdownEditor({ value, onChange, disabled, placeholder, minHeight = 220 }: MarkdownEditorProps) {
  const { resolvedTheme } = useTheme();

  return (
    <div data-color-mode={resolvedTheme === 'dark' ? 'dark' : 'light'}>
      <MDEditor
        value={value}
        onChange={(val) => onChange(val ?? '')}
        preview="live"
        height={minHeight}
        visibleDragbar={false}
        textareaProps={{ placeholder, disabled }}
        style={{ opacity: disabled ? 0.6 : 1, pointerEvents: disabled ? 'none' : undefined }}
      />
    </div>
  );
}
