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
    expect(result).toContain("target=\"_blank\"");
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
});
