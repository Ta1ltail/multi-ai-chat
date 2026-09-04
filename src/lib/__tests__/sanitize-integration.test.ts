// @vitest-environment jsdom

import { describe, it, expect } from "vitest";
import { sanitizeHTML } from "../sanitize";
import { renderMarkdown } from "../markdown";

/**
 * Integration tests using real DOMPurify in a jsdom environment.
 * These verify the ACTUAL sanitizer config, not a mock.
 */
describe("sanitizeHTML (integration — real DOMPurify)", () => {
  it("strips <script> tags completely", () => {
    const input = '<p>Hello</p><script>alert("xss")</script>';
    const result = sanitizeHTML(input);
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("alert");
    expect(result).toContain("Hello");
  });

  it("strips <img onerror> event handlers", () => {
    const input = '<img src="x" onerror="alert(1)">';
    const result = sanitizeHTML(input);
    expect(result).not.toContain("onerror");
    expect(result).not.toContain("alert");
  });

  it("strips javascript: URLs in href", () => {
    const input = '<a href="javascript:alert(1)">click</a>';
    const result = sanitizeHTML(input);
    expect(result).not.toContain("javascript:");
  });

  it("strips data: URIs in href", () => {
    const input = '<a href="data:text/html,<script>alert(1)</script>">click</a>';
    const result = sanitizeHTML(input);
    expect(result).not.toContain("data:");
  });

  it("strips vbscript: URIs", () => {
    const input = '<a href="vbscript:MsgBox(1)">click</a>';
    const result = sanitizeHTML(input);
    expect(result).not.toContain("vbscript:");
  });

  it("allows safe HTML tags (p, strong, em, code, pre)", () => {
    const input = "<p><strong>bold</strong> and <em>italic</em></p>";
    const result = sanitizeHTML(input);
    expect(result).toContain("<strong>");
    expect(result).toContain("<em>");
  });

  it("allows http and https links", () => {
    const input =
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">link</a>';
    const result = sanitizeHTML(input);
    expect(result).toContain("https://example.com");
    expect(result).toContain("target");
  });

  it("allows mailto links", () => {
    const input = '<a href="mailto:test@example.com">email</a>';
    const result = sanitizeHTML(input);
    expect(result).toContain("mailto:test@example.com");
  });

  it("allows code blocks with classes", () => {
    const input =
      '<div class="code-block-wrapper"><pre><code class="font-mono">const x = 1;</code></pre></div>';
    const result = sanitizeHTML(input);
    expect(result).toContain("code-block-wrapper");
    expect(result).toContain("font-mono");
  });

  it("allows copy button with SVG icons", () => {
    const input =
      '<button type="button" class="copy-code-btn" title="Copy code"><svg width="13" height="13" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4"></path></svg></button>';
    const result = sanitizeHTML(input);
    expect(result).toContain("copy-code-btn");
    expect(result).toContain("<svg");
    expect(result).toContain("<rect");
    expect(result).toContain("<path");
  });

  it("preserves text content", () => {
    const input = "Hello world, this is plain text.";
    const result = sanitizeHTML(input);
    expect(result).toBe("Hello world, this is plain text.");
  });

  it("strips <iframe> tags", () => {
    const input = '<iframe src="https://evil.com"></iframe><p>safe</p>';
    const result = sanitizeHTML(input);
    expect(result).not.toContain("<iframe>");
    expect(result).toContain("safe");
  });

  it("strips <object> and <embed> tags", () => {
    const input = '<object data="evil.swf"></object><embed src="evil.swf"><p>safe</p>';
    const result = sanitizeHTML(input);
    expect(result).not.toContain("<object>");
    expect(result).not.toContain("<embed>");
    expect(result).toContain("safe");
  });

  it("strips event handlers on allowed tags", () => {
    const input = '<p onclick="alert(1)" onmouseover="alert(2)">text</p>';
    const result = sanitizeHTML(input);
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("onmouseover");
    expect(result).toContain("text");
  });

  it("strips style attribute (not in allowlist)", () => {
    const input = '<p style="background:red">text</p>';
    const result = sanitizeHTML(input);
    expect(result).not.toContain("style=");
    expect(result).toContain("text");
  });

  it("handles nested XSS attempts", () => {
    const input =
      '<div><img src=x onerror="alert(1)"><script>alert(2)</script><a href="javascript:void(0)">link</a></div>';
    const result = sanitizeHTML(input);
    expect(result).not.toContain("alert");
    expect(result).not.toContain("javascript:");
    expect(result).not.toContain("<script>");
  });

  it("strips data-* attributes (ALLOW_DATA_ATTR: false)", () => {
    const input = '<p data-testid="x" data-action="evil">text</p>';
    const result = sanitizeHTML(input);
    expect(result).not.toContain("data-testid");
    expect(result).not.toContain("data-action");
    expect(result).toContain("text");
  });

  it("preserves the full markdown feature set through sanitize", () => {
    const md = [
      "# Big Title",
      "",
      "## Section",
      "",
      "Paragraph with `inline` and **bold**.\nSecond line.",
      "",
      "- item one",
      "- item two",
      "",
      "> A quote",
      "",
      "| A | B |",
      "|---|---|",
      "| 1 | 2 |",
      "",
      "```javascript",
      "const x = 1; // comment",
      "```",
      "",
      "---",
      "",
      "Done.",
    ].join("\n");
    const result = sanitizeHTML(renderMarkdown(md));
    expect(result).toContain("<h1>");
    expect(result).toContain("<h2>");
    expect(result).toContain("<blockquote>");
    expect(result).toContain("<table>");
    expect(result).toContain("<th>");
    expect(result).toContain("<td>");
    expect(result).toContain("<hr>");
    expect(result).toContain("<ul>");
    expect(result).toContain("code-block");
    expect(result).toContain("copy-code-btn");
    expect(result).toContain("inline-code");
  });

  it("renders ordered lists from markdown through sanitize", () => {
    const result = sanitizeHTML(renderMarkdown("1. first\n2. second"));
    expect(result).toContain("<ol");
    expect(result).toContain("first");
  });

  it("keeps code text intact but strips any script payload", () => {
    const md = "```html\n<script>alert(1)</script>\n```";
    const result = sanitizeHTML(renderMarkdown(md));
    // The <script> source never becomes a live element — it stays escaped text
    expect(result).not.toContain("<script>");
    expect(result).toContain("&lt;script");
    expect(result).toContain("alert(1)");
  });
});
