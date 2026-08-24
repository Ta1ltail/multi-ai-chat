import { describe, it, expect } from "vitest";
import { getHighlightedCode } from "../highlight";

describe("getHighlightedCode", () => {
  it("returns escaped HTML for unknown languages", () => {
    const result = getHighlightedCode("<script>alert('xss')</script>", "unknown");
    expect(result).toContain("&lt;script&gt;");
    expect(result).not.toContain("<script>");
  });

  it("highlights JavaScript keywords", () => {
    const result = getHighlightedCode("const x = 10;", "javascript");
    expect(result).toContain("hljs-keyword");
    expect(result).toContain("const");
  });

  it("highlights JavaScript strings (escaped quotes)", () => {
    // Quotes are HTML-escaped to &quot; before highlighting
    const result = getHighlightedCode('"hello world"', "javascript");
    expect(result).toContain("hljs-string");
    expect(result).toContain("&quot;hello world&quot;");
  });

  it("highlights JavaScript comments", () => {
    const result = getHighlightedCode("// this is a comment", "javascript");
    expect(result).toContain("hljs-comment");
  });

  it("highlights TypeScript keywords", () => {
    const result = getHighlightedCode("interface Foo {}", "typescript");
    expect(result).toContain("hljs-keyword");
    expect(result).toContain("interface");
  });

  it("highlights Python keywords", () => {
    const result = getHighlightedCode("def hello():", "python");
    expect(result).toContain("hljs-keyword");
    expect(result).toContain("def");
  });

  it("highlights Python decorators", () => {
    const result = getHighlightedCode("@property", "python");
    expect(result).toContain("hljs-decorator");
  });

  it("highlights JSON keys (escaped quotes)", () => {
    const result = getHighlightedCode('{"key": "value"}', "json");
    expect(result).toContain("hljs-key");
  });

  it("highlights bash commands", () => {
    const result = getHighlightedCode("npm install", "bash");
    expect(result).toContain("hljs-keyword");
  });

  it("resolves language aliases", () => {
    const jsResult = getHighlightedCode("const x = 1;", "js");
    const tsResult = getHighlightedCode("const x = 1;", "ts");
    expect(jsResult).toContain("hljs-keyword");
    expect(tsResult).toContain("hljs-keyword");
  });

  it("handles empty code", () => {
    const result = getHighlightedCode("", "javascript");
    expect(result).toBe("");
  });

  it("escapes HTML entities in code", () => {
    const result = getHighlightedCode("a < b && c > d", "plaintext");
    expect(result).toContain("&lt;");
    expect(result).toContain("&gt;");
    expect(result).toContain("&amp;");
  });
});
