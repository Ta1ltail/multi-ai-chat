interface LanguageDef {
  name: string;
  patterns: Array<{ regex: RegExp; className: string }>;
}

const languages: Record<string, LanguageDef> = {
  javascript: {
    name: "JavaScript",
    patterns: [
      { regex: /(\/\/.*$)/gm, className: "hljs-comment" },
      { regex: /(\/\*[\s\S]*?\*\/)/g, className: "hljs-comment" },
      { regex: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, className: "hljs-string" },
      { regex: /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|this|class|extends|import|export|from|default|async|await|try|catch|finally|throw|typeof|instanceof|in|of|void|delete|null|undefined|true|false)\b/g, className: "hljs-keyword" },
      { regex: /\b(\d+\.?\d*)\b/g, className: "hljs-number" },
      { regex: /\b([A-Z][a-zA-Z0-9]*)\b/g, className: "hljs-type" },
      { regex: /(=>)/g, className: "hljs-arrow" },
      { regex: /(\.\.\.)/g, className: "hljs-operator" },
    ],
  },
  typescript: {
    name: "TypeScript",
    patterns: [
      { regex: /(\/\/.*$)/gm, className: "hljs-comment" },
      { regex: /(\/\*[\s\S]*?\*\/)/g, className: "hljs-comment" },
      { regex: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, className: "hljs-string" },
      { regex: /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|this|class|extends|import|export|from|default|async|await|try|catch|finally|throw|typeof|instanceof|in|of|void|delete|null|undefined|true|false|interface|type|enum|implements|abstract|readonly|private|protected|public|static|as|is|keyof|never|unknown|any|string|number|boolean|object|symbol|bigint)\b/g, className: "hljs-keyword" },
      { regex: /\b(\d+\.?\d*)\b/g, className: "hljs-number" },
      { regex: /\b([A-Z][a-zA-Z0-9]*)\b/g, className: "hljs-type" },
      { regex: /(=>)/g, className: "hljs-arrow" },
      { regex: /(\.\.\.)/g, className: "hljs-operator" },
    ],
  },
  python: {
    name: "Python",
    patterns: [
      { regex: /(#.*$)/gm, className: "hljs-comment" },
      { regex: /("""[\s\S]*?"""|'''[\s\S]*?''')/g, className: "hljs-string" },
      { regex: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, className: "hljs-string" },
      { regex: /\b(def|class|return|if|elif|else|for|while|break|continue|import|from|as|try|except|finally|raise|with|yield|lambda|pass|True|False|None|and|or|not|in|is|global|nonlocal|assert|del|print)\b/g, className: "hljs-keyword" },
      { regex: /\b(\d+\.?\d*)\b/g, className: "hljs-number" },
      { regex: /\b(self|cls)\b/g, className: "hljs-variable" },
      { regex: /(@\w+)/g, className: "hljs-decorator" },
      { regex: /\b([A-Z][a-zA-Z0-9]*)\b/g, className: "hljs-type" },
    ],
  },
  html: {
    name: "HTML",
    patterns: [
      { regex: /(<!--[\s\S]*?-->)/g, className: "hljs-comment" },
      { regex: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, className: "hljs-string" },
      { regex: /(<(\/)?)([\w-]+)/g, className: "hljs-tag" },
      { regex: /\b([a-zA-Z-]+)(?==)/g, className: "hljs-attribute" },
    ],
  },
  css: {
    name: "CSS",
    patterns: [
      { regex: /(\/\*[\s\S]*?\*\/)/g, className: "hljs-comment" },
      { regex: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, className: "hljs-string" },
      { regex: /(#[0-9a-fA-F]{3,8})\b/g, className: "hljs-number" },
      { regex: /\b(\d+\.?\d*(?:px|em|rem|%|vh|vw|s|ms)?)\b/g, className: "hljs-number" },
      { regex: /([\w-]+)(?=\s*:)/g, className: "hljs-attribute" },
      { regex: /([.#][\w-]+)/g, className: "hljs-keyword" },
    ],
  },
  json: {
    name: "JSON",
    patterns: [
      { regex: /("(?:[^"\\]|\\.)*")(?=\s*:)/g, className: "hljs-key" },
      { regex: /:\s*("(?:[^"\\]|\\.)*")/g, className: "hljs-string" },
      { regex: /\b(true|false|null)\b/g, className: "hljs-keyword" },
      { regex: /\b(-?\d+\.?\d*([eE][+-]?\d+)?)\b/g, className: "hljs-number" },
    ],
  },
  bash: {
    name: "Bash",
    patterns: [
      { regex: /(#.*$)/gm, className: "hljs-comment" },
      { regex: /("(?:[^"\\]|\\.)*"|'[^']*')/g, className: "hljs-string" },
      { regex: /\b(if|then|else|elif|fi|for|while|do|done|case|esac|function|return|exit|echo|cd|ls|mkdir|rm|cp|mv|grep|sed|awk|cat|chmod|chown|sudo|npm|npx|git|docker|yarn|pnpm|bun)\b/g, className: "hljs-keyword" },
      { regex: /(\$[\w]+)/g, className: "hljs-variable" },
      { regex: /\b(\d+)\b/g, className: "hljs-number" },
    ],
  },
  plaintext: { name: "Plain Text", patterns: [] },
};

const aliases: Record<string, string> = {
  js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
  py: "python", sh: "bash", shell: "bash", zsh: "bash", dockerfile: "bash",
};

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

interface HighlightMatch { start: number; end: number; className: string; priority: number; }

function highlightCode(code: string, lang: string): string {
  const langKey = aliases[lang.toLowerCase().trim()] ?? lang.toLowerCase().trim();
  const language = languages[langKey] ?? languages.plaintext;
  if (language.patterns.length === 0) return escapeHtml(code);

  const matches: HighlightMatch[] = [];
  language.patterns.forEach((pattern, priority) => {
    const flags = pattern.regex.flags.includes("g") ? pattern.regex.flags : `${pattern.regex.flags}g`;
    const regex = new RegExp(pattern.regex.source, flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(code)) !== null) {
      if (match[0].length === 0) { regex.lastIndex += 1; continue; }
      matches.push({ start: match.index, end: match.index + match[0].length, className: pattern.className, priority });
    }
  });

  matches.sort((a, b) => a.start - b.start || a.priority - b.priority);
  const resolved: HighlightMatch[] = [];
  let lastEnd = 0;
  for (const match of matches) {
    if (match.start < lastEnd) continue;
    resolved.push(match);
    lastEnd = match.end;
  }

  let result = "";
  let cursor = 0;
  for (const match of resolved) {
    result += escapeHtml(code.slice(cursor, match.start));
    result += `<span class="${match.className}">${escapeHtml(code.slice(match.start, match.end))}</span>`;
    cursor = match.end;
  }
  result += escapeHtml(code.slice(cursor));
  return result;
}

export function getHighlightedCode(code: string, lang: string): string {
  return highlightCode(code, lang);
}
