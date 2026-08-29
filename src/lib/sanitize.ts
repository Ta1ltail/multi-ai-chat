import DOMPurify from "dompurify";

const PURIFY_CONFIG = {
  ALLOWED_TAGS: ["p", "br", "strong", "em", "a", "ul", "ol", "li", "code", "pre", "span", "div", "button", "svg", "path", "rect"],
  ALLOWED_ATTR: ["class", "hidden", "href", "target", "rel", "title", "width", "height", "viewBox", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "d", "x", "y", "rx", "ry", "type"],
  ALLOW_DATA_ATTR: false,
};

export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, PURIFY_CONFIG);
}
