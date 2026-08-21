# System Features & Audit

Complete audit of the Multi AI Chat system — every component, behavior, and design decision documented.

---

## 1. Component Inventory

### Layout

| Component | File | Role |
|-----------|------|------|
| `AppShell` | `src/components/app-shell.tsx` | Root layout: sidebar + main content area |
| `Sidebar` | `src/components/sidebar.tsx` | Navigation drawer with conversation list |

### Chat

| Component | File | Role |
|-----------|------|------|
| `ChatInput` | `src/components/chat-input.tsx` | Auto-resizing textarea + send button |
| `Message` | `src/components/message.tsx` | Single message bubble (user / assistant / loading) |
| `MessageList` | `src/components/message-list.tsx` | Scrollable message container with smart auto-scroll |

### Primitives

| Component | File | Role |
|-----------|------|------|
| `Button` | `src/components/button.tsx` | Reusable button with variant/size props |

### Pages

| Route | File | Role |
|-------|------|------|
| `/` | `src/app/page.tsx` | Main chat page (client component) |
| — | `src/app/layout.tsx` | Root layout (fonts, metadata) |

### Types

| File | Role |
|------|------|
| `src/types/css.d.ts` | CSS module type declaration for IDE support |

---

## 2. Feature Audit

### 2.1 Chat Input

| Behavior | Status | Detail |
|----------|--------|--------|
| Auto-resize on type | ✅ | Textarea grows from 1 row up to 280px via `requestAnimationFrame`-debounced `scrollHeight` calculation |
| Shift+Enter newline | ✅ | `handleKeyDown` checks `!e.shiftKey` — Shift+Enter inserts newline, plain Enter submits |
| Enter to send | ✅ | Prevents default, calls `handleSubmit`, clears value |
| Send button state | ✅ | Disabled when empty or `disabled` prop; shows spinner when loading |
| Send button position | ✅ | `self-end mb-1` inside flex row — anchored bottom-right as textarea grows upward |
| Container layout | ✅ | `flex items-end gap-2 py-2` — textarea grows upward, button stays at bottom |
| Box sizing | ✅ | `box-border` prevents width overflow from padding |
| Height reset on send | ✅ | `useEffect([value])` calls `resizeTextarea()` after `setValue("")` to shrink back to 1 row |
| Border theming | ✅ | Uses `--border-input` CSS variable, not hardcoded hex |
| Focus ring | ✅ | `focus-within:border-accent` + `focus-within:shadow-shadow-lg` on container |
| Performance | ✅ | `requestAnimationFrame` debounce + `cancelAnimationFrame` cancel-on-rerun |

### 2.2 Message Rendering

| Behavior | Status | Detail |
|----------|--------|--------|
| User bubble | ✅ | Blue background (`--user-bubble`), right-aligned, `max-w-[65%]` md / `max-w-[80%]` sm |
| Assistant message | ✅ | Transparent, left-aligned, `max-w-[70%]` md / `max-w-[80%]` sm |
| Loading indicator | ✅ | Three pulsing dots with staggered `animation-delay` |
| Line breaks | ✅ | `whitespace-pre-wrap` preserves `\n` |
| Long words/URLs | ✅ | `wrap-break-word` prevents horizontal overflow |
| Text size | ✅ | `text-[15px] leading-relaxed` for readability |
| Entrance animation | ✅ | `message-animate-in` — 200ms fade-in + slide-up on every new message |

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
| Empty list state | ✅ | "No conversations yet" message |
| Version footer | ✅ | `v0.1.0` in footer |

### 2.5 Layout

| Behavior | Status | Detail |
|----------|--------|--------|
| Full viewport | ✅ | `h-dvh` (100dvh) on app-shell outer div |
| No page scroll | ✅ | `overflow: hidden` on `html`, `body`, app-shell, main-area, and `<main>` |
| Flex containment | ✅ | `min-h-0` on `<main>`, `shrink-0` on ChatInput wrapper — prevents flex blowout |
| Sidebar separator | ✅ | 1px divider, hidden on mobile |
| Responsive padding | ✅ | `px-4` sm / `px-5` md on chat input |

---

## 3. Theme System

### 3.1 CSS Variables (global.css)

**Light mode (`:root`):**

| Token | Value | Purpose |
|-------|-------|---------|
| `--background` | `#f8f9fa` | Page background |
| `--surface` | `#ffffff` | Card/container background |
| `--surface-elevated` | `#f1f3f5` | Elevated elements (disabled button) |
| `--foreground` | `#111827` | Primary text |
| `--foreground-secondary` | `#4b5563` | Secondary text |
| `--foreground-tertiary` | `#6b7280` | Placeholder/hint text |
| `--accent` | `#2563eb` | Primary action color (blue) |
| `--accent-hover` | `#1d4ed8` | Hover state |
| `--accent-light` | `#eff6ff` | Active sidebar item bg |
| `--user-bubble` | `#dbeafe` | User message background |
| `--user-bubble-text` | `#ffffff` | User message text |
| `--hover` | `#f1f3f5` | Hover background |
| `--active` | `#e9ecef` | Active/pressed background |
| `--focus-ring` | `#93c5fd` | Keyboard focus indicator |
| `--border-separator` | `#e5e7eb` | Divider lines |
| `--border-input` | `#d1d5db` | Input field border |
| `--error` | `#dc2626` | Error state |
| `--error-bg` | `#fef2f2` | Error background |

**Dark mode (`prefers-color-scheme: dark`):** All tokens overridden with dark equivalents.

### 3.2 Tailwind Theme Mapping

All CSS variables are mapped to Tailwind utilities via `@theme inline` block:
- `--color-*` → Tailwind color utilities (`bg-surface`, `text-foreground`, etc.)
- `--shadow-*` → Tailwind shadow utilities (`shadow-shadow-md`)
- `--font-*` → Tailwind font utilities (`font-sans`, `font-mono`)

### 3.3 Custom CSS Utilities

| Class | Purpose |
|-------|---------|
| `.focus-ring` | Keyboard-only focus outline (2px solid, 2px offset) |
| `.custom-scrollbar` | 5px thin scrollbar for message list and sidebar |
| `.chat-input-scrollbar` | 4px ultra-thin scrollbar for textarea |
| `.message-animate-in` | 200ms fade-in + slide-up entrance animation |

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

**Why this matters:**
- `shrink-0` on ChatInput prevents the flex algorithm from compressing it below content height
- `min-h-0` on `<main>` allows the flex column to shrink below intrinsic content size
- `overflow: hidden` at every ancestor level ensures no content escapes the viewport
- Textarea's `max-h-70` (280px) + `overflow: auto` keeps text scrolling inside the box

---

## 5. Performance Characteristics

| Area | Approach | Impact |
|------|----------|--------|
| Textarea resize | `requestAnimationFrame` + `cancelAnimationFrame` | Resize recalculated once per frame, not per keystroke |
| Height sync | `useEffect([value])` | Ensures height resets after state changes (e.g. send) |
| Auto-scroll | `onScroll` tracking + threshold check | Only runs DOM scroll when user is near bottom |
| Message animation | CSS `@keyframes` | GPU-accelerated, no JS layout cost |
| Sidebar transition | `transition-[width]` CSS | Hardware-accelerated, no JS animation |
| Mock responses | `setTimeout` 1500ms | Simulates network latency (no real API calls yet) |

---

## 6. Accessibility Audit

| Check | Status | Detail |
|-------|--------|--------|
| `aria-label` on send button | ✅ | `"Send message"` |
| `aria-label` on sidebar toggle | ✅ | `"Open sidebar"` / `"Close sidebar"` |
| `title` on sidebar buttons | ✅ | Matches `aria-label` for tooltip |
| Keyboard focus indicators | ✅ | `.focus-ring` on all interactive elements |
| `role="button"` on overlay | ✅ | Mobile backdrop is keyboard-dismissible |
| Semantic HTML | ✅ | `<main>`, `<button>`, `<form>`, `<ul>/<li>` |
| `disabled` state | ✅ | All buttons respect `disabled` prop with visual + pointer-events feedback |
| Color contrast | ✅ | Foreground tokens meet WCAG AA against backgrounds |
| `aria-live` on messages | ✅ | `aria-live="polite"` announces new messages to screen readers |

---

## 7. Security Audit

| Check | Status | Detail |
|-------|--------|--------|
| No API keys in client code | ✅ | No API routes or keys exist yet |
| No secrets in source | ✅ | All config is public (package.json, tsconfig) |
| No `eval()` or `dangerouslySetInnerHTML` | ✅ | No dynamic HTML injection |
| No external script loads | ✅ | Only Google Fonts via `next/font` |
| Input sanitization | ⚠️ | React escapes JSX by default, but no explicit sanitization on mock responses |

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
| No dead code | ✅ | Unused components removed (`EmptyState`, `IconButton`) |
| No hardcoded colors | ✅ | All colors use CSS variables via theme system |

---

## 9. Issues Remaining

### Mock Data Hardcoded

All conversation and message data is hardcoded in `page.tsx`. Expected for Phase 1, addressed in Phase 3.

### No Error Handling

No error boundary, toast system, or retry logic. Phase 2+ scope.

### No Tests

Zero test files. Phase 2+ scope.

---

## 10. File Tree Summary

```
src/
  app/
    global.css           — Theme variables, scrollbar styles, animations
    layout.tsx           — Root layout (fonts, metadata)
    page.tsx             — Main chat page (mock data, state management)
  components/
    app-shell.tsx        — Sidebar + content layout wrapper
    button.tsx           — Reusable button primitive
    chat-input.tsx       — Auto-resizing textarea + send button
    message-list.tsx     — Scrollable message container with smart auto-scroll
    message.tsx          — Single message bubble with entrance animation
    sidebar.tsx          — Navigation drawer
  types/
    css.d.ts             — CSS module type declaration for IDE support

docs/
    00-PROJECT-OVERVIEW.md
    01-REQUIREMENTS.md
    02-TECH-STACK.md
    03-ARCHITECTURE.md
    07-ROADMAP.md
    08-SYSTEM-FEATURES.md   ← this file
```
