import { describe, it, expect, vi } from "vitest";

// Mock DOMPurify before importing sanitize
vi.mock("dompurify", () => ({
  default: {
    sanitize: vi.fn((dirty: string) => {
      // Simple mock sanitizer: strip script tags and event handlers
      return dirty
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/\son\w+="[^"]*"/gi, "")
        .replace(/javascript:/gi, "");
    }),
  },
}));

import { sanitizeHTML } from "../sanitize";

describe("sanitizeHTML", () => {
  it("strips script tags", () => {
    const input = '<p>Hello</p><script>alert("xss")</script>';
    const result = sanitizeHTML(input);
    expect(result).not.toContain("<script>");
    expect(result).toContain("Hello");
  });

  it("strips onerror attributes", () => {
    const input = '<img src="x" onerror="alert(1)">';
    const result = sanitizeHTML(input);
    expect(result).not.toContain("onerror");
  });

  it("strips javascript: URLs", () => {
    const input = '<a href="javascript:alert(1)">click</a>';
    const result = sanitizeHTML(input);
    expect(result).not.toContain("javascript:");
  });

  it("allows safe HTML tags", () => {
    const input = "<p><strong>bold</strong> and <em>italic</em></p>";
    const result = sanitizeHTML(input);
    expect(result).toContain("<strong>");
    expect(result).toContain("<em>");
  });

  it("preserves text content", () => {
    const input = "Hello world, this is plain text.";
    const result = sanitizeHTML(input);
    expect(result).toBe("Hello world, this is plain text.");
  });
});
