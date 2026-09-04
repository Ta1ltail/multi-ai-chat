/**
 * HTML escaping — single source of truth for the renderer pipeline
 * (markdown.ts + highlight.ts both used to define their own copies).
 */

/** Escape text for safe inclusion in HTML text nodes. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Escape text for safe inclusion in HTML attribute values. */
export function escapeAttr(text: string): string {
  return escapeHtml(text);
}
