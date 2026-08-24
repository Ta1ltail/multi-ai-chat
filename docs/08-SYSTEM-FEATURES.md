# System Features & Audit

Complete audit of the Multi AI Chat system — every component, behavior, and design decision documented.

---

## 1. Component Inventory

### Layout

| Component | File | Role |
|-----------|------|------|
| `AppShell` | `src/components/app-shell.tsx` | Root layout: sidebar + main content area |
| `Sidebar` | `src/components/sidebar.tsx` | Navigation drawer with conversation list, theme toggle |

### Chat

| Component | File | Role |
|-----------|------|------|
| `ChatInput` | `src/components/chat-input.tsx` | Auto-resizing textarea + send button |
| `Message` | `src/components/message.tsx` | Single message bubble (user / assistant / loading) |
| `MessageList` | `src/components/message-list.tsx` | Scrollable message container with smart auto-scroll |
| `ModelSelector` | `src/components/model-selector.tsx` | Dropdown to select AI model and provider |

### Primitives

| Component | File | Role |
|-----------|------|------|
| `Button` | `src/components/button.tsx` | Reusable button with variant/size props |

### Pages

| Route | File | Role |
|-------|------|------|
| `/` | `src/app/page.tsx` | Main chat page (client component) |
| — | `src/app/layout.tsx` | Root layout (fonts, metadata, theme script) |

### AI Provider Layer

| File | Role |
|------|------|
| `src/lib/ai/index.ts` | Public API: re-exports, system prompt |
| `src/lib/ai/providers/types.ts` | Interfaces: AIProvider, ModelConfig, StreamOptions |
| `src/lib/ai/providers/index.ts` | Provider registry, model lookup |
| `src/lib/ai/providers/groq.ts` | Groq provider implementation |
| `src/lib/ai/providers/openrouter.ts` | OpenRouter provider implementation |

### Utilities

| File | Role |
|------|------|
| `src/lib/use-chat.ts` | Chat state hook: conversations, send, persistence |
| `src/lib/sanitize.ts` | DOMPurify HTML sanitizer for markdown output |
| `src/lib/conversations.ts` | localStorage persistence for conversations |
| `src/lib/use-theme.ts` | Theme hook: light/dark toggle with localStorage |
| `src/lib/highlight.ts` | Regex-based syntax highlighting |
| `src/lib/markdown.ts` | Lightweight markdown renderer |
| `src/lib/sse.ts` | Client-side SSE stream reader |

### Types

| File | Role |
|------|------|
| `src/types/index.ts` | Shared type definitions: MessageData, Conversation, ToastState |

### Error Handling

| File | Role |
|------|------|
| `src/app/error.tsx` | Error boundary with reset button |
| `src/app/loading.tsx` | Loading skeleton |

### Tests

| File | Role |
|------|------|
| `src/lib/__tests__/highlight.test.ts` | Syntax highlighting tests (12 tests) |
| `src/lib/__tests__/markdown.test.ts` | Markdown renderer tests (10 tests) |
| `src/lib/__tests__/conversations.test.ts` | localStorage persistence tests (6 tests) |
| `src/lib/__tests__/sanitize.test.ts` | HTML sanitizer tests (5 tests) |

---

## 2. Feature Audit

### 2.1 Chat Input

| Behavior | Status | Detail |
|----------|--------|--------|
| Auto-resize on type | ✅ | Textarea grows from 1 row up to 280px via `requestAnimationFrame`-debounced `scrollHeight` calculation |
| Shift+Enter newline | ✅ | `handleKeyDown` checks `!e.shiftKey` — Shift+Enter inserts newline, plain Enter submits |
| Enter to send | ✅ | Prevents default, calls `handleSubmit`, clears value |
| Send button state | ✅ | Disabled when empty or `disabled` prop; shows spinner when loading |
| Send button style | ✅ | Foreground/background inversion when active, subtle when idle |
| Box sizing | ✅ | `box-border` prevents width overflow from padding |
| Height reset on send | ✅ | `useEffect([value])` calls `resizeTextarea()` after `setValue("")` to shrink back to 1 row |
| Border theming | ✅ | Uses `--border-input` CSS variable, not hardcoded hex |
| Focus ring | ✅ | `focus-within:border-foreground-tertiary` on container |
| Performance | ✅ | `requestAnimationFrame` debounce + `cancelAnimationFrame` cancel-on-rerun |

### 2.2 Message Rendering

| Behavior | Status | Detail |
|----------|--------|--------|
| User bubble | ✅ | Blue background (`--user-bubble`), right-aligned, `max-w-[65%]` md / `max-w-[80%]` sm |
| Assistant message | ✅ | Transparent, left-aligned, full width |
| Loading indicator | ✅ | Three pulsing dots with staggered `animation-delay` |
| Line breaks | ✅ | `whitespace-pre-wrap` preserves `\n` |
| Long words/URLs | ✅ | `wrap-break-word` prevents horizontal overflow |
| Text size | ✅ | `text-[15px] leading-relaxed` for readability |
| Entrance animation | ✅ | `message-animate-in` — 180ms fade-in + slide-up on every new message |
| Empty message cleanup | ✅ | Empty assistant messages removed after stream completes |

### 2.3 Message List

| Behavior | Status | Detail |
|----------|--------|--------|
| Smart auto-scroll | ✅ | Only scrolls to bottom if user is within 150px of the bottom (via `onScroll` tracking) |
| Internal scrolling | ✅ | `flex-1 overflow-y-auto` — scrolls within its own box |
| Custom scrollbar | ✅ | `.custom-scrollbar` — 5px thin track |
| Content width | ✅ | `max-w-3xl` centered with `mx-auto` |
| Screen readers | ✅ | `aria-live="polite"` + `aria-label="Chat messages"` on message container |

### 2.4 Sidebar

| Behavior | Status | Detail |
|----------|--------|--------|
| Collapsible | ✅ | `w-64` → `w-0` with `transition-[width] duration-200` |
| Mobile overlay | ✅ | `fixed inset-0 z-20 bg-black/20 backdrop-blur-[1px]` on `md:hidden` |
| Floating reopen button | ✅ | `fixed left-3 top-3 z-40` when sidebar closed |
| New chat button | ✅ | Uses `Button` component with `secondary` variant |
| Conversation list | ✅ | Active state highlighting, truncate on overflow |
| Delete confirmation | ✅ | Inline "Delete / Cancel" confirmation before deletion |
| Empty list state | ✅ | "No conversations yet" message |
| Theme toggle | ✅ | Sun/moon icon in footer, toggles light/dark mode |
| Version footer | ✅ | `v0.3.0` in footer |

### 2.5 Model Selection

| Behavior | Status | Detail |
|----------|--------|--------|
| Model dropdown | ✅ | Popover with grouped models by provider, scrollable |
| Default model | ✅ | First Groq model (GPT-OSS 120B) |
| Disabled during loading | ✅ | `disabled` prop prevents model switch mid-response |
| Provider routing | ✅ | Model config includes provider ID; API route resolves provider |
| Multi-provider support | ✅ | Groq (4 models) + OpenRouter (5 models) |

### 2.6 Layout

| Behavior | Status | Detail |
|----------|--------|--------|
| Full viewport | ✅ | `h-dvh` (100dvh) on app-shell outer div |
| No page scroll | ✅ | `overflow: hidden` on `html`, `body`, app-shell, main-area, and `<main>` |
| Flex containment | ✅ | `min-h-0` on `<main>`, `shrink-0` on ChatInput wrapper — prevents flex blowout |
| Sidebar separator | ✅ | 1px divider, hidden on mobile |
| Responsive padding | ✅ | `px-4` sm / `px-5` md on chat input |

### 2.7 Theme System

| Behavior | Status | Detail |
|----------|--------|--------|
| Light/dark toggle | ✅ | Sun/moon icon in sidebar footer |
| System preference | ✅ | Falls back to `prefers-color-scheme` if no stored preference |
| localStorage persistence | ✅ | Theme choice saved under `"theme"` key |
| Flash prevention | ✅ | Inline `<script>` in `<head>` applies `.dark` class before paint |
| Class-based switching | ✅ | `html.dark` class toggles all CSS variables |

### 2.8 Persistence

| Behavior | Status | Detail |
|----------|--------|--------|
| Save to localStorage | ✅ | Debounced save (500ms) after each state change |
| Load on mount | ✅ | Conversations hydrated from localStorage on page load |
| Corrupted data handling | ✅ | JSON parse errors clear the key and start fresh |
| Storage quota handling | ✅ | Quota errors retry with half the data |
| Conversation limit | ✅ | Max 100 conversations to prevent storage bloat |

---

## 3. Theme System

### 3.1 CSS Variables (global.css)

**Light mode (`:root`):**

| Token | Value | Purpose |
|-------|-------|---------|
| `--background` | `#f5f6f8` | Page background (warm off-white) |
| `--surface` | `#ffffff` | Card/container background |
| `--surface-elevated` | `#f0f1f3` | Elevated elements |
| `--foreground` | `#1a1d23` | Primary text |
| `--foreground-secondary` | `#555b66` | Secondary text |
| `--foreground-tertiary` | `#7d8490` | Placeholder/hint text |
| `--accent` | `#2563eb` | Primary action color (blue) |
| `--accent-hover` | `#1d4ed8` | Hover state |
| `--accent-light` | `#eff6ff` | Active sidebar item bg |
| `--user-bubble` | `#e8eef8` | User message background |
| `--user-bubble-text` | `#1e3a5f` | User message text |
| `--hover` | `#f0f1f3` | Hover background |
| `--active` | `#e4e6e9` | Active/pressed background |
| `--focus-ring` | `#93c5fd` | Keyboard focus indicator |
| `--border-separator` | `#e2e4e8` | Divider lines |
| `--border-input` | `#d1d5db` | Input field border |
| `--error` | `#dc2626` | Error state |
| `--error-bg` | `#fef2f2` | Error background |

**Dark mode (`html.dark`):** All tokens overridden with dark equivalents.

### 3.2 Tailwind Theme Mapping

All CSS variables are mapped to Tailwind utilities via `@theme inline` block:
- `--color-*` → Tailwind color utilities (`bg-surface`, `text-foreground`, etc.)
- `--shadow-*` → Tailwind shadow utilities (`shadow-sm`, `shadow-md`, `shadow-lg`)
- `--font-*` → Tailwind font utilities (`font-sans`, `font-mono`)

### 3.3 Custom CSS Utilities

| Class | Purpose |
|-------|---------|
| `.focus-ring` | Keyboard-only focus outline (2px solid, 2px offset) |
| `.custom-scrollbar` | 5px thin scrollbar for message list and sidebar |
| `.chat-input-scrollbar` | 4px ultra-thin scrollbar for textarea |
| `.message-animate-in` | 180ms fade-in + slide-up entrance animation |

---

## 4. Overflow & Scroll Architecture

The system uses a **layered overflow containment** strategy to prevent page-level scrolling:

```
html              overflow: hidden
  body            overflow: hidden
    .app-shell    h-dvh overflow-hidden
      .main-area  overflow-hidden
        <main>    min-h-0 overflow-hidden
          MessageList   flex-1 overflow-y-auto   ← scrolls internally
          ChatInput     shrink-0                  ← fixed height, never shrunk
            textarea    max-h-70 overflow:auto     ← scrolls internally
```

---

## 5. Performance Characteristics

| Area | Approach | Impact |
|------|----------|--------|
| Textarea resize | `requestAnimationFrame` + `cancelAnimationFrame` | Resize recalculated once per frame, not per keystroke |
| Height sync | `useEffect([value])` | Ensures height resets after state changes (e.g. send) |
| Auto-scroll | `onScroll` tracking + threshold check | Only runs DOM scroll when user is near bottom |
| Message animation | CSS `@keyframes` | GPU-accelerated, no JS layout cost |
| Sidebar transition | `transition-[width]` CSS | Hardware-accelerated, no JS animation |
| AI streaming | SSE via `ReadableStream` | Responses display as they arrive, no waiting for full generation |
| Model selection | Client-side dropdown | Model/provider resolved from config, no extra state management needed |
| Syntax highlighting | Regex-based, no deps | Fast client-side code highlighting without heavyweight libraries |
| Persistence | Debounced localStorage | Saves after 500ms of inactivity, not on every keystroke |

---

## 6. Accessibility Audit

| Check | Status | Detail |
|-------|--------|--------|
| `aria-label` on send button | ✅ | `"Send message"` |
| `aria-label` on sidebar toggle | ✅ | `"Open sidebar"` / `"Close sidebar"` |
| `aria-label` on theme toggle | ✅ | `"Switch to light mode"` / `"Switch to dark mode"` |
| `title` on sidebar buttons | ✅ | Matches `aria-label` for tooltip |
| Keyboard focus indicators | ✅ | `.focus-ring` on all interactive elements |
| `role="button"` on overlay | ✅ | Mobile backdrop is keyboard-dismissible |
| Semantic HTML | ✅ | `<main>`, `<button>`, `<form>`, `<ul>/<li>` |
| `disabled` state | ✅ | All buttons respect `disabled` prop with visual + pointer-events feedback |
| Color contrast | ✅ | Foreground tokens meet WCAG AA against backgrounds |
| `aria-live` on messages | ✅ | `aria-live="polite"` announces new messages to screen readers |
| Delete confirmation | ✅ | Inline confirmation prevents accidental deletion |
| `prefers-reduced-motion` | ✅ | All animations and transitions disabled when requested |

---

## 7. Security Audit

| Check | Status | Detail |
|-------|--------|--------|
| API keys server-side only | ✅ | `GROQ_API_KEY` and `OPENROUTER_API_KEY` in `.env.local`, accessed only in API routes |
| No secrets in source | ✅ | `.env.local` gitignored, `.env.example` has placeholder only |
| `dangerouslySetInnerHTML` | ✅ | Used for markdown-rendered assistant messages — output sanitized via DOMPurify with strict allowlist |
| No external script loads | ✅ | Only Google Fonts via `next/font` |
| Input sanitization | ✅ | React escapes user input in JSX; assistant content is markdown-rendered |

---

## 8. Code Quality

| Check | Status | Detail |
|-------|--------|--------|
| TypeScript strict mode | ✅ | `tsconfig.json` has `"strict": true` |
| No `any` types | ✅ | All types explicit |
| ESLint | ✅ | Configured with `eslint-config-next` + `eslint-config-prettier` |
| Prettier | ✅ | Configured with `prettier-plugin-tailwindcss` for class sorting |
| Build | ✅ | `npm run build` passes with no errors |
| Typecheck | ✅ | `npx tsc --noEmit` passes with no errors |
| Named exports | ✅ | All components use named exports (no default exports except page) |
| Props interfaces | ✅ | Every component has a typed props interface |
| No dead code | ✅ | Unused files, exports, and components cleaned up |
| No hardcoded colors | ✅ | All colors use CSS variables via theme system |

---

## 9. Issues Remaining

### No Provider Fallback

Multiple providers available (Groq, OpenRouter) but no automatic fallback chain. If one provider is down, the user must manually switch.

### No Database

Conversations persist via localStorage only. No server-side storage, no cross-device sync.

---

## 10. File Tree Summary

```
src/
  types/
    index.ts                — Shared types (MessageData, Conversation, ToastState)
  app/
    api/chat/route.ts       — Multi-provider streaming chat API endpoint
    error.tsx               — Error boundary with reset
    loading.tsx             — Loading skeleton
    global.css              — Theme variables, scrollbar styles, animations
    layout.tsx              — Root layout (fonts, metadata, theme script)
    page.tsx                — Main chat page (UI only, uses useChat hook)
  components/
    app-shell.tsx           — Sidebar + content layout wrapper
    button.tsx              — Reusable button primitive
    chat-input.tsx          — Auto-resizing textarea + send button
    message-list.tsx        — Scrollable message container with smart auto-scroll
    message.tsx             — Single message bubble with markdown + copy
    model-selector.tsx      — Model/provider selection dropdown
    sidebar.tsx             — Navigation drawer with theme toggle
    toast.tsx               — Toast notification component
  lib/
    use-chat.ts             — Chat state hook (conversations, send, abort)
    sanitize.ts             — DOMPurify HTML sanitizer
    ai/
      index.ts              — Public API: re-exports, system prompt
      providers/
        types.ts            — AIProvider, ModelConfig, StreamOptions interfaces
        index.ts            — Provider registry, model lookup functions
        groq.ts             — Groq provider implementation
        openrouter.ts       — OpenRouter provider implementation
    conversations.ts        — localStorage persistence for conversations
    highlight.ts            — Regex-based syntax highlighter
    markdown.ts             — Lightweight markdown renderer
    sse.ts                  — Client-side SSE stream reader
    use-theme.ts            — Theme hook (light/dark toggle)
  lib/__tests__/
    highlight.test.ts       — Syntax highlighting tests
    markdown.test.ts        — Markdown renderer tests
    conversations.test.ts   — localStorage persistence tests
    sanitize.test.ts        — HTML sanitizer tests

docs/
    00-PROJECT-OVERVIEW.md
    01-REQUIREMENTS.md
    02-TECH-STACK.md
    03-ARCHITECTURE.md
    07-ROADMAP.md
    08-SYSTEM-FEATURES.md   ← this file
```
