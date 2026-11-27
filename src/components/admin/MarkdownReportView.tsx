"use client";

import React, { useMemo } from "react";

interface MarkdownReportViewProps {
  content: string;
}

export default function MarkdownReportView({ content }: MarkdownReportViewProps) {
  const renderedElements = useMemo(() => {
    if (!content) return null;

    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];
    let listBuffer: string[] = [];
    let listKey = 0;

    const flushList = () => {
      if (listBuffer.length > 0) {
        elements.push(
          <ul key={`ul-${listKey++}`} className="space-y-1.5 my-2 pl-4 list-disc marker:text-emerald-500">
            {listBuffer.map((item, idx) => (
              <li key={idx} className="text-slate-800 dark:text-zinc-200 text-xs leading-relaxed">
                {parseInlineFormatting(item)}
              </li>
            ))}
          </ul>
        );
        listBuffer = [];
      }
    };

    const parseInlineFormatting = (text: string): React.ReactNode => {
      if (!text) return null;
      // Match:
      // 1. ***bold italic***
      // 2. **bold**
      // 3. *italic* (tidak diawali/diakhiri spasi di dalam bintang)
      // 4. `code`
      // 5. _italic_
      const tokenRegex = /(\*\*\*[\s\S]+?\*\*\*|\*\*[\s\S]+?\*\*|\*(?!\s)[^*]+?(?<!\s)\*|`[^`]+`|_(?!\s)[^_]+?(?<!\s)_)/g;
      const parts = text.split(tokenRegex);
      return parts.map((part, i) => {
        if (!part) return null;
        if (part.startsWith("***") && part.endsWith("***") && part.length >= 6) {
          return (
            <strong key={i} className="font-bold text-slate-900 dark:text-white">
              <em className="italic">{part.slice(3, -3)}</em>
            </strong>
          );
        }
        if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
          return (
            <strong key={i} className="font-bold text-slate-900 dark:text-white">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
          return (
            <em key={i} className="italic text-slate-800 dark:text-zinc-200">
              {part.slice(1, -1)}
            </em>
          );
        }
        if (part.startsWith("_") && part.endsWith("_") && part.length >= 2) {
          return (
            <em key={i} className="italic text-slate-800 dark:text-zinc-200">
              {part.slice(1, -1)}
            </em>
          );
        }
        if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
          return (
            <code
              key={i}
              className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 font-mono text-[11px]"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      });
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Check bullet list item
      if (trimmed.startsWith("* ") || trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
        listBuffer.push(trimmed.slice(2).trim());
        return;
      }

      // Flush accumulated bullet list if regular line encountered
      flushList();

      // Horizontal Divider (markdown standard & box drawing characters)
      if (
        trimmed === "---" ||
        trimmed === "***" ||
        trimmed === "___" ||
        /^━+$/.test(trimmed) ||
        /^─+$/.test(trimmed) ||
        /^-{3,}$/.test(trimmed)
      ) {
        elements.push(
          <hr key={`hr-${index}`} className="my-3.5 border-slate-200 dark:border-zinc-800" />
        );
        return;
      }

      // Heading 1
      if (trimmed.startsWith("# ")) {
        elements.push(
          <h1
            key={`h1-${index}`}
            className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight mt-4 mb-2 pb-1.5 border-b border-slate-200/80 dark:border-zinc-800 flex items-center gap-2"
          >
            {parseInlineFormatting(trimmed.slice(2))}
          </h1>
        );
        return;
      }

      // Heading 2
      if (trimmed.startsWith("## ")) {
        elements.push(
          <h2
            key={`h2-${index}`}
            className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight mt-3 mb-1.5"
          >
            {parseInlineFormatting(trimmed.slice(3))}
          </h2>
        );
        return;
      }

      // Heading 3
      if (trimmed.startsWith("### ")) {
        elements.push(
          <h3
            key={`h3-${index}`}
            className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-zinc-100 tracking-tight mt-2.5 mb-1"
          >
            {parseInlineFormatting(trimmed.slice(4))}
          </h3>
        );
        return;
      }

      // Blockquote
      if (trimmed.startsWith("> ")) {
        elements.push(
          <div
            key={`bq-${index}`}
            className="my-2 p-3 rounded-xl border-l-4 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-slate-700 dark:text-zinc-300 text-xs italic"
          >
            {parseInlineFormatting(trimmed.slice(2))}
          </div>
        );
        return;
      }

      // Empty Line
      if (!trimmed) {
        elements.push(<div key={`sp-${index}`} className="h-1.5" />);
        return;
      }

      // Regular Paragraph
      elements.push(
        <p key={`p-${index}`} className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed">
          {parseInlineFormatting(trimmed)}
        </p>
      );
    });

    flushList();
    return elements;
  }, [content]);

  return (
    <div className="space-y-1 text-xs select-text">
      {renderedElements}
    </div>
  );
}
