# PROJECT_AUDIT.md

**Project:** multi-ai-chat v0.3.0
**Date:** 2026-08-29 (updated)
**Stack:** Next.js 15, React 19, Tailwind 4, TypeScript 5 (strict), Vitest

---

## Architecture

```
User → page.tsx (useChat + useTheme)
  → POST /api/chat (route.ts)
    → model === "auto" → router.ts → selectBestModel()
    → model === specific → models.ts → getModelById()
    → provider.createStream() → groq.ts | openrouter.ts
    → Returns ReadableStream (SSE)
  → sse.ts → readSSEStream()
  → use-chat.ts → setConversations() → streaming text appears
  → message.tsx → renderMarkdown() → sanitizeHTML() → dangerouslySetInnerHTML
  → Conversations → localStorage (throttled save, 3s max-wait)
```

## File Structure

```
src/
  types/index.ts              — MessageData, Conversation, ToastState
  app/
    api/chat/route.ts         — Streaming chat endpoint (validated, model-checked)
    error.tsx                 — Error boundary
    loading.tsx               — Loading skeleton
    global.css                — Theme variables, animations, syntax highlighting
    layout.tsx                — Root layout (fonts, theme flash prevention)
    page.tsx                  — Main chat page
  components/
    app-shell.tsx             — Sidebar + content layout (mobile overlay with Escape)
    button.tsx                — Reusable button primitive (primary/secondary)
    chat-input.tsx            — Auto-resizing textarea + send/stop button + IME guard
    message.tsx               — Memoized message bubble (markdown + copy)
    message-list.tsx          — Scrollable container (role="log", smart auto-scroll)
    model-selector.tsx        — Model/provider dropdown (aria-hidden emoji)
    sidebar.tsx               — Navigation (aria-current, focus-visible delete, nav)
    toast.tsx                 — Toast notification (role="alert", stacked container)
  lib/
    use-chat.ts               — Chat state hook (abort, history windowing, rAF batching)
    sanitize.ts               — DOMPurify HTML sanitizer
    conversations.ts          — localStorage persistence (versioned, validated, capped)
    use-theme.ts              — Theme hook (try/catch storage, side-effect-free toggle)
    highlight.ts              — Regex-based syntax highlighter
    markdown.ts               — Sentinel-based markdown renderer
    sse.ts                    — SSE stream reader (flush, CRLF-safe, error propagation)
    ai/
      index.ts                — Server-only barrel (import "server-only")
      models.ts               — Client-safe model metadata + lookup functions
      router.ts               — Auto-routing (priority-based model selection)
      providers/
        types.ts              — AIProvider, ModelConfig, StreamOptions (+ signal)
        index.ts              — Provider registry
        groq.ts               — Groq provider (abort signal polling)
        openrouter.ts         — OpenRouter provider (AbortSignal.any + 60s timeout)
  lib/__tests__/
    conversations.test.ts     — 9 tests (versioned format, legacy, validation)
    highlight.test.ts         — 12 tests
    markdown.test.ts          — 25 tests (code-block sentinels, URL escaping)
    router.test.ts            — 11 tests
    sanitize.test.ts          — 5 tests (mocked DOMPurify)
    sanitize-integration.test.ts — 17 tests (real DOMPurify in jsdom)
    sse.test.ts               — 8 tests
```

## What Was Fixed (Phases 1-7)

### Phase 1 — Critical Bugs
| ID | Issue | Fix |
|----|-------|-----|
| C-1 | SSE errors silently swallowed | Separated JSON.parse from error throw in `sse.ts` |
| C-4 | Nothing persists mid-stream | Added 3s max-wait throttle + `pagehide`/`visibilitychange` flush |
| C-3 | Mobile sidebar unusable | `relative z-30` on wrapper + default-closed on mobile |
| H-1 | isLoading race on overlapping sends | `abortRef.current === controller` guard in `finally` |
| M-2 | No localStorage schema validation | Per-item validation, versioned format, legacy support |

### Phase 2 — Security
| ID | Issue | Fix |
|----|-------|-----|
| C-2 | Unvalidated model passthrough | `getModelById()` validates server-side; provider from registry |
| H-4 | No request schema validation | Role/content validation, 100-msg cap, 128KB cap, JSON → 400 |
| M-1 | No URL escaping in links | `escapeAttr()` + `safeUrl()` — only http/https/mailto/# allowed |
| M-8 | No message length limits | Client `maxLength={16000}`, server 100 msgs + 128KB cap |
| M-1 | DOMPurify tests mock the mock | 17 integration tests with real DOMPurify in jsdom |
| L-20 | Route nits | `X-Accel-Buffering: no`, error class mapping (400/502/503) |

### Phase 3 — Functional Bugs
| ID | Issue | Fix |
|----|-------|-----|
| H-2+M-7 | Markdown code-block corruption | Sentinel-based extraction before inline passes |
| H-7 | Hydration mismatch on model selector | Init with `AUTO_MODEL_ID`, read in mount `useEffect` |
| H-6+M-17 | Keyboard delete invisible/broken | `focus-visible:opacity-100`, focus management, Escape/outside-click |
| M-13 | IME composition sends early | `isComposing` + `keyCode === 229` guard |
| M-14 | Focus loss on disabled textarea | Removed `disabled` from textarea (only send button) |
| M-9+M-10 | Toast stacking + a11y | `flex-col gap-2` container, `role="alert"`, `aria-label` |
| M-16 | Error/loading not centered | `h-dvh` on root divs |
| M-15 | Theme hook crashes in Safari private | try/catch on all localStorage, side-effect-free toggle |

### Phase 4 — Reliability
| ID | Issue | Fix |
|----|-------|-----|
| H-5 | No abort-signal propagation | `signal` in StreamOptions, route passes `req.signal`, 60s timeout |
| M-5 | Streams never aborted on new/delete/unmount | Abort in handlers + unmount cleanup |
| M-6 | Aborted partial messages leak | Filter empty/Error: messages from API payload |
| M-21 | Failed responses fed back | Error: messages filtered from API payload |
| M-3 | Quota-exceeded diverges state | `SaveResult` with reconciliation on partial save |
| M-20 | No maxDuration | `export const maxDuration = 60` |

### Phase 5 — Performance
| ID | Issue | Fix |
|----|-------|-----|
| H-3 | Every token re-renders all messages | `React.memo` on Message + rAF token batching |
| M-26 | Unbounded history → context-length failures | History windowing (80% of contextLength, ~4 chars/token) |
| L-7 | No per-conversation message limit | `MAX_MESSAGES_PER_CONVERSATION = 500` |

### Phase 6 — UI/UX
| ID | Issue | Fix |
|----|-------|-----|
| M-11 | Screen-reader token spam | `role="log"` + separate `role="status"` for loading |
| M-24 | Light-mode contrast failures | Darkened `--foreground-tertiary` (#5a6270) and `--focus-ring` (#1d4ed8) |
| M-25 | Overlay broken semantics | Real `<button>` + document-level Escape |
| L-21 | No stop-generating UI | `handleStop` exposed, stop icon (■) while loading |
| L-11 | Copy button lacks accessible name | `aria-label`, always show message copy |
| L-9 | No color-scheme | `color-scheme: light`/`dark` declarations |
| L-14 | Minor a11y nits | `aria-current`, `<nav>`, `aria-hidden` on emoji |

### Phase 7 — Code Quality
| ID | Issue | Fix |
|----|-------|-----|
| M-23 | Client bundle imports server AI layer | `models.ts` (client-safe) + `import "server-only"` on barrel |
| L-17 | Provider duplication | Shared `models.ts` for both providers |
| L-13 | Dead code | Removed unused `sm` button variant |
| L-1 | Weak ID generation | `crypto.randomUUID()` |
| L-3 | SSE buffer not flushed / CRLF | Post-loop flush + `split(/\r?\n/)` |
| L-5 | Toast discards error message | Surface `e.message` in toast |
| L-16 | `.env.example` gitignored | `!.env.example` in `.gitignore` |

### Cleanup
- Removed all `.md` documentation files (docs/, AGENTS.md, README.md, PROJECT_AUDIT.md original)
- Trimmed verbose comments across all source files
- Removed redundant type exports (`MessageRole`)
- Removed duplicate functions (`getModelById`/`getDefaultModel` in providers/index.ts)
- Simplified `Button` component (removed unused `sm` size)
- Inlined `generateId` → `crypto.randomUUID()`

## What Is Correct (Do NOT Change)

- API key isolation (server-side only, no `NEXT_PUBLIC_` vars)
- Single AI choke point (`/api/chat`)
- DOMPurify strict allowlist at `dangerouslySetInnerHTML`
- Theme flash prevention (inline `<head>` script)
- Position-based syntax highlighter (escapes every segment exactly once)
- Auto-scroll with `shouldAutoScroll` ref + 150px threshold
- `loaded` gate prevents pre-hydration wipe
- User messages as plain text (no markdown pipeline)
- Code-copy via event delegation
- `prefers-reduced-motion` global override

## Test Coverage

| File | Tests | Notes |
|------|-------|-------|
| `conversations.test.ts` | 9 | Versioned format, legacy, validation, quota |
| `highlight.test.ts` | 12 | Escaping, aliases, unknown lang |
| `markdown.test.ts` | 25 | Sentinels, URL escaping, scheme validation |
| `router.test.ts` | 11 | Provider detection, model selection |
| `sanitize.test.ts` | 5 | Mocked DOMPurify |
| `sanitize-integration.test.ts` | 17 | Real DOMPurify in jsdom |
| `sse.test.ts` | 8 | Events, errors, DONE, malformed JSON, chunking |
| **Total** | **87** | |

## Remaining Items

### Low Priority
- `L-4`: Copy-indicator timers not cleaned up on unmount
- `L-10`: rAF not cancelled on unmount in chat-input
- `L-15`: No virtualization for long conversations (defer until needed)
- `L-17`: Provider layer could extract shared `apiMessages` builder
- `L-19`: Client default provider hardcodes `"groq"` for unknown models

### Medium Priority (Phase 8 roadmap)
- Provider fallback chain (M-22)
- Authentication + database (Phase 8)
- Error monitoring (Sentry etc.)

---

_Audit complete. 59 original findings resolved across 7 phases. 87 tests passing. All checks green._
