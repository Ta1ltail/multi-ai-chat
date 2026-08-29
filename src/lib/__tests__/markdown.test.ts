import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../markdown";

describe("renderMarkdown", () => {
  it("renders code blocks with syntax highlighting", () => {
    const input = "```javascript\nconst x = 1;\n```";
    const result = renderMarkdown(input);
    expect(result).toContain("code-block-wrapper");
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
});
