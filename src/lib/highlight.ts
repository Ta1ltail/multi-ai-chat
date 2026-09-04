/**
 * Lightweight, dependency-free syntax highlighter.
 *
 * Each language is a list of token patterns. Patterns are scanned in order and
 * the first match at any position wins (later entries only fill gaps), so
 * comments swallow `//` before strings, strings swallow keywords, etc.
 *
 * Token classes emitted (styled in global.css):
 *   hljs-comment hljs-keyword hljs-string hljs-number hljs-type hljs-function
 *   hljs-variable hljs-property hljs-attribute hljs-tag hljs-key hljs-decorator
 *   hljs-operator
 */

type TokenClass =
  | "hljs-comment"
  | "hljs-keyword"
  | "hljs-string"
  | "hljs-number"
  | "hljs-type"
  | "hljs-function"
  | "hljs-variable"
  | "hljs-property"
  | "hljs-attribute"
  | "hljs-tag"
  | "hljs-key"
  | "hljs-decorator"
  | "hljs-operator";

interface TokenPattern {
  regex: RegExp;
  className: TokenClass;
}

interface LanguageDef {
  name: string;
  patterns: TokenPattern[];
}

/* ─── Pattern builders ─────────────────────────────────────────── */

/** Keywords — single `\b...\b` pattern. */
function kw(words: string[]): TokenPattern {
  const sorted = [...words].sort((a, b) => b.length - a.length);
  return { regex: new RegExp(`\\b(?:${sorted.join("|")})\\b`, "g"), className: "hljs-keyword" };
}

function stringPatterns(quotes: Array<string | { open: string; close: string }>): TokenPattern {
  const parts = quotes.map((q) => {
    if (typeof q === "string") return `${q}(?:[^\\\\${q}]|\\\\.)*${q}`;
    return `${q.open}[\\s\\S]*?${q.close}`;
  });
  return { regex: new RegExp(parts.join("|"), "g"), className: "hljs-string" };
}

function numbers(): TokenPattern {
  return {
    regex: /\b(?:0x[0-9a-fA-F_]+|0b[01_]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g,
    className: "hljs-number",
  };
}

/** Uppercase identifiers → class/type names. */
function upperTypes(): TokenPattern {
  return { regex: /\b[A-Z][A-Za-z0-9_]*\b/g, className: "hljs-type" };
}

/** Identifier directly followed by `(` → function calls. */
function calls(): TokenPattern {
  return { regex: /\b([A-Za-z_$][\w$]*)(?=\s*\()/g, className: "hljs-function" };
}

/** `identifier:` in object-ish contexts → keys/properties. */
function colonKeys(): TokenPattern {
  return { regex: /\b([A-Za-z_$][\w$]*)(?=\s*:)/g, className: "hljs-property" };
}

const JS_TS_KEYWORDS = [
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "from",
  "function",
  "get",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "interface",
  "let",
  "new",
  "null",
  "of",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "set",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "undefined",
  "var",
  "void",
  "while",
  "with",
  "yield",
  // TypeScript-only
  "abstract",
  "any",
  "as",
  "asserts",
  "bigint",
  "boolean",
  "declare",
  "infer",
  "is",
  "keyof",
  "module",
  "namespace",
  "never",
  "object",
  "readonly",
  "require",
  "satisfies",
  "string",
  "symbol",
  "type",
  "unknown",
  "number",
];

const CSHARP_KEYWORDS = [
  "abstract",
  "as",
  "base",
  "bool",
  "break",
  "byte",
  "case",
  "catch",
  "char",
  "checked",
  "class",
  "const",
  "continue",
  "decimal",
  "default",
  "delegate",
  "do",
  "double",
  "else",
  "enum",
  "event",
  "explicit",
  "extern",
  "false",
  "finally",
  "fixed",
  "float",
  "for",
  "foreach",
  "get",
  "goto",
  "if",
  "implicit",
  "in",
  "int",
  "interface",
  "internal",
  "is",
  "lock",
  "long",
  "namespace",
  "new",
  "null",
  "object",
  "operator",
  "out",
  "override",
  "params",
  "private",
  "protected",
  "public",
  "readonly",
  "ref",
  "return",
  "sbyte",
  "sealed",
  "set",
  "short",
  "sizeof",
  "stackalloc",
  "static",
  "string",
  "struct",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "uint",
  "ulong",
  "unchecked",
  "unsafe",
  "ushort",
  "using",
  "var",
  "virtual",
  "void",
  "volatile",
  "while",
  "async",
  "await",
  "record",
  "init",
  "required",
  "null!",
  "var",
];

/* ─── Language table ──────────────────────────────────────────── */

const languages: Record<string, LanguageDef> = {
  javascript: {
    name: "JavaScript",
    patterns: [
      { regex: /(\/\/.*$)/gm, className: "hljs-comment" },
      { regex: /(\/\*[\s\S]*?\*\/)/g, className: "hljs-comment" },
      stringPatterns(['"', "'", "`"]),
      kw(JS_TS_KEYWORDS),
      numbers(),
      upperTypes(),
      calls(),
      colonKeys(),
      { regex: /(=>)/g, className: "hljs-operator" },
      { regex: /(\.\.\.|===|!==|==|!=|<=|>=|&&|\|\||\?\?|\+\+|--)/g, className: "hljs-operator" },
      { regex: /\b(true|false|null|undefined)\b/g, className: "hljs-keyword" },
    ],
  },
  typescript: {
    name: "TypeScript",
    patterns: [
      { regex: /(\/\/.*$)/gm, className: "hljs-comment" },
      { regex: /(\/\*[\s\S]*?\*\/)/g, className: "hljs-comment" },
      stringPatterns(['"', "'", "`"]),
      kw(JS_TS_KEYWORDS),
      numbers(),
      upperTypes(),
      calls(),
      colonKeys(),
      { regex: /(=>)/g, className: "hljs-operator" },
      { regex: /(\.\.\.|===|!==|==|!=|<=|>=|&&|\|\||\?\?|\+\+|--)/g, className: "hljs-operator" },
    ],
  },
  python: {
    name: "Python",
    patterns: [
      { regex: /(#.*$)/gm, className: "hljs-comment" },
      stringPatterns([{ open: '"""', close: '"""' }, { open: "'''", close: "'''" }, '"', "'"]),
      kw([
        "False",
        "None",
        "True",
        "and",
        "as",
        "assert",
        "async",
        "await",
        "break",
        "class",
        "continue",
        "def",
        "del",
        "elif",
        "else",
        "except",
        "finally",
        "for",
        "from",
        "global",
        "if",
        "import",
        "in",
        "is",
        "lambda",
        "nonlocal",
        "not",
        "or",
        "pass",
        "raise",
        "return",
        "try",
        "while",
        "with",
        "yield",
        "match",
        "case",
        "print",
      ]),
      numbers(),
      { regex: /(@[\w.]+)/g, className: "hljs-decorator" },
      // def/class name (single capture group → only the name is highlighted)
      { regex: /\b(?:def|class)\s+([A-Za-z_]\w*)/g, className: "hljs-function" },
      calls(),
      upperTypes(),
      { regex: /\b(self|cls)\b/g, className: "hljs-variable" },
    ],
  },
  html: {
    name: "HTML",
    patterns: [
      { regex: /(<!--[\s\S]*?-->)/g, className: "hljs-comment" },
      stringPatterns(['"', "'"]),
      // Tag names (opening/closing), then attributes before `=`
      { regex: /(<[!\/-]?[\w-]+)/g, className: "hljs-tag" },
      { regex: /\b([a-zA-Z-]+)(?=\s*=)/g, className: "hljs-attribute" },
      {
        regex: /\b(doctype|html|head|body|script|style|meta|link|title)\b/g,
        className: "hljs-tag",
      },
    ],
  },
  css: {
    name: "CSS",
    patterns: [
      { regex: /(\/\*[\s\S]*?\*\/)/g, className: "hljs-comment" },
      stringPatterns(['"', "'"]),
      { regex: /(#[0-9a-fA-F]{3,8})\b/g, className: "hljs-number" },
      {
        regex:
          /\b(\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|vmin|vmax|s|ms|deg|fr|ch|ex|pt|pc|cm|mm|in)?)\b/g,
        className: "hljs-number",
      },
      // Property name before `:`
      { regex: /([a-zA-Z-]+)(?=\s*:)/g, className: "hljs-property" },
      // Selectors
      { regex: /([.#][\w-]+)/g, className: "hljs-keyword" },
      // Pseudo classes / functions
      { regex: /(::?[\w-]+)/g, className: "hljs-type" },
      // at-rules
      { regex: /(@[\w-]+)/g, className: "hljs-decorator" },
    ],
  },
  json: {
    name: "JSON",
    patterns: [
      { regex: /("(?:[^"\\]|\\.)*")(?=\s*:)/g, className: "hljs-key" },
      { regex: /("(?:[^"\\]|\\.)*")/g, className: "hljs-string" },
      { regex: /\b(true|false|null)\b/g, className: "hljs-keyword" },
      numbers(),
    ],
  },
  bash: {
    name: "Bash",
    patterns: [
      { regex: /(#.*$)/gm, className: "hljs-comment" },
      stringPatterns(['"', "'"]),
      kw([
        "if",
        "then",
        "else",
        "elif",
        "fi",
        "for",
        "while",
        "until",
        "do",
        "done",
        "case",
        "esac",
        "function",
        "return",
        "exit",
        "export",
        "local",
        "readonly",
        "declare",
        "echo",
        "printf",
        "cd",
        "ls",
        "mkdir",
        "rm",
        "cp",
        "mv",
        "grep",
        "sed",
        "awk",
        "cat",
        "chmod",
        "chown",
        "sudo",
        "npm",
        "npx",
        "pnpm",
        "yarn",
        "bun",
        "git",
        "docker",
        "curl",
        "wget",
        "tar",
        "unzip",
        "zip",
        "pip",
        "python",
        "node",
        "source",
        "set",
        "shift",
        "alias",
        "test",
      ]),
      { regex: /(\$[\w]+|\$\{[\w]+\}|\$\([^)]*\))/g, className: "hljs-variable" },
      numbers(),
    ],
  },
  sql: {
    name: "SQL",
    patterns: [
      { regex: /(--.*$|#.*$)/gm, className: "hljs-comment" },
      { regex: /(\/\*[\s\S]*?\*\/)/g, className: "hljs-comment" },
      stringPatterns(['"', "'"]),
      kw([
        "SELECT",
        "FROM",
        "WHERE",
        "INSERT",
        "INTO",
        "VALUES",
        "UPDATE",
        "SET",
        "DELETE",
        "CREATE",
        "ALTER",
        "DROP",
        "TABLE",
        "DATABASE",
        "INDEX",
        "VIEW",
        "TRIGGER",
        "JOIN",
        "INNER",
        "LEFT",
        "RIGHT",
        "OUTER",
        "FULL",
        "CROSS",
        "ON",
        "AS",
        "AND",
        "OR",
        "NOT",
        "NULL",
        "IN",
        "EXISTS",
        "BETWEEN",
        "LIKE",
        "ORDER",
        "BY",
        "GROUP",
        "HAVING",
        "LIMIT",
        "OFFSET",
        "DISTINCT",
        "COUNT",
        "SUM",
        "AVG",
        "MIN",
        "MAX",
        "PRIMARY",
        "FOREIGN",
        "KEY",
        "UNIQUE",
        "CHECK",
        "DEFAULT",
        "CONSTRAINT",
        "UNION",
        "ALL",
        "CASE",
        "WHEN",
        "THEN",
        "ELSE",
        "END",
        "BEGIN",
        "COMMIT",
        "ROLLBACK",
        "GRANT",
        "REVOKE",
        "TRUNCATE",
        "ASC",
        "DESC",
        "WITH",
        "RECURSIVE",
        "INT",
        "VARCHAR",
        "TEXT",
        "BOOLEAN",
        "DATE",
        "TIMESTAMP",
        "DOUBLE",
        "FLOAT",
        "DECIMAL",
        "BIGINT",
      ]),
      numbers(),
    ],
  },
  php: {
    name: "PHP",
    patterns: [
      { regex: /(\/\/.*$|#.*$)/gm, className: "hljs-comment" },
      { regex: /(\/\*[\s\S]*?\*\/)/g, className: "hljs-comment" },
      stringPatterns(['"', "'"]),
      kw([
        "abstract",
        "and",
        "array",
        "as",
        "break",
        "callable",
        "case",
        "catch",
        "class",
        "clone",
        "const",
        "continue",
        "declare",
        "default",
        "do",
        "echo",
        "else",
        "elseif",
        "empty",
        "enddeclare",
        "endfor",
        "endforeach",
        "endif",
        "endswitch",
        "endwhile",
        "enum",
        "exit",
        "extends",
        "final",
        "finally",
        "fn",
        "for",
        "foreach",
        "function",
        "global",
        "goto",
        "if",
        "implements",
        "include",
        "include_once",
        "instanceof",
        "insteadof",
        "interface",
        "isset",
        "list",
        "match",
        "namespace",
        "new",
        "or",
        "print",
        "private",
        "protected",
        "public",
        "readonly",
        "require",
        "require_once",
        "return",
        "static",
        "switch",
        "throw",
        "trait",
        "try",
        "unset",
        "use",
        "var",
        "while",
        "xor",
        "yield",
        "true",
        "false",
        "null",
      ]),
      numbers(),
      upperTypes(),
      { regex: /(\$[\w]+)/g, className: "hljs-variable" },
      calls(),
      { regex: /(->|::)/g, className: "hljs-operator" },
    ],
  },
  java: {
    name: "Java",
    patterns: [
      { regex: /(\/\/.*$)/gm, className: "hljs-comment" },
      { regex: /(\/\*[\s\S]*?\*\/)/g, className: "hljs-comment" },
      stringPatterns(['"', "'"]),
      kw([
        "abstract",
        "assert",
        "boolean",
        "break",
        "byte",
        "case",
        "catch",
        "char",
        "class",
        "const",
        "continue",
        "default",
        "do",
        "double",
        "else",
        "enum",
        "extends",
        "final",
        "finally",
        "float",
        "for",
        "goto",
        "if",
        "implements",
        "import",
        "instanceof",
        "int",
        "interface",
        "long",
        "native",
        "new",
        "package",
        "private",
        "protected",
        "public",
        "return",
        "short",
        "static",
        "strictfp",
        "super",
        "switch",
        "synchronized",
        "this",
        "throw",
        "throws",
        "transient",
        "try",
        "void",
        "volatile",
        "while",
        "var",
        "record",
        "true",
        "false",
        "null",
      ]),
      numbers(),
      upperTypes(),
      { regex: /(@[\w.]+)/g, className: "hljs-decorator" },
      calls(),
    ],
  },
  c: {
    name: "C",
    patterns: [
      { regex: /(\/\/.*$)/gm, className: "hljs-comment" },
      { regex: /(\/\*[\s\S]*?\*\/)/g, className: "hljs-comment" },
      stringPatterns(['"', "'"]),
      kw([
        "auto",
        "break",
        "case",
        "char",
        "const",
        "continue",
        "default",
        "do",
        "double",
        "else",
        "enum",
        "extern",
        "float",
        "for",
        "goto",
        "if",
        "inline",
        "int",
        "long",
        "register",
        "restrict",
        "return",
        "short",
        "signed",
        "sizeof",
        "static",
        "struct",
        "switch",
        "typedef",
        "union",
        "unsigned",
        "void",
        "volatile",
        "while",
        "true",
        "false",
        "NULL",
        "include",
        "define",
        "ifdef",
        "ifndef",
        "endif",
      ]),
      numbers(),
      upperTypes(),
      calls(),
    ],
  },
  cpp: {
    name: "C++",
    patterns: [
      { regex: /(\/\/.*$)/gm, className: "hljs-comment" },
      { regex: /(\/\*[\s\S]*?\*\/)/g, className: "hljs-comment" },
      stringPatterns(['"', "'"]),
      kw([
        "alignas",
        "alignof",
        "and",
        "asm",
        "auto",
        "bitand",
        "bitor",
        "bool",
        "break",
        "case",
        "catch",
        "char",
        "char8_t",
        "char16_t",
        "char32_t",
        "class",
        "compl",
        "concept",
        "const",
        "consteval",
        "constexpr",
        "constinit",
        "const_cast",
        "continue",
        "co_await",
        "co_return",
        "co_yield",
        "decltype",
        "default",
        "delete",
        "do",
        "double",
        "dynamic_cast",
        "else",
        "enum",
        "explicit",
        "export",
        "extern",
        "false",
        "float",
        "for",
        "friend",
        "goto",
        "if",
        "inline",
        "int",
        "long",
        "mutable",
        "namespace",
        "new",
        "noexcept",
        "not",
        "nullptr",
        "operator",
        "or",
        "private",
        "protected",
        "public",
        "register",
        "reinterpret_cast",
        "requires",
        "return",
        "short",
        "signed",
        "sizeof",
        "static",
        "static_assert",
        "static_cast",
        "struct",
        "switch",
        "template",
        "this",
        "thread_local",
        "throw",
        "true",
        "try",
        "typedef",
        "typeid",
        "typename",
        "union",
        "unsigned",
        "using",
        "virtual",
        "void",
        "volatile",
        "wchar_t",
        "while",
        "xor",
        "include",
        "define",
        "ifdef",
        "ifndef",
        "endif",
      ]),
      numbers(),
      upperTypes(),
      calls(),
    ],
  },
  csharp: {
    name: "C#",
    patterns: [
      { regex: /(\/\/.*$)/gm, className: "hljs-comment" },
      { regex: /(\/\*[\s\S]*?\*\/)/g, className: "hljs-comment" },
      stringPatterns(['"', "'"]),
      kw(CSHARP_KEYWORDS),
      numbers(),
      upperTypes(),
      calls(),
      { regex: /(#[\w]+)/g, className: "hljs-decorator" },
    ],
  },
  go: {
    name: "Go",
    patterns: [
      { regex: /(\/\/.*$)/gm, className: "hljs-comment" },
      { regex: /(\/\*[\s\S]*?\*\/)/g, className: "hljs-comment" },
      stringPatterns(['"', "`", "'"]),
      kw([
        "break",
        "case",
        "chan",
        "const",
        "continue",
        "default",
        "defer",
        "else",
        "fallthrough",
        "for",
        "func",
        "go",
        "goto",
        "if",
        "import",
        "interface",
        "map",
        "package",
        "range",
        "return",
        "select",
        "struct",
        "switch",
        "type",
        "var",
        "true",
        "false",
        "iota",
        "nil",
        "append",
        "len",
        "cap",
        "make",
        "new",
      ]),
      numbers(),
      upperTypes(),
      calls(),
    ],
  },
  rust: {
    name: "Rust",
    patterns: [
      { regex: /(\/\/.*$)/gm, className: "hljs-comment" },
      { regex: /(\/\*[\s\S]*?\*\/)/g, className: "hljs-comment" },
      stringPatterns(['"', "'"]),
      kw([
        "as",
        "async",
        "await",
        "break",
        "const",
        "continue",
        "crate",
        "dyn",
        "else",
        "enum",
        "extern",
        "false",
        "fn",
        "for",
        "if",
        "impl",
        "in",
        "let",
        "loop",
        "match",
        "mod",
        "move",
        "mut",
        "pub",
        "ref",
        "return",
        "self",
        "Self",
        "static",
        "struct",
        "super",
        "trait",
        "true",
        "type",
        "unsafe",
        "use",
        "where",
        "while",
        "macro_rules",
        "async",
        "box",
      ]),
      numbers(),
      upperTypes(),
      { regex: /(#!?\[[\s\S]*?\])/g, className: "hljs-decorator" },
      calls(),
    ],
  },
  yaml: {
    name: "YAML",
    patterns: [
      { regex: /(#.*$)/gm, className: "hljs-comment" },
      stringPatterns(['"', "'"]),
      { regex: /^\s*([\w.-]+)(?=\s*:)/gm, className: "hljs-key" },
      { regex: /\b(true|false|null|yes|no|on|off|~)\b/g, className: "hljs-keyword" },
      numbers(),
    ],
  },
  plaintext: { name: "Plain Text", patterns: [] },
};

import { escapeHtml } from "./escape";

const aliases: Record<string, string> = {
  // JS / TS family
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  // Python
  py: "python",
  py3: "python",
  python3: "python",
  // Web
  htm: "html",
  xml: "html",
  svg: "html",
  scss: "css",
  less: "css",
  stylus: "css",
  // Shell
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  bashrc: "bash",
  dockerfile: "bash",
  // Others
  sqlite: "sql",
  mysql: "sql",
  postgresql: "sql",
  pgsql: "sql",
  cs: "csharp",
  "c#": "csharp",
  "c++": "cpp",
  cc: "cpp",
  hpp: "cpp",
  cxx: "cpp",
  yml: "yaml",
  txt: "plaintext",
  text: "plaintext",
  none: "plaintext",
};

/** Normalize a fence language tag (case-insensitive, trimmed, alias-resolved). */
function resolveLanguage(lang: string): LanguageDef {
  const key = lang.toLowerCase().trim().split(/\s+/)[0] || "plaintext";
  return languages[aliases[key] ?? key] ?? languages.plaintext;
}

interface HighlightMatch {
  start: number;
  end: number;
  className: TokenClass;
  priority: number;
}

function highlightCode(code: string, lang: string): string {
  const language = resolveLanguage(lang);
  if (language.patterns.length === 0) return escapeHtml(code);

  const matches: HighlightMatch[] = [];
  language.patterns.forEach((pattern, priority) => {
    // Patterns are shared module state — clone with the `g` flag each scan so
    // lastIndex never leaks between calls.
    const flags = pattern.regex.flags.includes("g")
      ? pattern.regex.flags
      : `${pattern.regex.flags}g`;
    const regex = new RegExp(pattern.regex.source, flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(code)) !== null) {
      if (match[0].length === 0) {
        regex.lastIndex += 1;
        continue;
      }
      // Patterns with exactly one group that differs from the full match only
      // highlight that subgroup (e.g. `def name` → just `name`); everything
      // else uses the full match.
      const hasSubgroup = match.length === 2 && match[1] !== undefined && match[1] !== match[0];
      const start = hasSubgroup ? match.index + match[0].indexOf(match[1]) : match.index;
      const end = hasSubgroup ? start + match[1].length : match.index + match[0].length;
      matches.push({ start, end, className: pattern.className, priority });
    }
  });

  // Earliest match wins; on ties the earlier-defined pattern (lower priority) wins.
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

/**
 * Human label for a fence's language tag: pretty name for known languages
 * ("TypeScript", "C#"), otherwise the raw tag itself ("code" when absent).
 */
export function getLanguageLabel(lang: string): string {
  const key = lang.toLowerCase().trim().split(/\s+/)[0] || "";
  if (languages[key]) return languages[key].name;
  if (aliases[key] && languages[aliases[key]]) return languages[aliases[key]].name;
  if (lang.trim() === "") return "code";
  return lang.trim();
}
