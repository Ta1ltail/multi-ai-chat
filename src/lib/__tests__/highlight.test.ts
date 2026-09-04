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

  it("highlights TypeScript function names and type annotations", () => {
    const result = getHighlightedCode("function greet(name: string): void {", "typescript");
    expect(result).toContain("hljs-function");
    expect(result).toContain("hljs-keyword");
    expect(result).toContain("greet");
  });

  it("highlights Python self as a variable", () => {
    const result = getHighlightedCode("def __init__(self, name):", "python");
    expect(result).toContain("hljs-variable");
    expect(result).toContain("hljs-function");
  });

  it("highlights CSS properties and numbers", () => {
    const result = getHighlightedCode("color: #ff0000; margin: 12px;", "css");
    expect(result).toContain("hljs-property");
    expect(result).toContain("hljs-number");
  });

  it("highlights PHP variables and strings", () => {
    const result = getHighlightedCode('$name = "hello";', "php");
    expect(result).toContain("hljs-variable");
    expect(result).toContain("hljs-string");
  });

  it("highlights SQL keywords and comments", () => {
    const result = getHighlightedCode("-- find users\nSELECT * FROM users;", "sql");
    expect(result).toContain("hljs-comment");
    expect(result).toContain("hljs-keyword");
  });

  it("highlights c++ aliases", () => {
    const result = getHighlightedCode("#include <iostream>\nint main() { return 0; }", "c++");
    expect(result).toContain("hljs-keyword");
    expect(result).toContain("hljs-number");
  });

  it("leaves unknown languages untouched but escaped", () => {
    const result = getHighlightedCode("weird { thing } [1, 2]", "klingon");
    expect(result).not.toContain("hljs-");
    expect(result).toContain("weird { thing } [1, 2]");
  });

  it("does not leak lastIndex between highlight calls (shared regex safety)", () => {
    const first = getHighlightedCode("const a = 'x';", "javascript");
    const second = getHighlightedCode("let b = 2;", "javascript");
    expect(first).toContain("hljs-keyword");
    expect(second).toContain("hljs-keyword");
    expect(second).toContain("hljs-number");
  });

  it("highlights decorators only in python", () => {
    const result = getHighlightedCode("@app.route('/')", "python");
    expect(result).toContain("hljs-decorator");
  });

  it("exposes human-readable language labels", async () => {
    const { getLanguageLabel } = await import("../highlight");
    expect(getLanguageLabel("typescript")).toBe("TypeScript");
    expect(getLanguageLabel("c#")).toBe("C#");
    expect(getLanguageLabel("js")).toBe("JavaScript");
    expect(getLanguageLabel("sh")).toBe("Bash");
    expect(getLanguageLabel("custom-thing")).toBe("custom-thing");
    expect(getLanguageLabel("")).toBe("code");
  });
});
