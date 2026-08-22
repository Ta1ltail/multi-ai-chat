/**
 * Lightweight markdown renderer for chat messages.
 * Handles: code blocks, inline code, bold, italic, links, lists, line breaks.
 * No external dependencies.
 */

import { getHighlightedCode } from "./highlight";

export function renderMarkdown(text: string): string {
  let html = text;

  // Code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const language = lang || "text";
    const highlighted = getHighlightedCode(code.trim(), language);

    // NOTE: the copy button intentionally has no inline `onclick`. HTML
    // attributes don't support backslash-escaping (`\"`), only entity
    // escaping (`&quot;`) — an earlier version used `\"` around the SVG
    // markup, which the HTML parser read as the end of the `onclick`
    // attribute, truncating it. Clicks are handled instead via event
    // delegation in Message.tsx.
    //
    // The button lives OUTSIDE `.code-block` (in the wrapper, below the
    // box) but is still found via `.closest(".code-block-wrapper")`.
    return `<div class="code-block-wrapper my-3">
      <div class="code-block overflow-hidden rounded-xl border border-border-separator bg-surface-elevated">
        <pre class="overflow-x-auto p-4 text-[13px] leading-relaxed"><code class="font-mono text-foreground">${highlighted}</code></pre>
      </div>
      <div class="mt-1 flex justify-start">
        <button type="button" class="copy-code-btn text-foreground-tertiary hover:text-foreground hover:bg-hover flex h-7 w-7 items-center justify-center rounded-md transition-colors" title="Copy code">
          <svg class="copy-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          <svg class="check-icon hidden" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
        </button>
      </div>
    </div>`;
  });

  // Inline code (` ... `)
  html = html.replace(/`([^`]+)`/g, '<code class="bg-surface-elevated rounded px-1.5 py-0.5 text-[13px] font-mono text-accent">$1</code>');

  // Bold (** ... **)
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Italic (* ... *)
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");

  // Links [text](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-accent underline hover:text-accent-hover">$1</a>',
  );

  // Unordered lists (- item)
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');
  html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => `<ul class="my-2 space-y-1">${match}</ul>`);

  // Ordered lists (1. item)
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');

  // Line breaks (but not inside pre tags)
  html = html.replace(/(?<!<\/pre>)\n(?!<)/g, "<br>");

  return html;
}