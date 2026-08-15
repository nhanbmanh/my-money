"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
  Palette,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  Quote,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

const TEXT_COLORS = [
  { name: "Default", color: "inherit" },
  { name: "Slate", color: "#475569" },
  { name: "Red", color: "#e11d48" },
  { name: "Amber", color: "#d97706" },
  { name: "Green", color: "#059669" },
  { name: "Blue", color: "#0284c7" },
  { name: "Purple", color: "#7c3aed" },
];

const HIGHLIGHT_COLORS = [
  { name: "None", color: "transparent" },
  { name: "Yellow", color: "#fef08a" },
  { name: "Green", color: "#bbf7d0" },
  { name: "Blue", color: "#bfdbfe" },
  { name: "Pink", color: "#fbcfe8" },
  { name: "Purple", color: "#e9d5ff" },
];

const FONT_SIZES = [
  { label: "Bình thường (14px)", size: "3", tag: "p" },
  { label: "Nhỏ (12px)", size: "1", tag: "small" },
  { label: "Lớn (18px / H3)", size: "4", tag: "h3" },
  { label: "Rất lớn (24px / H2)", size: "5", tag: "h2" },
  { label: "Tiêu đề lớn (H1)", size: "6", tag: "h1" },
];

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Nhập nội dung ghi chú ở đây...",
  className,
  minHeight = "180px",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [selectedFontSize, setSelectedFontSize] = useState("3");

  // Format helper executing document.execCommand
  const execCommand = useCallback(
    (command: string, val: string | undefined = undefined) => {
      if (typeof window === "undefined") return;
      document.execCommand(command, false, val);
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
    },
    [onChange]
  );

  // Sync internal HTML content from prop value initially or on reset
  useEffect(() => {
    if (!editorRef.current) return;
    const currentHtml = editorRef.current.innerHTML;
    if (value !== currentHtml) {
      // If plain text with linebreaks, wrap into HTML
      if (value && !/<[a-z][\s\S]*>/i.test(value)) {
        editorRef.current.innerHTML = value.replace(/\n/g, "<br/>");
      } else {
        editorRef.current.innerHTML = value || "";
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const size = e.target.value;
    setSelectedFontSize(size);
    execCommand("fontSize", size);
  };

  const isEditorEmpty = !value || value === "<br>" || value.trim() === "";

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-sky-500/40 transition-all",
        className
      )}
    >
      {/* Rich Text Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
        {/* Text Style Group */}
        <div className="flex items-center gap-0.5 border-r border-slate-200 dark:border-slate-700 pr-1.5 mr-1">
          <button
            type="button"
            title="In đậm (Ctrl+B)"
            onClick={() => execCommand("bold")}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="In nghiêng (Ctrl+I)"
            onClick={() => execCommand("italic")}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Gạch chân (Ctrl+U)"
            onClick={() => execCommand("underline")}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
          >
            <Underline className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Gạch ngang"
            onClick={() => execCommand("strikeThrough")}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
          >
            <Strikethrough className="h-4 w-4" />
          </button>
        </div>

        {/* Font Size Selector */}
        <div className="flex items-center border-r border-slate-200 dark:border-slate-700 pr-1.5 mr-1">
          <select
            value={selectedFontSize}
            onChange={handleFontSizeChange}
            className="h-8 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
            title="Kích thước chữ"
          >
            {FONT_SIZES.map((f) => (
              <option key={f.size} value={f.size}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Lists & Quotes */}
        <div className="flex items-center gap-0.5 border-r border-slate-200 dark:border-slate-700 pr-1.5 mr-1">
          <button
            type="button"
            title="Danh sách dấu chấm"
            onClick={() => execCommand("insertUnorderedList")}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Danh sách số"
            onClick={() => execCommand("insertOrderedList")}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
          >
            <ListOrdered className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Trích dẫn"
            onClick={() => execCommand("formatBlock", "blockquote")}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
          >
            <Quote className="h-4 w-4" />
          </button>
        </div>

        {/* Alignment Group */}
        <div className="flex items-center gap-0.5 border-r border-slate-200 dark:border-slate-700 pr-1.5 mr-1">
          <button
            type="button"
            title="Căn trái"
            onClick={() => execCommand("justifyLeft")}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
          >
            <AlignLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Căn giữa"
            onClick={() => execCommand("justifyCenter")}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
          >
            <AlignCenter className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Căn phải"
            onClick={() => execCommand("justifyRight")}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
          >
            <AlignRight className="h-4 w-4" />
          </button>
        </div>

        {/* Text & Highlight Color Dropdowns */}
        <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-700 pr-1.5 mr-1 relative">
          {/* Text Color Picker */}
          <div className="relative">
            <button
              type="button"
              title="Màu chữ"
              onClick={() => {
                setShowColorMenu(!showColorMenu);
                setShowHighlightMenu(false);
              }}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors flex items-center gap-1"
            >
              <Palette className="h-4 w-4" />
            </button>

            {showColorMenu && (
              <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg rounded-lg p-2 grid grid-cols-4 gap-1.5 w-36">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    title={c.name}
                    style={{ backgroundColor: c.color === "inherit" ? "#64748b" : c.color }}
                    onClick={() => {
                      execCommand("foreColor", c.color);
                      setShowColorMenu(false);
                    }}
                    className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 hover:scale-110 transition-transform"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Highlight Color Picker */}
          <div className="relative">
            <button
              type="button"
              title="Tô nền chữ"
              onClick={() => {
                setShowHighlightMenu(!showHighlightMenu);
                setShowColorMenu(false);
              }}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors flex items-center gap-1"
            >
              <Highlighter className="h-4 w-4" />
            </button>

            {showHighlightMenu && (
              <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg rounded-lg p-2 grid grid-cols-3 gap-1.5 w-36">
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    title={c.name}
                    style={{ backgroundColor: c.color === "transparent" ? "#e2e8f0" : c.color }}
                    onClick={() => {
                      execCommand("hiliteColor", c.color);
                      setShowHighlightMenu(false);
                    }}
                    className="w-6 h-6 rounded-md border border-slate-300 dark:border-slate-600 hover:scale-110 transition-transform"
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Clear Formatting */}
        <button
          type="button"
          title="Xóa định dạng"
          onClick={() => execCommand("removeFormat")}
          className="p-1.5 hover:bg-rose-100 text-rose-600 dark:hover:bg-rose-950/40 dark:text-rose-400 rounded-md transition-colors ml-auto"
        >
          <Eraser className="h-4 w-4" />
        </button>
      </div>

      {/* Editor Content editable Area */}
      <div className="relative p-3">
        {isEditorEmpty && (
          <div className="absolute top-3 left-3 text-slate-400 dark:text-slate-500 pointer-events-none text-sm italic select-none">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          style={{ minHeight }}
          className="outline-none text-sm text-slate-800 dark:text-slate-100 leading-relaxed font-sans prose dark:prose-invert max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-4 [&_blockquote]:border-sky-500 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:my-2"
        />
      </div>
    </div>
  );
}
