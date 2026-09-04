import { getHighlightedCode, getLanguageLabel } from "./highlight";
import { escapeHtml as escapeText, escapeAttr } from "./escape";

function safeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("#")) return escapeAttr(trimmed);
  if (/^(https?:|mailto:)/i.test(trimmed)) return escapeAttr(trimmed);
  return "#";
}

/* ─── Inline rendering (escape + formatting in one pass) ───────── */

const INLINE_MAX_DEPTH = 8;
const ESCAPABLE = new Set(["\\", "`", "*", "_", "[", "]", "(", ")", "#", "+", "-", ".", "!", ">"]);

function findClosingParen(text: string, from: number): number {
  for (let i = from; i < text.length; i++) {
    if (text[i] === "\\") {
      i += 1;
      continue;
    }
    if (text[i] === ")") return i;
  }
  return -1;
}

/**
 * Renders inline markdown from RAW text into escaped HTML.
 * Code spans are emitted immediately; bold/italic/link content is parsed
 * recursively so nesting (e.g. **bold with *emphasis*** or links inside
 * bold) works without regex re-touching already-escaped output.
 */
function renderInline(text: string, depth = 0): string {
  if (depth > INLINE_MAX_DEPTH) return escapeText(text);

  let out = "";
  let i = 0;
  const n = text.length;

  while (i < n) {
    const c = text[i];

    // Escaped punctuation: `\*` → literal `*`
    if (c === "\\" && i + 1 < n && ESCAPABLE.has(text[i + 1])) {
      out += escapeText(text[i + 1]);
      i += 2;
      continue;
    }

    // Code span
    if (c === "`") {
      const j = text.indexOf("`", i + 1);
      if (j > i) {
        const content = text.slice(i + 1, j);
        if (content.length > 0 && !content.includes("\n")) {
          out += `<code class="inline-code">${escapeText(content)}</code>`;
          i = j + 1;
          continue;
        }
      }
      out += escapeText(c);
      i += 1;
      continue;
    }

    // Bold
    if (c === "*" && text[i + 1] === "*") {
      const j = text.indexOf("**", i + 2);
      if (j === i + 2) {
        // Empty "****" — keep literal
        out += escapeText("**");
        i += 2;
        continue;
      }
      if (j > i + 2) {
        out += `<strong>${renderInline(text.slice(i + 2, j), depth + 1)}</strong>`;
        i = j + 2;
        continue;
      }
      out += escapeText("**");
      i += 2;
      continue;
    }

    // Italic
    if (c === "*") {
      const j = text.indexOf("*", i + 1);
      if (j > i + 1 && text[j + 1] !== "*") {
        out += `<em>${renderInline(text.slice(i + 1, j), depth + 1)}</em>`;
        i = j + 1;
        continue;
      }
      out += escapeText(c);
      i += 1;
      continue;
    }

    // Images: `![alt](url)` — rendered as a link to the alt text (img is not
    // allowed by the sanitizer, so degrade gracefully instead of breaking).
    if (c === "!" && text[i + 1] === "[") {
      i += 1;
      continue;
    }

    // Links
    if (c === "[") {
      const open = text.indexOf("](", i + 1);
      if (open > i) {
        const close = findClosingParen(text, open + 2);
        if (close > open) {
          const label = text.slice(i + 1, open);
          const url = text.slice(open + 2, close);
          if (label.length > 0 && url.length > 0) {
            out += `<a href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer">${renderInline(label, depth + 1)}</a>`;
            i = close + 1;
            continue;
          }
        }
      }
      out += escapeText(c);
      i += 1;
      continue;
    }

    out += escapeText(c);
    i += 1;
  }

  return out;
}

/* ─── Block-level parsing ──────────────────────────────────────── */

interface Fence {
  char: string;
  length: number;
  lang: string;
}

function matchFence(line: string): Fence | null {
  const m = /^ {0,3}(`{3,}|~{3,})\s*(.*?)\s*$/.exec(line);
  if (!m) return null;
  let lang = m[2].replace(/`+$/, "").trim();
  // "```ts extra words```" — keep only the leading identifier
  lang = lang.split(/\s+/)[0] ?? "";
  return { char: m[1][0], length: m[1].length, lang };
}

function isClosingFence(line: string, fence: Fence): boolean {
  const m = /^ {0,3}(`{3,}|~{3,})\s*$/.exec(line);
  if (!m) return false;
  return m[1][0] === fence.char && m[1].length >= fence.length;
}

function isHeading(line: string): boolean {
  return /^#{1,6}\s+\S/.test(line);
}

function isHr(line: string): boolean {
  return /^(?: {0,3}-{3,}| {0,3}_{3,}| {0,3}\*{3,})\s*$/.test(line);
}

function isBlockquote(line: string): boolean {
  return /^ {0,3}>/.test(line);
}

function stripBlockquote(line: string): string {
  return line.replace(/^ {0,3}>\s?/, "");
}

interface ListItem {
  ordered: boolean;
  start: number; // for ordered lists
  content: string;
}

function matchListItem(line: string): ListItem | null {
  const unordered = /^ {0,3}([-*+])\s+(.*)$/.exec(line);
  if (unordered) return { ordered: false, start: 0, content: unordered[2] };
  const ordered = /^ {0,3}(\d+)[.)]\s+(.*)$/.exec(line);
  if (ordered) return { ordered: true, start: Number(ordered[1]), content: ordered[2] };
  return null;
}

/** Split a `|` table row into trimmed cells. */
function splitRow(line: string): string[] {
  const cells = line.split("|").map((c) => c.trim());
  if (cells.length > 0 && cells[0] === "") cells.shift();
  if (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();
  return cells;
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line.trim());
}

/** Blocks that unambiguously end a paragraph even without a blank line. */
function isHardBlockStart(line: string): boolean {
  return matchFence(line) !== null || isHeading(line) || isHr(line) || isBlockquote(line);
}

const CODE_COPY_SVG =
  '<svg class="copy-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path></svg>';
const CODE_CHECK_SVG =
  '<svg class="check-icon hidden" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"></path></svg>';

function renderCodeBlock(code: string, lang: string): string {
  const label = getLanguageLabel(lang);
  const highlighted = getHighlightedCode(code, lang);
  return (
    `<div class="code-block">` +
    `<div class="code-block-header">` +
    `<span class="code-block-lang">${escapeAttr(label)}</span>` +
    `<button type="button" class="copy-code-btn" aria-label="Copy code" title="Copy code">` +
    CODE_COPY_SVG +
    CODE_CHECK_SVG +
    `<span class="copy-label">Copy</span>` +
    `</button>` +
    `</div>` +
    `<pre tabindex="0"><code>${highlighted}</code></pre>` +
    `</div>`
  );
}

function renderTable(header: string[], rows: string[][]): string {
  const head = `<thead><tr>${header.map((c) => `<th>${renderInline(c)}</th>`).join("")}</tr></thead>`;
  const body = rows.length
    ? `<tbody>${rows
        .map((row) => `<tr>${row.map((c) => `<td>${renderInline(c)}</td>`).join("")}</tr>`)
        .join("")}</tbody>`
    : "";
  return `<div class="md-table-scroll"><table>${head}${body}</table></div>`;
}

/**
 * Block renderer. `depth` guards against pathological nesting via blockquote
 * recursion. Fences, headings, hr, blockquotes, tables and lists are parsed at
 * line level; everything else becomes paragraphs (single newlines inside a
 * paragraph become <br> so the AI's own line breaks are preserved).
 */
function renderSource(text: string, depth: number): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line — skip
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Code fence (open may be indented up to 3 spaces)
    const fence = matchFence(line);
    if (fence) {
      const codeLines: string[] = [];
      let j = i + 1;
      let closed = false;
      while (j < lines.length) {
        if (isClosingFence(lines[j], fence)) {
          closed = true;
          j++;
          break;
        }
        codeLines.push(lines[j]);
        j++;
      }
      // Drop a single trailing blank line added before the closing fence
      if (closed && codeLines.length > 0 && codeLines[codeLines.length - 1].trim() === "")
        codeLines.pop();
      const code = codeLines.join("\n");
      out.push(renderCodeBlock(code, fence.lang));
      i = j;
      continue;
    }

    // Heading — real hierarchy, no forced level
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const content = renderInline(heading[2], depth);
      out.push(`<h${level}>${content}</h${level}>`);
      i++;
      continue;
    }

    // Horizontal rule
    if (isHr(line)) {
      out.push("<hr>");
      i++;
      continue;
    }

    // Blockquote
    if (isBlockquote(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && isBlockquote(lines[i])) {
        quoteLines.push(stripBlockquote(lines[i]));
        i++;
      }
      const inner = renderSource(quoteLines.join("\n"), depth + 1);
      out.push(`<blockquote>${inner}</blockquote>`);
      continue;
    }

    // List
    const firstItem = matchListItem(line);
    if (firstItem) {
      const items: Array<{ ordered: boolean; start: number; content: string }> = [];
      const orderedKind = firstItem.ordered;
      const startNumber = firstItem.start;

      while (i < lines.length) {
        const item = matchListItem(lines[i]);
        if (item) {
          if (items.length > 0 && item.ordered !== orderedKind) break;
          items.push({ ordered: item.ordered, start: item.start, content: item.content });
          i++;
          // Continuation lines (indented ≥ 2 spaces) belong to this item
          while (
            i < lines.length &&
            lines[i].trim() !== "" &&
            !matchListItem(lines[i]) &&
            /^ {2,}\S/.test(lines[i])
          ) {
            items[items.length - 1].content += `\n${lines[i].trim()}`;
            i++;
          }
          continue;
        }
        break;
      }

      if (items.length > 0) {
        const tag = orderedKind ? "ol" : "ul";
        const attrs = orderedKind && startNumber !== 1 ? ` start="${startNumber}"` : "";
        const lis = items
          .map((item) => {
            const parts = item.content.split("\n").filter(Boolean);
            const body = parts.map((p) => renderInline(p, depth)).join("<br>");
            return `<li>${body}</li>`;
          })
          .join("");
        out.push(`<${tag}${attrs}>${lis}</${tag}>`);
        continue;
      }
    }

    // Table: header row + separator row
    if (line.includes("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const header = splitRow(line);
      const rows: string[][] = [];
      let j = i + 2;
      while (
        j < lines.length &&
        lines[j].includes("|") &&
        !isHardBlockStart(lines[j]) &&
        lines[j].trim() !== ""
      ) {
        rows.push(splitRow(lines[j]));
        j++;
      }
      if (header.length > 0) {
        out.push(renderTable(header, rows));
        i = j;
        continue;
      }
    }

    // Paragraph — gather until a blank line or an unambiguous block start
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !isHardBlockStart(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    if (para.length > 0) {
      const html = para.map((p) => renderInline(p, depth)).join("<br>");
      out.push(`<p>${html}</p>`);
      continue;
    }

    i++;
  }

  return out.join("\n");
}

export function renderMarkdown(text: string): string {
  const src = String(text ?? "").replace(/\r\n?/g, "\n");
  if (src.trim() === "") return "";
  return renderSource(src, 0);
}
