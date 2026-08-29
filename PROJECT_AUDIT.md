# PROJECT_AUDIT.md

**Project:** multi-ai-chat v0.3.0 — Multi-AI chat platform (Next.js 15, React 19, Tailwind 4, TypeScript 5)
**Date:** 2026-08-29
**Method:** Read-only codebase audit per AGENT.md. Three parallel deep-dive agents (frontend, state/persistence, backend/provider) with cross-verification of critical findings via direct file inspection. **Nothing was modified.**

---

## Architecture Snapshot

- **Stack:** Next.js 15 (App Router, Turbopack), React 19, Tailwind 4, TypeScript (strict mode), vitest
- **Providers:** Groq (official SDK), OpenRouter (raw fetch) — server-side only via API route
- **State:** React hooks (`useChat`, `useTheme`), localStorage persistence (no database)
- **Security:** API keys server-side only (`.env.local`), DOMPurify for markdown XSS, all AI calls via `/api/chat`
- **File structure:** `src/app/` (pages + API), `src/components/` (UI), `src/lib/` (hooks, utilities, AI layer), `src/types/`

---

## Findings

### CRITICAL (4)

---

#### C-1. Mid-stream provider errors silently swallowed — assistant reply vanishes with no feedback

- **Severity:** CRITICAL
- **File:** `src/lib/sse.ts` — `readSSEStream` (lines 41–47)
- **What:** The server correctly emits `data: {"error":"..."}` on provider failure (groq.ts:64, openrouter.ts:144). The client throws `new Error(parsed.error)` inside a `try` block whose `catch` exists to skip malformed JSON. The thrown error is immediately caught and discarded.
- **Why:** `use-chat.ts` `finally` block sees empty `content=""` and removes the assistant message. No toast fires. If partial text streamed, the message freezes mid-sentence with no error indication. Invisible data loss — the worst failure mode.
- **Fix:** Separate JSON parsing from error propagation. Move the `parsed.error` check outside the inner try/catch:
  ```ts
  let parsed: SSEEvent;
  try {
    parsed = JSON.parse(data) as SSEEvent;
  } catch {
    continue;
  }
  if (parsed.error) throw new Error(parsed.error);
  ```
- **Side effects:** Callers that previously swallowed errors will now throw — `use-chat.ts` already handles this in its `catch` block (line 199). Add regression tests (currently zero coverage on sse.ts).

---

#### C-2. Unauthenticated endpoint + unvalidated model passthrough — anyone can burn the owner's API key on paid models

- **Severity:** CRITICAL (if deployed publicly)
- **Files:** `src/app/api/chat/route.ts` (lines 13–36), `src/lib/ai/providers/index.ts` (`getModelById` — defined but never called in the route)
- **What:** The client-supplied `model` string is passed verbatim to the upstream provider. `getModelById()` exists to validate model IDs but is never called in the route. Zero auth, zero rate limiting, no `middleware.ts` exists. Combined with hardcoded `:free` lists being only a UI convenience:
  1. Send `model: "anthropic/claude-opus-4.1"` to burn the owner's OpenRouter key on paid models
  2. Send any arbitrary string → upstream 400 → generic 500 to client
  3. Model/provider mismatches (e.g., OpenRouter ID with `provider: "groq"`)
- **Why:** OpenRouter charges per-token. Without server-side validation, a public deployment is an open proxy for burning API credits.
- **Fix:** In route.ts, after resolving model/provider, call `getModelById(resolvedModel)` and reject (400) if undefined or if provider mismatches. Long-term: auth + rate limiting (Phase 8 roadmap).
- **Side effects:** Stale hardcoded model IDs in clients will start getting 400s — acceptable since the UI reads from the same registry.

---

#### C-3. Mobile sidebar completely unusable — overlay paints above sidebar; sidebar opens by default on mobile

- **Severity:** CRITICAL
- **File:** `src/components/app-shell.tsx` (lines 25, 30–33, 57–68)
- **What:** (a) Sidebar wrapper (`<div className="bg-surface flex shrink-0 ...">`) is a static (non-positioned) flex child with no z-index. The mobile overlay (`fixed inset-0 z-20 bg-black/20 backdrop-blur-[1px] md:hidden`) is positioned with z-20. Positioned elements paint above static siblings, so on <768px viewports the overlay sits on top of the entire sidebar — dimming it and intercepting every click. (b) `sidebarOpen` initializes to `true` for all viewports. On phone, the app loads with the 256px sidebar plus the overlay — the chat area is covered, dimmed, and one tap dismisses the sidebar. Primary navigation is effectively broken on mobile.
- **Why:** Users on phones cannot use the app's sidebar — the only navigation surface.
- **Fix:** (a) Add `relative z-30` to the sidebar wrapper div. (b) Render the sidebar closed-by-default on mobile, either with CSS (`max-md:` classes) or a mount effect: `if (window.innerWidth < 768) setSidebarOpen(false)`.
- **Side effects:** Minimal — desktop unaffected (`md:hidden` on overlay). Verify reopen button (z-40) still sits above everything.

---

#### C-4. Nothing persists during an entire stream — refresh mid-stream loses the whole exchange

- **Severity:** CRITICAL
- **File:** `src/lib/use-chat.ts` — save effect (lines 56–65)
- **What:** The save effect is a pure trailing debounce: every `conversations` change clears the pending timer and starts a new 500ms one. During streaming, every token updates `conversations` (lines 168–179), and tokens arrive faster than 500ms apart for the entire response. The timer resets indefinitely and `saveConversations` never fires until the stream ends or a >500ms stall occurs.
- **Why:** A refresh, tab close, or crash mid-stream loses the entire in-flight exchange — often including the user's own message (appended at line 125, then continuously deferred by token updates). Combined with no pagehide/visibilitychange flush, this is complete data loss on any interruption.
- **Fix:** Convert to debounce + max-wait (throttle): track `lastSavedAt` and force a save when deferred > 2–5s. Also flush pending saves on `visibilitychange`/`pagehide`.
- **Side effects:** More frequent `JSON.stringify` of the full conversation array. Saving mid-stream persists partial assistant text — acceptable; the message is completed by later saves.

---

### HIGH (7)

---

#### H-1. `isLoading` race on overlapping sends — loading state turns false while a stream is active

- **Severity:** HIGH
- **File:** `src/lib/use-chat.ts` — `handleSend` (lines 91, 136, 200–215)
- **What:** When send #2 starts while send #1 is streaming, send #2 aborts #1 (line 91), then sets `isLoading(true)` (line 136). Send #1's `finally` block runs after send #2's `setIsLoading(true)` and unconditionally sets `isLoading(false)` (line 201). Final state: `isLoading === false` while stream #2 is in flight — typing indicator disappears, input re-enables, user can stack more sends.
- **Fix:** Guard the `finally` cleanup by generation/ownership:
  ```ts
  finally {
    if (abortRef.current === controller) {
      abortRef.current = null;
      setIsLoading(false);
    }
  }
  ```

---

#### H-2. Markdown `<br>` corrupts code blocks + regex passes mutate code interiors — copied code loses line breaks

- **Severity:** HIGH
- **Files:** `src/lib/markdown.ts` (lines 31–60), `src/components/message.tsx` (line 53)
- **What:** (a) The `<br>` conversion (line 60) has a lookbehind that only protects a newline immediately following `</pre>` — newlines inside the code body are partially converted to `<br>`, which contributes nothing to `textContent`. Copied multiline code loses line breaks. (b) After code blocks are rendered into HTML, subsequent bold/italic/inline-code/link passes scan the entire string including inside `<pre>`, mutating code content (e.g., `**` pairs inside Python code become `<strong>`). Same root cause: no placeholder extraction mechanism.
- **Why:** Copied code is broken for whitespace-sensitive languages (Python). Code blocks render with unexpected formatting.
- **Fix:** Extract code blocks to sentinels before all inline passes, restore afterward. One change fixes both H-2 and the M-7/M-8 markdown issues.

---

#### H-3. Every streamed token re-renders and re-sanitizes the entire message list — O(conversations) work per token

- **Severity:** HIGH (performance)
- **Files:** `src/components/message-list.tsx` (lines 59–61), `src/components/message.tsx` (line 123), `src/lib/use-chat.ts` (lines 168–179)
- **What:** Every SSE chunk triggers `setConversations` → full array identity change → `MessageList` re-render → every `Message` re-renders. `Message` is not memoized, so for every token, every historical message re-runs `renderMarkdown` (multiple regex passes incl. `[\s\S]*?` scans) + `getHighlightedCode` (many regex passes per code block) + `DOMPurify.sanitize` + `innerHTML` replacement. Work per token is O(total conversation content).
- **Fix:** Wrap `Message` in `React.memo` — historical messages receive stable props, so only the streaming message re-renders. Optionally throttle stream updates via `requestAnimationFrame` (flush every ~50–100ms instead of per-chunk).

---

#### H-4. No request schema validation — client-injectable `system` role, non-string content, unbounded body

- **Severity:** HIGH
- **Files:** `src/app/api/chat/route.ts` (lines 13–21), `src/lib/ai/providers/groq.ts` (lines 76–82), `src/lib/ai/providers/openrouter.ts` (lines 56–62)
- **What:** The route validates only `messages.length !== 0`. Runtime validation: (a) `role: "system"` can be sent, overriding the fixed `SYSTEM_PROMPT` (jailbreak vector); (b) `content` can be a number/object/array — Groq SDK serializes it, upstream may 400 or accept unexpected shapes; (c) no body size limit (`req.json()` in route handlers has no built-in limit); (d) malformed JSON falls into the outer catch → 500 instead of 400.
- **Fix:** Validate every item: `role` ∈ `{"user","assistant"}`, `content` a non-empty string; drop or reject `system` role; cap `messages.length` (e.g., 100) and total content length (e.g., 128 KB). Parse JSON in its own try/catch returning 400.

---

#### H-5. No abort-signal propagation, no timeouts, no `cancel()` handlers — upstream connection/token leaks

- **Severity:** MEDIUM-HIGH (cost + resource leak)
- **Files:** `src/app/api/chat/route.ts` (line 38 — `req.signal` never used), `src/lib/ai/providers/groq.ts` (lines 47–69), `src/lib/ai/providers/openrouter.ts` (lines 64–148)
- **What:** (a) `StreamOptions` (types.ts) has no `signal` field. Route never forwards `req.signal`, so when a client aborts or disconnects, upstream keeps running and consuming tokens. (b) Neither `ReadableStream` implements `cancel()`. Consumer cancellation causes next `controller.enqueue` to throw; Groq SDK's stream continues consuming tokens. (c) No timeouts — OpenRouter uses raw fetch with no timeout and can hang indefinitely.
- **Fix:** Add `signal?: AbortSignal` to `StreamOptions`; route passes `req.signal`. Add `cancel(reason)` to both ReadableStreams that aborts an internal AbortController and calls `reader.cancel()`. Wrap with `AbortSignal.any([req.signal, AbortSignal.timeout(60_000)])`.

---

#### H-6. Sidebar delete button invisible and unfocusable for keyboard users

- **Severity:** HIGH
- **File:** `src/components/sidebar.tsx` (lines 104–122)
- **What:** Delete button uses `opacity-0 group-hover:opacity-60`. `opacity: 0` hides the focus outline too. Keyboard users Tab to the button, it receives focus invisibly, pressing Enter deletes a conversation with zero visible indication.
- **Fix:** Add `focus-visible:opacity-100` (and `group-focus-within:opacity-60` so the row shows the affordance while any child has focus).

---

#### H-7. Hydration mismatch: persisted model ID read during render

- **Severity:** HIGH
- **File:** `src/app/page.tsx` (lines 14–25, 42)
- **What:** `useState(getStoredModel)` returns `AUTO_MODEL_ID` on server but the localStorage value during client hydration. React 19 logs a hydration mismatch error and falls back to client-rendering the tree. The codebase's other persisted state (`useTheme`, `useChat`) correctly initializes to a neutral value and syncs in an effect — this is the one state that breaks the pattern.
- **Fix:** Initialize with `useState(AUTO_MODEL_ID)` and read `localStorage` in a mount `useEffect`.

---

### MEDIUM (27)

---

- **M-1. XSS rests on a single DOMPurify pass** — `src/lib/markdown.ts` (lines 10–62): no HTML escaping anywhere; raw model text interpolated into `href="$2"` (attribute breakout), `javascript:` URI (neutralized by DOMPurify default URI handling but fragile). Fix: escape text in renderMarkdown or at minimum validate URL scheme + escape href.

- **M-2. No localStorage schema validation on load, no versioning** — `src/lib/conversations.ts` (lines 11–27), `src/lib/use-chat.ts` (line 131): items trusted wholesale; missing `messages` → `TypeError: spreads undefined` → permanent send breakage. Fix: validate/normalize per item on load; add `schemaVersion` field.

- **M-3. Quota-exceeded fallback silently diverges storage from state** — `src/lib/conversations.ts` (lines 29–41): retry writes `conversations.slice(0, len/2)` but app state is unchanged; UI shows conversations that vanish after reload with only `console.warn`. Fix: reconcile state or surface toast.

- **M-4. Cross-tab last-writer-wins** — `src/lib/conversations.ts` (whole-key overwrite), `src/lib/use-chat.ts` (no `storage` listener): two tabs → one tab's conversations silently deleted. Fix: per-conversation keys or merge on `storage` event.

- **M-5. Streams never aborted on New chat / delete / unmount** — `src/lib/use-chat.ts` (lines 70, 78, no unmount cleanup): new chat while streaming leaves `isLoading === true` and phantom typing indicator; delete wastes bandwidth; unmount never aborts. Fix: abort in those handlers + unmount effect.

- **M-6. Aborted partial assistant messages leak into next request's history** — `src/lib/use-chat.ts` (lines 107–109): send #2 reads history before send #1's `finally` cleanup; truncated assistant turns sent to provider. Fix: filter out empty-string assistant messages from `apiMessages`; consider truncation marker.

- **M-7. Ordered-list wrapping fails with inline HTML** — `src/lib/markdown.ts` (lines 54–57): `[^<]*` in the regex rejects `<strong>`, `<code>`, `<a>` inside `<li>` → orphan list items. Fix: same code-block placeholder refactor (H-2).

- **M-8. No message length / payload size limits** — `src/components/chat-input.tsx` (lines 35–41, no `maxLength`), `src/app/api/chat/route.ts` (line 19): 1MB paste accepted, persisted, amplified by full-array serialization. Fix: client max (8k–32k chars), mirror in API route.

- **M-9. Multiple toasts stack on top of each other** — `src/components/toast.tsx` (line 39): every toast is `fixed bottom-4 right-4 z-50`; two toasts overlap. Fix: render into a single flex-col container.

- **M-10. Toasts invisible to screen readers; close button unlabeled** — `src/components/toast.tsx` (lines 38–55): no `role="alert"`, close button SVG only. Fix: add `role="alert"`, `aria-label="Dismiss notification"`.

- **M-11. `aria-live` on entire message list → screen-reader token spam** — `src/components/message-list.tsx` (lines 54–58): every streamed token re-announces. Fix: use `role="log"` + separate `role="status"` for "responding" indicator.

- **M-12. Model selector: no listbox semantics, no arrow-key navigation** — `src/components/model-selector.tsx` (lines 48–125): no `aria-expanded`/`aria-selected`, no ArrowUp/Down/Home/End, focus not returned to trigger on close. Fix: implement WAI-ARIA listbox pattern or use native `<select>`.

- **M-13. IME composition Enter sends early (CJK input)** — `src/components/chat-input.tsx` (lines 43–48): no `isComposing` check. Fix: first line `if (e.nativeEvent.isComposing || e.keyCode === 229) return;`.

- **M-14. Focus loss on disabled input + ChatInput remount on first send** — `src/components/chat-input.tsx` (line 69 disabled), `src/app/page.tsx` (lines 98–129): textarea disabled yanks focus to body; empty/chat branches each render own ChatInput → remount. Fix: prefer not disabling textarea (only send button); lift ChatInput out of conditional.

- **M-15. use-theme: unguarded localStorage + side effects inside state updater** — `src/lib/use-theme.ts` (lines 14–19, 56–63): no try/catch on storage access (Safari private mode throws); `toggleTheme` does `localStorage.setItem` inside updater. Fix: wrap storage in try/catch; rewrite toggle outside updater.

- **M-16. error.tsx / loading.tsx not vertically centered** — `src/app/error.tsx` (line 16), `src/app/loading.tsx` (line 3): `flex flex-1 justify-center` as direct child of `<body>` (display: block); `flex-1` inert. Fix: add `h-dvh`.

- **M-17. Delete-confirm popover: no focus management, no Escape/outside-click dismiss** — `src/components/sidebar.tsx` (lines 79–102): popover replaces delete button → focus falls to body; no Escape, no outside-click. Fix: focus delete button on open; add Escape handler; add document-level mousedown dismiss.

- **M-18. Error responses leak upstream detail; wrong HTTP status codes** — `src/app/api/chat/route.ts` (lines 51–57): every failure returns 500 with `error.message` verbatim. Fix: map error classes to 400/502/503; sanitize messages.

- **M-19. Missing-key handling inconsistent between auto and manual paths** — `src/app/api/chat/route.ts` (lines 26–36), `src/lib/ai/providers/groq.ts` (lines 4–10): auto checks availability; manual does not → SDK-internal error message → 500. Fix: verify key availability before `createStream`.

- **M-20. No runtime/maxDuration pinned; no `X-Accel-Buffering: no`** — `src/app/api/chat/route.ts` (no export const runtime), `next.config.ts` (empty): platform default may cut off streaming; nginx/proxy buffering. Fix: `export const runtime = "nodejs"; export const maxDuration = 60;`.

- **M-21. Failed responses rendered as normal messages, persisted, fed back to API as assistant history** — `src/lib/use-chat.ts` (lines 184–199): error becomes `"Error: ${msg}"` content → saved to localStorage → sent as `assistant` history. Fix: mark failed messages; filter from API payload; add retry affordance.

- **M-22. No provider fallback / retry — Phase 7 gap** — `src/lib/ai/router.ts` (lines 25–38), `src/app/api/chat/route.ts` (single `createStream`): auto picks one model; if provider is down or 429s, request 500s even though another provider is configured. Fix: fallback chain on pre-stream failures.

- **M-23. Client bundle imports the server AI layer — groq-sdk ships to browser** — `src/lib/use-chat.ts` (line 5), `src/app/page.tsx` (line 9), `src/components/model-selector.tsx` (line 4) → `src/lib/ai/index.ts` → providers → `groq.ts` (line 1: `import Groq from "groq-sdk"`). No key exposed today, but boundary is accidental. Fix: split model metadata into client-safe module; optionally add `import "server-only"`.

- **M-24. Light-mode contrast failures** — `src/app/global.css` (lines 12, 26, 52): `--foreground-tertiary` `#7d8490` on white ≈ 3.4–3.8:1 (below 4.5:1 WCAG AA); sidebar footer `/60` ≈ 2:1; `--focus-ring` `#93c5fd` ≈ 1.8:1 (below 3:1). Fix: darken tokens.

- **M-25. Mobile overlay: broken `role="button"` semantics; Escape handler ineffective; no focus trap** — `src/components/app-shell.tsx` (lines 57–68): overlay `role="button" tabIndex={0}` but Escape only fires when overlay has focus (never happens). Fix: document-level Escape listener while mounted; consider real `<button>`.

- **M-26. Unbounded history sent to provider → context-length failures at scale** — `src/lib/use-chat.ts` (lines 142–145): full conversation history sent every turn; at some point exceeds Groq/OpenRouter context limits → upstream 400 → generic 500. Fix: truncate oldest messages to fit `contextLength` (already in `ModelConfig` but unused).

- **M-27. Prototype-chain lookup in `getProviderOrThrow`** — `src/lib/ai/providers/index.ts` (line 28): `providers["constructor"]` returns inherited value → guard passes → crash at `createStream`. Fix: use `Object.hasOwn` or `Map`.

---

### LOW (21)

---

- **L-1. `generateId` weak/collision-prone** — `src/lib/use-chat.ts` (lines 9–11): `Date.now().toString(36) + 6 base36 chars` ≈ 2.2B possibilities per ms. Fix: `crypto.randomUUID()`.

- **L-2. Refs written during render** — `src/lib/use-chat.ts` (lines 37–41): unsafe under concurrent rendering (documented anti-pattern). Fix: update in useEffect.

- **L-3. SSE reader: no final flush/decoder drain, CRLF sensitivity** — `src/lib/sse.ts` (lines 28–52): UTF-8 split sequences dropped; `\r\n` leaves trailing `\r` on data. Fix: flush buffer after loop; split on `/\r?\n/`.

- **L-4. Copy-indicator timers not cleaned up** — `src/components/message.tsx` (lines 41, 62–65): rapid double-copy creates overlapping timers; no cleanup on unmount. Fix: store timer IDs in ref; clear on new copy and unmount.

- **L-5. Toast handler discards real error message** — `src/app/page.tsx` (lines 63–72): catches with empty binding, always shows "Failed to get response". Fix: `e instanceof Error ? e.message : "..."`.

- **L-6. Double-submit guarded only by render-time disable** — `src/components/chat-input.tsx` (lines 35–41, 55), `src/lib/use-chat.ts`: no reentrancy check inside `handleSend`. Fix: synchronous `inFlightRef` guard.

- **L-7. `MessageData` lacks timestamps/model/schemaVersion; messages unbounded** — `src/types/index.ts` (lines 5–17): no createdAt, no model, no schema version, no per-conversation cap. Fix: add optional fields; cap messages per conversation (e.g., 500).

- **L-8. Stale persisted model ID sent to API** — `src/app/page.tsx`, `src/components/model-selector.tsx` (line 21): ID not in registry → shows "Select model", sends unknown ID. Fix: validate on load; fall back to AUTO_MODEL_ID.

- **L-9. No `color-scheme` / `theme-color` meta** — `src/app/global.css`, `src/app/layout.tsx`: dark mode native controls render with light chrome. Fix: add `color-scheme` declarations.

- **L-10. rAF not cancelled on unmount** — `src/components/chat-input.tsx` (lines 50–53): callback can touch detached textarea. Fix: cancel in effect cleanup.

- **L-11. Copy fallback ignores failure; buttons lack accessible names; no whole-message copy when code present** — `src/components/message.tsx` (lines 20–42, 88–105): `execCommand` return ignored; `title` only; `showMessageCopy` false when code blocks exist. Fix: return result; add `aria-label`; always show message copy.

- **L-12. Scroll edge cases** — `src/components/message-list.tsx` (lines 42, 46): initial-scroll gate on `messages[0].content` (empty first message → no gate); `smooth` scroll per token queues lag. Fix: gate on `messages.length > 0`; use `behavior: "auto"` for tokens.

- **L-13. Dead/duplicated code** — `button.tsx` (primary/sm unused), spinner SVG ×3, `toast.tsx` success/info types unused, `loading.tsx` near-dead, `error.tsx`/ChatInput hand-roll primary-button styles. Consolidate; extract `<Spinner />`.

- **L-14. Minor a11y nits** — active conversation no `aria-current`, sidebar no `<nav>`, `error.tsx` no `role="alert"`/`digest`, emoji not `aria-hidden`, toast z-50 == dropdown z-50.

- **L-15. No virtualization for long conversations** — `src/components/message-list.tsx`: all messages render unvirtualized. Defer until measured need.

- **L-16. `.env.example` not git-tracked** — `.gitignore:34` `.env*` matches it. Fix: add `!.env.example`.

- **L-17. Provider layer duplication** — `groq.ts`/`openrouter.ts` duplicate defaults/message mapping; `allModels` aggregated twice; `as ModelConfig[]` casts suppress type checks. Extract shared module.

- **L-18. Hardcoded model catalogs can silently rot** — `groq.ts` (lines 12–45), `openrouter.ts` (lines 3–44): model IDs guessed; contextLength unenforced. Fix: validate against registry server-side (F1).

- **L-19. Client default provider hardcodes `"groq"`** — `src/lib/use-chat.ts` (line 148): unknown model → Groq → upstream 404 → 500. Fix: derive provider only when model resolves.

- **L-20. Route nits** — `src/app/api/chat/route.ts`: `Connection: keep-alive` meaningless on HTTP/2; provider not resolved from registry when omitted; `req.json()` in same try block.

- **L-21. No stop-generating UI** — `src/app/page.tsx`, `src/components/chat-input.tsx`: `use-chat` has AbortController but no UI to trigger it. Fix: expose `onStop`; swap send button to stop icon while loading.

---

## What Is Implemented Correctly — Do NOT Change

| Area                            | Detail                                                                                                                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **API key isolation**           | Keys read only in server-side provider files; never placed in responses; no `NEXT_PUBLIC_` vars; `.env.local` gitignored.                                                                              |
| **Single AI choke point**       | All AI traffic through `src/app/api/chat/route.ts`; client never contacts providers.                                                                                                                   |
| **DOMPurify boundary**          | Strict tag/attr allowlist at the single `dangerouslySetInnerHTML` point (`message.tsx:123`); `ALLOW_DATA_ATTR: false`.                                                                                 |
| **Theme flash prevention**      | `layout.tsx` inline script applies `.dark` before paint; try/catch guarded; `suppressHydrationWarning`.                                                                                                |
| **`highlight.ts` design**       | Position-based matcher: matches on raw text, resolves overlaps, HTML-escapes every segment exactly once; regex rebuilt per call; unknown languages fall back to escaped plaintext. Secure and correct. |
| **Auto-scroll discipline**      | `shouldAutoScroll` ref + 150px threshold; manual-scroll tracking without re-renders; `key={activeId}` resets per conversation.                                                                         |
| **Loaded gate on saves**        | `use-chat.ts` lines 56–57: prevents pre-hydration empty state from wiping stored conversations. Subtle and correct.                                                                                    |
| **Empty-assistant cleanup**     | Scoped to `assistantId`, idempotent, safe on abort; keeps error-text messages.                                                                                                                         |
| **User messages as plain text** | `message.tsx` line 111: `whitespace-pre-wrap`, no markdown/sanitize pipeline. User content never touches `innerHTML`.                                                                                  |
| **Code-copy delegation**        | Event delegation with `container.contains(btn)` guard; proper cleanup in effect with `[content, copyText]` deps.                                                                                       |
| **System-theme listener**       | Ignored when user has manual preference; correctly cleaned up; persists explicit `"light"` so stored light preference overrides dark system.                                                           |
| **Conversations.ts guards**     | SSR guards; try/catch with corrupt-key removal; 100-conversation trim (newest kept, correct direction).                                                                                                |
| **StrictMode resilience**       | Mount effects are idempotent; no subscriptions or fetches in mount effects; double-invoke safe.                                                                                                        |
| **Button component**            | `forwardRef` + `displayName` + `disabled:pointer-events-none disabled:opacity-50` + consistent `focus-ring`.                                                                                           |
| **Reduced motion**              | Global `prefers-reduced-motion` override covers animations, transitions, smooth scroll, spinners.                                                                                                      |
| **OpenRouter SSE parsing**      | Buffered split-on-newline; `.trim()` handles CRLF; malformed JSON skipped; upstream errors detected.                                                                                                   |

---

## Test Coverage Gaps

| Area               | Status                                                           | Gap                                                                                                                                             |
| ------------------ | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `sse.ts`           | **Zero tests**                                                   | Partial chunks, `[DONE]`, server error events (would catch C-1), malformed JSON, abort, final flush (L-3)                                       |
| `use-chat.ts`      | **Zero tests**                                                   | Happy path, streaming, abort-on-send, isLoading race (H-1), debounce max-wait (C-4), history payload, corrupted-storage crash                   |
| `sanitize.ts`      | Tests mock DOMPurify — **test the mock, not the real allowlist** | Re-run against real DOMPurify in jsdom; test copy-button markup survives                                                                        |
| `markdown.ts`      | Reasonable happy paths                                           | XSS inputs (`<img onerror>`, `javascript:` href), multiline code blocks (H-2), code with backticks/asterisks, list items with inline formatting |
| `highlight.ts`     | Good: escaping, unknown lang, keywords, aliases                  | Overlap resolution, unclosed strings, `html`/`css` branches (untested)                                                                          |
| `conversations.ts` | Good: empty, round-trip, invalid JSON, non-array, 100-cap        | Quota-exceeded path, per-item shape validation absence                                                                                          |

**Highest-value additions:** (1) `sse.test.ts` with mock `ReadableStream` — catches C-1; (2) `use-chat` tests with fake fetch + `renderHook` — catches H-1/C-4; (3) un-mocked DOMPurify integration test; (4) markdown adversarial-input tests.

---

## Areas Needing More Investigation

- **Real-world streaming under reverse proxies** (nginx, Cloudflare): buffering behavior, chunk size, timeout defaults
- **DOMPurify URI policy**: whether `ALLOWED_URI_REGEXP` default covers all edge cases (e.g., `data:`, `vbscript:` in older DOMPurify versions)
- **`AbortSignal.any` availability**: requires Node 20+ / ES2024 lib — verify deployment target
- **Provider error body contents**: what exactly does OpenRouter return on account/rate-limit failures? Could contain org details
- **vitest environment**: currently defaults to `node`; DOMPurify and markdown tests need `jsdom` or `happy-dom` — may already work or silently skip DOM APIs
- **Large conversation performance**: measure actual CPU/memory at 100+ messages to validate H-3 severity
- **Mobile Safari private mode**: verify M-15 fix handles the full range of Safari storage behaviors
- **Groq SDK stream internals**: whether the SDK's internal reader handles `cancel()` correctly or if our external `cancel()` is the only way

---

## Missing Functionality (per docs)

- **Phase 7 — Provider fallback chain** (`docs/07-ROADMAP.md` lines 68–75): no retry, no fallback. Auto picks one model; if it fails, user gets a 500. Docs accurately declare this as not implemented.
- **Phase 8 — Authentication** (`docs/00-PROJECT-OVERVIEW.md` line 37, `docs/07-ROADMAP.md` lines 77–86): no auth, no database, no rate limiting, no monitoring. Docs accurately declare this.
- **Stop-generating control** (L-21): AbortController exists but no UI.
- **Message timestamps/model metadata** (L-7): no `createdAt`, no `model` on assistant turns.

---

## Real-World Usage Risks

- **Quota exhaustion** with long conversations (localStorage grows → quota exceeded → silent data loss via M-3)
- **Upstream model deprecation**: hardcoded model IDs silently break at runtime → generic 500 (L-18)
- **Public deployment abuse**: unauthenticated LLM proxy = cost/quota theft vector the moment it's deployed (C-2)
- **Context-length exceeded**: unbounded history sent to provider → upstream 400 → generic 500 (M-26)
- **Mobile network switches** mid-stream: no reconnection/timeout handling
- **Multi-tab data loss**: two tabs open = last-writer-wins overwrites (M-4)

---

## Improvement Roadmap

### PHASE 1 — Critical Bugs and Data-Loss Risks

| #   | Task                                                                                                              | Effort | Why this order                                               |
| --- | ----------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------ |
| 1   | **Fix SSE error propagation** (C-1): separate JSON parse from error throw in `readSSEStream`; add `sse.test.ts`   | Small  | Highest impact-to-effort ratio; prevents invisible data loss |
| 2   | **Add debounce max-wait** (C-4): convert pure trailing debounce to throttle + `pagehide`/`visibilitychange` flush | Small  | Prevents entire-exchange loss on any interruption            |
| 3   | **Fix mobile sidebar** (C-3): `relative z-30` on sidebar wrapper + default-closed on mobile                       | Small  | Restores primary navigation for all mobile users             |
| 4   | **Add `finally` ownership guard** (H-1): check `abortRef.current === controller` before `setIsLoading(false)`     | Small  | Prevents cascading send corruption                           |
| 5   | **Add localStorage schema validation** (M-2): normalize items on load; filter invalid; add `schemaVersion: 1`     | Small  | Prevents permanent send breakage from corrupt storage        |

**Recommended order:** C-1 → C-4 → C-3 → H-1 → M-2. All are small, independent changes. C-1 first because it's the most common user-facing failure (provider errors happen regularly). C-4 second because data loss is worse than a broken UI.

---

### PHASE 2 — Security and Account/Data Isolation

| #   | Task                                                                                                                        | Effort |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | **Validate model ID server-side** (C-2 + L-20): call `getModelById()` in route; resolve provider from registry when omitted | Small  |
| 2   | **Request schema validation** (H-4): roles ∈ {user,assistant}, string content, body size cap, JSON parse try/catch → 400    | Small  |
| 3   | **Minimal URL escaping** (M-1): escape `href` + validate scheme (`http:`, `https:`, `mailto:`, `#` only)                    | Small  |
| 4   | **Message length limits** (M-8): client max (16k chars default), mirror in API route                                        | Small  |
| 5   | **DOMPurify integration test** (M-1): test real DOMPurify in jsdom against adversarial inputs                               | Small  |
| 6   | **Rate limiting** (if deployed publicly): per-IP token bucket middleware, streaming-friendly                                | Medium |

**Recommended order:** 1→2→3→4→5→6. Steps 1–5 are security hardening that should ship before any public deployment. Rate limiting (6) is medium effort and can wait for Phase 8 auth, but should be added if the app is exposed to the internet.

---

### PHASE 3 — Major Functional Bugs

| #   | Task                                                                                                                                   | Effort |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | **Markdown code-block placeholder refactor** (H-2 + M-7 + M-8): extract `<pre><code>` to sentinels before inline passes, restore after | Medium |
| 2   | **Fix hydration mismatch** (H-7): initialize `selectedModel` with `AUTO_MODEL_ID`; read in mount effect                                | Small  |
| 3   | **Keyboard delete flow** (H-6 + M-17): `focus-visible:opacity-100`; focus management in confirm popover; Escape/outside-click dismiss  | Medium |
| 4   | **IME composition guard** (M-13): `isComposing` check in `handleKeyDown`                                                               | Tiny   |
| 5   | **Focus management** (M-14): prefer not disabling textarea; lift ChatInput out of conditional                                          | Medium |
| 6   | **Toast stacking + announcements** (M-9 + M-10): container with `flex-col gap-2`; `role="alert"` + `aria-label`                        | Small  |
| 7   | **Centering fixes** (M-16): add `h-dvh` to error/loading roots                                                                         | Tiny   |
| 8   | **Theme hook robustness** (M-15): try/catch on storage; rewrite toggle outside updater                                                 | Small  |

**Recommended order:** H-2 first (widest impact — affects all users, all code blocks). H-7 next (one-line fix, high-visibility bug). H-6/M-17 next (destructive-action safety). The rest are quick correctness fixes.

---

### PHASE 4 — Synchronization and Reliability

| #   | Task                                                                                                                                         | Effort |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | **Abort signal + timeouts server-side** (H-5): add `signal` to `StreamOptions`; implement `cancel()` handlers; `AbortSignal.timeout(60_000)` | Medium |
| 2   | **Abort on new chat / delete / unmount** (M-5): call `abortRef.current?.abort()` in those handlers + unmount effect                          | Small  |
| 3   | **Partial-message handling** (M-6): filter empty assistant messages from `apiMessages`; consider truncation marker on abort                  | Small  |
| 4   | **Failed-message handling** (M-21): filter `Error:` messages from API payload; mark `failed`; add retry affordance                           | Medium |
| 5   | **Quota reconciliation** (M-3): return persisted list from `saveConversations`; let `use-chat` reconcile; surface toast                      | Medium |
| 6   | **Cross-tab merge** (M-4): per-conversation keys or `storage` event listener                                                                 | Medium |
| 7   | **Status codes + configured check** (M-18 + M-19): map errors to 400/502/503; verify key availability before `createStream`                  | Small  |
| 8   | **Runtime + maxDuration** (M-20): `export const runtime = "nodejs"; export const maxDuration = 60;`                                          | Tiny   |
| 9   | **Provider fallback** (M-22): attempt `createStream` down the sorted list on pre-stream failures                                             | Large  |

**Recommended order:** H-5 first (token/resource leak is ongoing). M-5 next (related — prevents stuck loading state). M-6/M-4 next (data integrity). M-3/M-4 for persistence reliability. M-18/M-19/M-20 are quick hardening. M-22 (fallback) is the largest and least urgent since it's a documented roadmap item.

---

### PHASE 5 — Performance

| #   | Task                                                                                                     | Effort |
| --- | -------------------------------------------------------------------------------------------------------- | ------ |
| 1   | **React.memo on Message** (H-3): wrap `Message` component; only streaming message re-renders             | Tiny   |
| 2   | **rAF token batching** (H-3): flush accumulated text via `requestAnimationFrame` instead of per-chunk    | Small  |
| 3   | **History windowing** (M-26): truncate oldest messages to fit `contextLength` before sending to provider | Medium |
| 4   | **Per-conversation message cap** (L-7): keep last 500 messages; cap total localStorage size              | Small  |
| 5   | **Virtualization** (L-15): defer until measured need; windowing complicates auto-scroll                  | Large  |

**Recommended order:** React.memo first (one-line change, huge perf win). rAF batching next (small, noticeable improvement). History windowing next (prevents context-length failures). The rest are lower priority.

---

### PHASE 6 — UI/UX and Responsive Issues

| #   | Task                                                                                                           | Effort |
| --- | -------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | **Screen-reader semantics** (M-11 + M-12): `role="log"` + status indicator; listbox pattern for model selector | Medium |
| 2   | **Contrast tokens** (M-24): darken `--foreground-tertiary` to ~4.6:1; darken `--focus-ring` to ≥3:1            | Small  |
| 3   | **Overlay semantics** (M-25): document-level Escape; real `<button>` or drop role; focus trap                  | Small  |
| 4   | **Stop-generating button** (L-21): expose `onStop`; swap send button icon while loading                        | Small  |
| 5   | **Copy a11y** (L-11): `aria-label`; `execCommand` result check; always show message copy                       | Small  |
| 6   | **Scroll polish** (L-12): gate on `messages.length`; `behavior: "auto"` for tokens                             | Tiny   |
| 7   | **Color-scheme** (L-9): add `color-scheme` declarations to CSS                                                 | Tiny   |
| 8   | **Minor a11y nits** (L-14): `aria-current`, `<nav>`, `role="alert"`, `aria-hidden` on emoji                    | Small  |

---

### PHASE 7 — Code Quality and Maintainability

| #   | Task                                                                                                                                | Effort     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | **Client-safe model metadata module** (M-23): split model data into `src/lib/ai/models.ts`; add `import "server-only"` to AI barrel | Small      |
| 2   | **Provider deduplication** (L-17): extract shared defaults/messages; use `satisfies` instead of `as ModelConfig[]`                  | Small      |
| 3   | **Dead code cleanup** (L-13): remove unused Button variants; extract `<Spinner />`; wire up or remove toast types                   | Small      |
| 4   | **Misc correctness nits** (L-1, L-2, L-3, L-4, L-5, L-6): UUID, ref sync, SSE flush, timer cleanup, error message, reentrancy guard | Small each |
| 5   | **Test suites** (test coverage gaps): `sse.test.ts`, `use-chat.test.ts`, markdown adversarial tests, DOMPurify integration          | Medium     |
| 6   | **`.gitignore` fix** (L-16): add `!.env.example`                                                                                    | Tiny       |
| 7   | **Documentation update** (L-18, L-19): update `docs/08-SYSTEM-FEATURES.md` to reflect current state after fixes                     | Small      |

---

### PHASE 8 — Optional Improvements

| #   | Task                                                                                                          | Effort |
| --- | ------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | **Authentication** (roadmap Phase 8): user accounts, session management                                       | Large  |
| 2   | **Database for conversations** (roadmap Phase 8): replace localStorage with server persistence                | Large  |
| 3   | **Model catalog fetching** (L-18): fetch OpenRouter `/api/v1/models` at build time; validate against registry | Medium |
| 4   | **Error monitoring** (roadmap Phase 8): Sentry or similar                                                     | Medium |
| 5   | **Deployment config** (roadmap Phase 8): Vercel/Docker setup, CI/CD                                           | Medium |
| 6   | **Virtualization** (L-15): windowed rendering for very long chats                                             | Large  |
| 7   | **Token counting** (M-26 enhancement): use `contextLength` from `ModelConfig` to truncate intelligently       | Medium |
| 8   | **Misc a11y polish** (L-14): remaining WCAG compliance items                                                  | Small  |

---

_Audit complete. Total: 4 Critical, 7 High, 27 Medium, 21 Low = 59 findings. 16 verified items listed as "do not change." 8-phase roadmap with recommended fix order._
