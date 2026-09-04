import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../markdown";

/** Strip tags/entities so code *content* can be asserted independent of token spans. */
function textOf(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

describe("renderMarkdown", () => {
  it("renders code blocks with syntax highlighting", () => {
    const input = "```javascript\nconst x = 1;\n```";
    const result = renderMarkdown(input);
    expect(result).toContain("code-block");
    expect(result).toContain("hljs-keyword");
    expect(result).toContain("copy-code-btn");
  });

  it("renders inline code", () => {
    const input = "Use `console.log()` for debugging";
    const result = renderMarkdown(input);
    expect(result).toContain("<code");
    expect(result).toContain("console.log()");
  });

  it("renders bold text", () => {
    const input = "This is **bold** text";
    const result = renderMarkdown(input);
    expect(result).toContain("<strong>bold</strong>");
  });

  it("renders italic text", () => {
    const input = "This is *italic* text";
    const result = renderMarkdown(input);
    expect(result).toContain("<em>italic</em>");
  });

  it("renders links", () => {
    const input = "[Google](https://google.com)";
    const result = renderMarkdown(input);
    expect(result).toContain('href="https://google.com"');
    expect(result).toContain('target="_blank"');
    expect(result).toContain("Google");
  });

  it("renders unordered lists", () => {
    const input = "- item 1\n- item 2\n- item 3";
    const result = renderMarkdown(input);
    expect(result).toContain("<ul");
    expect(result).toContain("item 1");
    expect(result).toContain("item 2");
  });

  it("renders ordered lists", () => {
    const input = "1. first\n2. second\n3. third";
    const result = renderMarkdown(input);
    expect(result).toContain("<ol");
    expect(result).toContain("first");
  });

  it("converts line breaks to <br>", () => {
    const input = "line 1\nline 2";
    const result = renderMarkdown(input);
    expect(result).toContain("<br>");
  });

  it("handles empty input", () => {
    const result = renderMarkdown("");
    expect(result).toBe("");
  });

  it("handles text with no markdown", () => {
    const input = "Just plain text";
    const result = renderMarkdown(input);
    expect(result).toContain("Just plain text");
  });

  // --- URL escaping / scheme validation tests (M-1) ---

  it("allows https links", () => {
    const input = "[link](https://example.com)";
    const result = renderMarkdown(input);
    expect(result).toContain('href="https://example.com"');
  });

  it("allows http links", () => {
    const input = "[link](http://example.com)";
    const result = renderMarkdown(input);
    expect(result).toContain('href="http://example.com"');
  });

  it("allows mailto links", () => {
    const input = "[email](mailto:user@example.com)";
    const result = renderMarkdown(input);
    expect(result).toContain('href="mailto:user@example.com"');
  });

  it("allows fragment-only links", () => {
    const input = "[jump](#section)";
    const result = renderMarkdown(input);
    expect(result).toContain('href="#section"');
  });

  it("blocks javascript: URLs", () => {
    const input = "[click](javascript:alert(1))";
    const result = renderMarkdown(input);
    expect(result).not.toContain("javascript:");
    expect(result).toContain('href="#"');
  });

  it("blocks data: URLs", () => {
    const input = "[click](data:text/html,<script>alert(1)</script>)";
    const result = renderMarkdown(input);
    expect(result).not.toContain("data:");
    expect(result).toContain('href="#"');
  });

  it("blocks vbscript: URLs", () => {
    const input = "[click](vbscript:MsgBox(1))";
    const result = renderMarkdown(input);
    expect(result).not.toContain("vbscript:");
    expect(result).toContain('href="#"');
  });

  it("escapes quotes in href to prevent attribute breakout", () => {
    const input = '[click](https://example.com" onclick="alert(1))';
    const result = renderMarkdown(input);
    // The quote in the URL should be escaped to &quot;, preventing actual attribute breakout.
    // The resulting HTML has onclick=&quot; safely inside the href value, not as a real attribute.
    expect(result).toContain("&quot;");
    // Verify the a tag's href contains the full escaped URL (no breakout)
    expect(result).toMatch(/href="https:\/\/example\.com&quot; onclick=&quot;alert\(1"/);
  });

  it("escapes < and > in href", () => {
    const input = "[click](https://example.com/<script>)";
    const result = renderMarkdown(input);
    expect(result).not.toContain("<script>");
    expect(result).toContain("&lt;script&gt;");
  });

  // --- Code block sentinel tests (H-2 + M-7) ---

  it("does not bold asterisks inside code blocks", () => {
    const input = "```\n**not bold**\n```";
    const result = renderMarkdown(input);
    expect(result).not.toContain("<strong>");
    expect(result).toContain("**not bold**");
  });

  it("does not italicize single asterisks inside code blocks", () => {
    const input = "```\n*not italic*\n```";
    const result = renderMarkdown(input);
    expect(result).not.toContain("<em>");
    expect(result).toContain("*not italic*");
  });

  it("does not create links inside code blocks", () => {
    const input = "```\n[text](https://example.com)\n```";
    const result = renderMarkdown(input);
    expect(result).not.toContain("<a href");
    expect(result).toContain("[text](https://example.com)");
  });

  it("does not convert backticks inside code blocks to inline code", () => {
    const input = "```\n`not inline`\n```";
    const result = renderMarkdown(input);
    // Should have the code-block-wrapper code tag, not inline code styling
    expect(result).toContain("`not inline`");
  });

  it("still applies inline passes outside code blocks", () => {
    const input = "**bold**\n```\n*not bold*\n```\n**also bold**";
    const result = renderMarkdown(input);
    expect(result).toContain("<strong>bold</strong>");
    expect(result).toContain("<strong>also bold</strong>");
    expect(result).not.toContain("<strong>not bold</strong>");
  });

  it("handles multiple code blocks with different languages", () => {
    const input = "```javascript\n// **bold**\n```\n\nSome text\n\n```python\n# **bold**\n```";
    const result = renderMarkdown(input);
    // No bold inside code blocks — asterisks preserved as text (not wrapped in <strong>)
    expect(result).not.toContain("<strong>");
    expect(result).toContain("**bold**");
    // Text outside code blocks is untouched
    expect(result).toContain("Some text");
  });

  // --- New renderer: heading hierarchy (no forced ###) ---

  it("renders #, ##, ### as real h1/h2/h3 with hierarchy", () => {
    const input = "# Large Language Models\n\n## What the model sees\n\n### Why it feels intelligent\n\n#### Deep detail\n\nBody text";
    const result = renderMarkdown(input);
    expect(result).toContain("<h1>Large Language Models</h1>");
    expect(result).toContain("<h2>What the model sees</h2>");
    expect(result).toContain("<h3>Why it feels intelligent</h3>");
    expect(result).toContain("<h4>Deep detail</h4>");
    // The raw # markers must never leak into output
    expect(result).not.toContain("###");
  });

  it("supports headings up to h6", () => {
    const result = renderMarkdown("###### tiny heading");
    expect(result).toContain("<h6>tiny heading</h6>");
  });

  it("allows inline formatting inside headings", () => {
    const result = renderMarkdown("## Using **the** model");
    expect(result).toContain("<h2>Using <strong>the</strong> model</h2>");
  });

  // --- Tables, blockquotes, hr ---

  it("renders tables with header and body", () => {
    const input = [
      "| Step | What happens |",
      "|---|---|",
      "| Tokenisation | Text is broken into tokens. |",
      "| Learning | The model adjusts weights. |",
    ].join("\n");
    const result = renderMarkdown(input);
    expect(result).toContain("<table>");
    expect(result).toContain("<th>Step</th>");
    expect(result).toContain("<th>What happens</th>");
    expect(result).toContain("<td>Tokenisation</td>");
    expect(result).toContain("<tbody>");
  });

  it("renders blockquotes", () => {
    const result = renderMarkdown("> **Result:** The model predicts the next token.");
    expect(result).toContain("<blockquote>");
    expect(result).toContain("<strong>Result:</strong>");
  });

  it("renders horizontal rules", () => {
    const result = renderMarkdown("Before\n\n---\n\nAfter");
    expect(result).toContain("<p>Before</p>");
    expect(result).toContain("<hr>");
    expect(result).toContain("<p>After</p>");
  });

  // --- Code fence robustness ---

  it("handles language tags with non-word characters (c++, c#, objective-c)", () => {
    const cpp = renderMarkdown("```c++\nint x = 1;\n```");
    expect(cpp).toContain("code-block");
    expect(textOf(cpp)).toContain("int x = 1;");

    const cs = renderMarkdown("```c#\nvar x = 1;\n```");
    expect(cs).toContain("code-block");
    expect(textOf(cs)).toContain("var x = 1;");

    const objc = renderMarkdown("```objective-c\nint y = 2;\n```");
    expect(objc).toContain("code-block");
    expect(textOf(objc)).toContain("int y = 2;");
  });

  it("renders an unclosed fence to end of message instead of breaking", () => {
    const result = renderMarkdown("```typescript\nconst x = 1;\n// trailing text without close");
    expect(result).toContain("code-block");
    expect(textOf(result)).toContain("const x = 1;");
    expect(result).toContain("hljs-keyword");
    expect(textOf(result)).toContain("trailing text without close");
  });

  it("preserves code indentation exactly", () => {
    const input = "```python\ndef hello():\n    return True\n    indented = \"yes\"\n```";
    const result = renderMarkdown(input);
    // Inner spaces of code survive; leading 4-space indentation is not trimmed
    const text = textOf(result);
    expect(text).toContain("def hello():");
    expect(text).toContain("\n    return True\n    indented");
    expect(text).toContain('indented = "yes"');
  });

  it("shows a human language label in the block header", () => {
    const result = renderMarkdown("```typescript\nconst a = 1;\n```");
    expect(result).toContain('code-block-lang">TypeScript</span>');
    expect(result).toContain("TypeScript");
  });

  // --- Copy buttons: exactly one per code block, none elsewhere ---

  it("renders exactly one copy button per code block", () => {
    const input = "```ts\nconst a = 1;\n```\n\nParagraph with `inline` code.\n\n```python\nprint(1)\n```";
    const result = renderMarkdown(input);
    expect(result.match(/copy-code-btn/g) ?? []).toHaveLength(2);
    // Inline code is plain <code class="inline-code">, no copy button
    expect(result).toContain("class=\"inline-code\"");
  });

  it("renders nothing for headings inside fenced code", () => {
    const result = renderMarkdown("```md\n# not a heading\n```");
    expect(result).not.toContain("<h1>");
    expect(result).toContain("# not a heading");
  });

  it("does not break on special characters or escaped markdown", () => {
    const result = renderMarkdown("A \\*literal asterisk\\* and \\`tick\\` and a < b & c > d");
    expect(result).not.toContain("<em>");
    expect(result).toContain("*literal asterisk*");
    expect(result).toContain("&lt; b &amp; c &gt;");
  });

  it("renders a long document with consistent block boundaries", () => {
    const input = [
      "# LLMs – A Simple Overview",
      "",
      "Think of an LLM as a **very smart autocomplete**.\nThat has read a huge amount of text.",
      "",
      "## What the model sees",
      "",
      "| Step | What happens | Everyday analogy |",
      "|---|---|---|",
      "| **Data collection** | Fed billions of sentences. | Like giving a child books. |",
      "",
      "> **Result:** The model repeatedly predicts the next token.",
      "",
      "## Example Code",
      "",
      "```typescript",
      "function debounce<T extends unknown[]>(",
      "  fn: (...args: T) => void",
      "): (...args: T) => void {",
      "  // keep it simple",
      "  return fn;",
      "}",
      "```",
      "",
      "Key takeaways:",
      "",
      "- LLMs learn patterns.",
      "- The model predicts tokens sequentially.",
    ].join("\n");
    const result = renderMarkdown(input);
    expect(result).toContain("<h1>LLMs – A Simple Overview</h1>");
    expect(result).toContain("<h2>What the model sees</h2>");
    expect(result).toContain("<h2>Example Code</h2>");
    expect(result).toContain("<table>");
    expect(result).toContain("<blockquote>");
    expect(result).toContain("<ul>");
    expect(textOf(result)).toContain("function debounce");
    expect(result).toContain("hljs-comment");
    expect(result).toContain("copy-code-btn");
    expect((result.match(/copy-code-btn/g) ?? []).length).toBe(1);
  });
});
