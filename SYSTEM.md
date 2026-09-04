# SYSTEM.md — Multi AI Chat

> System-level documentation for the **current** implementation (v0.4.1).
> Everything below was verified against the actual codebase at the time of writing.
> Sections marked **N/A** describe systems that do **not** exist in this application —
> they are listed so it is clear they were audited, not omitted.

---

## 1. Project Overview

Multi AI Chat is a single-page AI chat application that talks to multiple AI
providers — Groq and OpenRouter — through **one** server-side route
(`POST /api/chat`). It is intentionally **single-user and local-first**:
there is no database, no authentication, and no synchronization. All state
persists in `localStorage` on the user's own browser.

## 2. System Purpose

- Provide one chat interface across several free-tier models from two providers.
- Let the user pick a specific model, or use **Auto** mode, which picks the
  highest-priority available model server-side (the client never knows which
  API keys are configured).
- If the chosen provider fails, transparently fall back to the next-best
  available model instead of showing an error.

## 3. Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) |
| UI | React 19, TypeScript 5 (strict) |
| Styling | Tailwind CSS 4 (CSS-first `@theme` in `global.css`) |
| Markdown safety | DOMPurify 3 (strict allowlist) |
| AI SDKs | `groq-sdk` (Groq), raw `fetch` (OpenRouter) |
| Tests | Vitest 4 + jsdom |
| Lint/format | ESLint (next/core-web-vitals, typescript, prettier), Prettier + `prettier-plugin-tailwindcss` |

## 4. Architecture Overview

```
User → page.tsx (useChat + useTheme hooks)
  → POST /api/chat (route.ts)                     ← single choke point, server-only keys
    → model "auto"      → router.selectBestModel() (priority, then context length)
    → model "<id>"      → models.getModelById()   (server-validated)
    → buildFallbackCandidates() → ordered chain   (preferred first, rest by priority)
    → createStreamWithFallback()                  (eager first candidate, lazy rest)
      → provider.createStream() → groq.ts | openrouter.ts → ProviderEvent stream
      → switch candidate only if failure happens BEFORE any content is emitted
    → toSSEStream()                               (SSE wire format applied once, at the boundary)
  → sse.readSSEStream()                           (chunk-safe, CRLF-safe, malformed-JSON tolerant)
  → use-chat.ts → rAF-batched setConversations    (max ~1 state write per frame)
  → message.tsx → renderMarkdown() → sanitizeHTML() → dangerouslySetInnerHTML
  → conversations.ts → localStorage              (versioned, validated, capped, throttled)
```

**Core invariants**

- API keys exist **only** server-side (no `NEXT_PUBLIC_*` variables).
- The AI layer is server-only (`import "server-only"`); the client imports only
  model metadata (`models.ts`), which contains no secrets.
- Providers emit structured `ProviderEvent`s (`text`/`done`/`error`); the SSE
  byte format is applied exactly once at the route boundary (`toSSEStream`).
- All model output is rendered through Markdown → escaping → DOMPurify
  allowlist. The sanitizer is the final safety net, never skipped.

## 5. Folder / Directory Architecture

```
src/
  types/index.ts        — Shared domain types (MessageData, Conversation, ToastState)
  app/
    api/chat/route.ts   — Streaming chat endpoint (validation, routing, fallback, SSE)
    layout.tsx          — Root layout (fonts, theme flash-prevention script)
    page.tsx            — Chat page: shell, states (loading/empty/conversation), composer
    error.tsx           — Error boundary
    loading.tsx         — Initial route loading state
    global.css          — Design tokens (light/dark), prose rhythm, code-block chrome,
                          syntax-highlight token colors, scrollbars, animations
  hooks/
    use-chat.ts         — Chat state: conversations CRUD, streaming, abort, save throttle
    use-theme.ts        — Theme state: stored/system preference, side-effect-free toggle
  components/
    app-shell.tsx       — App frame: sidebar (mobile drawer / desktop collapsible rail),
                          top bar (model selector, theme toggle), main column
    brand-mark.tsx      — Brand logo mark, reused in sidebar, selector, empty state
    chat-input.tsx      — Overlay composer: self-contained space, internal scroll,
                          send/stop, IME guard, height reporting
    message.tsx         — Memoized message bubble; markdown render + copy handling
    message-list.tsx    — Scroll container (role="log", smart auto-scroll, bottomPad)
    model-selector.tsx  — Provider/model dropdown (grouped, Auto option)
    sidebar.tsx         — Conversation list, New chat, delete confirm, footer
    toast.tsx           — Transient notifications (role="alert")
  lib/
    escape.ts           — Shared HTML/attribute escaping (single source of truth)
    sanitize.ts         — DOMPurify configuration (strict allowlist)
    conversations.ts    — localStorage persistence (versioned, validated, capped, quota-safe)
    markdown.ts         — Block-level Markdown renderer (headings, tables, blockquotes,
                          lists, hr, code fences, inline formatting)
    highlight.ts        — Dependency-free syntax highlighter (15+ languages, token classes)
    sse.ts              — SSE client reader (buffering, CRLF, error propagation, flush)
    ai/
      index.ts          — Server-only barrel + SYSTEM_PROMPT
      models.ts         — Client-safe model metadata (ids, priorities, context lengths)
      router.ts         — Available-provider detection, best-model selection,
                          fallback-candidate ordering
      fallback.ts       — Provider fallback chain (eager/lazy start, pre-content switch)
      providers/
        types.ts        — AIProvider, ModelConfig, ProviderEvent, StreamOptions
        index.ts        — Provider registry (id → provider) + shared exports
        shared.ts       — buildApiMessages + toSSEStream (SSE wire format)
        groq.ts         — Groq provider (abort-polling, SDK streaming)
        openrouter.ts   — OpenRouter provider (fetch + AbortSignal.any timeout)
  lib/__tests__/        — 9 Vitest suites (133 tests)
```

## 6. Feature Architecture

The application has a single feature: **chat**. Sub-concerns (model selection,
conversation history, markdown rendering, provider routing) are separated by
layer rather than by feature folder — `components/` (UI), `hooks/` (client
state), `lib/` (rendering/persistence), `lib/ai/` (provider integration).
This is the simplest structure that gives clear ownership at the project's
current size; a feature-folder split would add indirection without benefit.

## 7. Component Architecture

| Component | Responsibility |
|---|---|
| `app-shell` | Layout frame; owns sidebar open/close (mobile drawer + desktop rail), top bar |
| `brand-mark` | Reusable brand mark (gradient sparkle) |
| `chat-input` | Composer: overlay positioned, measures its own height, scrolls internally past a viewport-aware cap; send/stop buttons |
| `message` | Renders one message. Assistant: `renderMarkdown` → `sanitizeHTML` → `dangerouslySetInnerHTML`, one "Copy response" button at the end, code-block copy via **event delegation**. `React.memo` prevents re-render when sibling messages stream |
| `message-list` | Scroll container; `role="log"`, `shouldAutoScroll` with 150px threshold, initial scroll without animation, configurable bottom padding (reserves room for the overlay composer) |
| `model-selector` | Dropdown grouped by provider + Auto option; closes on outside click/Escape |
| `sidebar` | Conversation list (active state, hover delete with inline confirm), New chat, footer |
| `toast` | Auto-dismissing notification (4s), fade-out |

UI copy behavior (deliberate, verified): one copy button per code block in its
header, plus exactly one "Copy response" per assistant message at its end.

## 8. State Management

No global store library. State is local to `page.tsx` + hooks:

- **`useChat`** — the single source of truth is the `conversations` array.
  `messages`, `activeId`, `isLoading`, `loaded` are derived/co-located state.
- **`useTheme`** — `theme` state + side-effectful application of the `.dark`
  class; system-preference listener only applies when no stored theme exists.
- **`page.tsx`** — toasts (transient), `selectedModel` (persisted to
  `localStorage["selectedModel"]`), `composerHeight` (reported by the composer
  for chat bottom-padding).

There is exactly one writer to `localStorage["conversations"]`
(`saveConversations`, throttled from `useChat`), so no competing sources of
truth exist.

## 9. Hooks Architecture

- **`use-chat.ts`** — owns all chat logic:
  - conversation CRUD (new/select/delete/send/stop);
  - abort controller guards (`abortRef.current === controller`) against
    overlapping sends;
  - history windowing (≈80% of model context length, ~4 chars/token);
  - rAF-batched streaming updates (one state write per frame);
  - throttled persistence (500ms debounce, 3s max wait, flush on
    `pagehide`/`visibilitychange`);
  - "Error: " message prefixing and empty-assistant cleanup after each turn;
  - filters empty/error assistant messages from the API payload.
- **`use-theme.ts`** — stored theme wins; otherwise system preference; media
  query listener only while no stored theme; try/catch around all storage
  (Safari private mode).

Both live in `src/hooks/` (moved out of `lib/` so `lib/` holds only pure
logic + server AI code).

## 10. Services / Lib / Utils Responsibilities

- **`lib/ai/**`** — server-only **service layer**: provider integration,
  routing, fallback. This is infrastructure code and lives together.
- **`lib/`** — shared logic: escaping, sanitizing, markdown/highlight
  rendering, SSE reading, localStorage persistence.
- There is no generic `utils/` dumping ground; each helper sits next to its
  consumer (e.g. `escape.ts` is used by both renderers; `safeUrl` lives in
  `markdown.ts`).

## 11. Authentication

**N/A** — no accounts, logins, sessions, or user identities. The app is
single-user by design.

## 12. Database Architecture

**N/A** — no database. The only persistence is browser `localStorage`.

## 13. Supabase Integration

**N/A** — Supabase is not a dependency and no Supabase code exists in this
repository.

## 14. Data Flow

1. User submits a message in `chat-input` (Enter, Shift+Enter = newline, IME-guarded).
2. `handleSend(content, modelId)` in `use-chat` aborts any in-flight request,
   creates/appends user + placeholder assistant messages, windows the history,
   and POSTs to `/api/chat`.
3. Server validates the body (array, 1–100 messages, 128KB cap, role/content
   checks), resolves the model, builds the fallback chain, and starts the
   provider stream.
4. `createStreamWithFallback` returns a `ReadableStream<ProviderEvent>`; the
   route encodes it as SSE via `toSSEStream` (or maps failures to
   400/502/503/500 JSON).
5. Client `readSSEStream` parses frames (chunk-safe, CRLF-safe, tolerant of
   malformed JSON, propagates `error` frames).
6. `use-chat` batches tokens into state via `requestAnimationFrame`.
7. `Message` renders `renderMarkdown(content)` → `sanitizeHTML` →
   `dangerouslySetInnerHTML`.
8. Conversation changes persist through the throttled saver.

## 15. Local Storage

| Key | Format | Notes |
|---|---|---|
| `conversations` | `{version: 1, conversations: [...]}` | Legacy bare-array supported; per-item validation on load; caps: 100 conversations, 500 messages each; quota-exceeded → halves and reconciles via `SaveResult` |
| `theme` | `"light" \| "dark"` | Absent → system preference |
| `selectedModel` | model id string | Defaults to `auto` |

All access is wrapped in try/catch. **No secrets are stored client-side.**

## 16. Offline / Synchronization Architecture

**N/A** — there is no sync. When offline, requests fail and the user sees the
server/client error in a toast plus an inline "Error: …" assistant message.
localStorage remains fully usable offline for previously saved conversations.

## 17. Conflict Resolution

**N/A** — single client, single writer, no remote state. The only conflict
surface is the localStorage quota fallback (see §15), which is resolved by
halving and returning the saved state for reconciliation.

## 18. Realtime Systems

**N/A** — no websockets/pubsub/presence. Streaming is request-scoped SSE over
the chat endpoint only.

## 19–29. Feature Systems (habits, routines, tasks, goals, notes,
notifications, achievements, analytics, social, gamification)

**N/A** — none of these are features of this application. The only
notification-like mechanism is the transient in-app **Toast** (§7). The audit
template listed these; they were checked and do not exist.

## 30. Audio / SFX System

**N/A** — no audio anywhere in the project.

## 31. Theme System

- Design tokens are CSS custom properties in `src/app/global.css`, switched by
  a `.dark` class on `<html>` (light + dark palettes for surfaces, text,
  accent, borders, shadows, and syntax-highlight token colors).
- A tiny inline `<head>` script applies the stored/system theme **before
  first paint** to prevent flash; `use-theme` keeps React state in sync.
- `color-scheme: light`/`dark` is set so native controls match.

## 32. Responsive / Mobile Architecture

- App shell is `h-dvh` with `overflow: hidden`; the chat column owns its own
  scroll.
- **Mobile (<768px):** sidebar becomes a slide-in drawer with backdrop +
  Escape-to-close; composer sits at the bottom.
- **Desktop:** sidebar is a static rail that can be **collapsed** to `w-0`
  (animated) via the top-bar toggle — chat expands with no empty gap.
- Message column and composer share `max-w-3xl` for comfortable reading.
- Code blocks and tables scroll horizontally on narrow screens; nothing forces
  page-level horizontal scroll.

## 33. Performance Architecture

- `React.memo` on `Message` — only the streaming message re-renders.
- rAF-batched token updates — at most one state write per animation frame.
- History windowing caps request payloads to ~80% of the model's context
  length.
- Throttled persistence (500ms debounce / 3s max wait / flush on page hide).
- Fallback candidates start **lazily** — no wasted provider connections.
- Single shared `TextEncoder`; stream cancellation propagates on client
  disconnect (`toSSEStream.cancel()`).
- No speculative `useMemo`/`useCallback` — only where there is evidence
  (e.g. stable callbacks passed to memoized children).

## 34. Error Handling

| Layer | Behavior |
|---|---|
| Route | JSON parse → 400; validation → 400 with reason; no providers configured → 503; all candidates failed → 502 with per-model details; unknown provider/model → 400; anything else → 500 |
| Providers | Errors become `error` events in the stream; SDK/fetch errors are logged server-side |
| Fallback | Pre-content failure → transparent candidate switch (logged `[fallback] ...`); post-content failure → error propagated; all failed → aggregated 502 |
| Client | AbortError → silent return; otherwise surfaces the **server's** message (not a bare status code) in a toast and as an inline `Error: …` assistant message |
| SSE | Malformed frames ignored; `error` frames throw; trailing buffer flushed |
| Persistence | Quota errors → halve + reconcile; all storage wrapped in try/catch |

## 35. Security Considerations

- **API keys:** server-only via `process.env`; never shipped to the client
  (no `NEXT_PUBLIC_*`). `.env*` is gitignored (`.env.example` is the template).
- **Model validation:** model IDs are looked up against the hardcoded catalog
  server-side; arbitrary provider strings are rejected.
- **Request validation:** role/content type checks, message count and total
  content-size caps.
- **XSS chain:** Markdown input is escaped (shared `escape.ts`), URLs are
  scheme-allowlisted (`http`/`https`/`mailto`/`#`), and the final HTML passes
  through DOMPurify with a strict tag/attribute allowlist before
  `dangerouslySetInnerHTML`. `<img>`, `<iframe>`, event handlers, and
  `data:`/`javascript:` URLs are stripped.
- **Known gap:** no CSP headers are configured (see §40/§44).

## 36. Testing Architecture

Vitest with jsdom for the sanitizer integration suite. 9 suites / **133 tests**:

| Suite | Tests | Covers |
|---|---|---|
| `conversations.test.ts` | 9 | Versioned format, legacy arrays, validation, quota |
| `fallback.test.ts` | 12 | Candidate ordering, fallback chain behavior |
| `highlight.test.ts` | 22 | Token classes, aliases, unknown languages, labels |
| `markdown.test.ts` | 39 | Block parser, headings, tables, fences, escaping, XSS URL cases |
| `providers-shared.test.ts` | 7 | `buildApiMessages`, `toSSEStream` |
| `router.test.ts` | 11 | Provider detection, model selection |
| `sanitize.test.ts` | 5 | Sanitizer with mocked DOMPurify |
| `sanitize-integration.test.ts` | 20 | Real DOMPurify in jsdom, full feature set |
| `sse.test.ts` | 8 | Events, errors, DONE, malformed JSON, chunking |

## 37. Build / Development Commands

```bash
npm run dev          # next dev --turbopack
npm run build        # next build --turbopack
npm start            # next start
npm run lint         # eslint
npm run format       # prettier --write .
npm run format:check # prettier --check .
npm test             # vitest run
npm run test:watch   # vitest
```

## 38. Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `GROQ_API_KEY` | server (`process.env`) | Groq provider |
| `OPENROUTER_API_KEY` | server (`process.env`) | OpenRouter provider |

See `.env.example`. **Never** prefix these with `NEXT_PUBLIC_`.

## 39. Important Architectural Decisions

1. **Single server choke point** (`/api/chat`) — client never touches provider
   APIs directly; keys stay server-side.
2. **Server-only AI layer** — `import "server-only"` on the `lib/ai` barrel;
   `models.ts` is the only client-safe export.
3. **ProviderEvent abstraction** — providers and the fallback chain work on
   structured events; SSE encoding happens once at the route boundary
   (`toSSEStream`), so nothing else knows the wire format.
4. **Pre-content-only fallback switching** — a candidate that dies before
   emitting text is replaced transparently; once content has flowed, failures
   surface as errors (no confusing mid-answer model swap).
5. **Hand-rolled Markdown renderer** — no dependency; deterministic block
   parsing, escaping everywhere, and DOMPurify as the final safety net.
6. **Priority-based Auto routing** — "Auto" = highest-priority available
   model, with the rest of the chain as fallback candidates.
7. **localStorage as the only persistence** — correct for a single-user,
   local-first v0.x; the Phase-9 roadmap adds a real database.

## 40. Known Limitations

- **Single-user, no auth or multi-device sync** — deliberate for now.
- **Hand-rolled Markdown** — flat lists only (no nesting); images render as
  links (the sanitizer strips `<img>`); tables need a separator row.
- **Unclosed code fences** are treated as code to the end of the message
  (deliberate heuristic for common AI output).
- **Mid-answer provider failure** shows an error rather than switching models
  mid-stream (by design — see §39.4).
- **No CSP headers** configured; DOMPurify is the only defense-in-depth layer
  for rendered content.
- **No message virtualization** — very long conversations are fine (500-msg
  cap) but not virtualized.

## 41. Remaining Issues

- `L-15` (audit ID): no virtualization for long conversations — defer until needed.
- Auto mode has no notion of *task* — it cannot yet pick a "chat model" vs a
  "coding model" based on the message; that is a future enhancement, not a bug.

## 42. Future Improvements / TODO

- **Phase 9 roadmap:** authentication + database (removes the single-user
  constraint), error monitoring (Sentry-style), provider-failure metrics.
- Task-aware auto routing (conversation vs code prompts).
- Conversation search, model-level usage stats, custom system prompt UI.
- Markdown: nested lists, inline images with a hosted-storage allowlist, GFM
  task lists.

## 43. Technical Debt

- Flat-list Markdown parsing and the single-pass inline tokenizer trade edge
  cases for simplicity; revisit if richer formatting is needed.
- The provider registry (`providers/index.ts`) and model metadata
  (`models.ts`) must stay in sync when adding providers — a single
  registration table would remove that footgun if providers grow.
- `.env.example` placeholders are not real keys (by design).

## 44. Production Readiness

- ✅ `tsc --noEmit`, `eslint`, `vitest` (133 tests), and `next build` are all
  green.
- ✅ Live-verified: Auto mode picks the best available model; fallback
  transparently answers through the next provider when one fails; direct
  provider hits bypass the fallback.
- ⚠️ Before public deployment: add rate limiting / abuse protection, CSP
  headers, and (per Phase 9) real accounts if multi-user is desired.

## 45. Audit Results

Final audit (2026-09-04) after the full cleanup pass:

- **Dead code removed:** `src/components/button.tsx` (unused since the sidebar
  rewrite; usage verified).
- **Moved:** `use-chat.ts` and `use-theme.ts` → `src/hooks/` (client hooks
  separated from `lib/`, which now holds pure logic + server-only AI code).
- **Duplication removed:** HTML escaping consolidated into
  `src/lib/escape.ts` (`escapeHtml`/`escapeAttr`), imported by both
  `markdown.ts` and `highlight.ts`.
- **Config cleanup:** stray `[TEMPLATE]` line removed from `.env.example`.
- **Formatting:** whole tree normalized with the repo's own Prettier config
  (37 files were drifted; zero logic changes).
- **Validation:** 133/133 tests, TypeScript clean, ESLint clean, production
  build clean.
- **Scope notes:** Supabase, database, auth, sync, gamification, habits,
  routines, tasks, goals, notes, analytics, social, and audio were audited and
  confirmed **not applicable** to this codebase.

See `PROJECT_AUDIT.md` for the full historical audit (phases 1–10).