# Architecture

## Current State

```
User
  ↓
Next.js UI (App Router)
  ↓
AppShell (sidebar + main area)
  ↓
Page Components (page.tsx)
  ├── MessageList — scrollable message container
  ├── ChatInput — auto-resizing textarea
  ├── ModelSelector — model/provider dropdown
  └── Message — individual message bubbles
```

## Data Flow

```
User → Chat UI → API Route → Provider Router → Groq / OpenRouter
                ↓
         localStorage (persistence)
```

## Key Design Decisions

- **API routes handle AI calls** — secret keys never reach the client
- **Provider abstraction** — easy to add new providers without changing UI
- **localStorage persistence** — conversations survive page refresh, no database needed
- **Class-based dark mode** — `.dark` class on `<html>`, toggled via React state
- **Free-tier first** — default to free models, upgrade optional
- **Overflow containment** — layered `overflow: hidden` prevents page-level scrolling
- **Smart auto-scroll** — only auto-scrolls when user is near bottom

## Component Hierarchy

```
RootLayout (layout.tsx)
  └── Home (page.tsx)
        ├── useTheme() — light/dark mode state
        ├── loadConversations() — localStorage hydration
        └── AppShell (app-shell.tsx)
              ├── Sidebar (sidebar.tsx)
              │     ├── Button (button.tsx)
              │     └── Theme toggle
              └── <main>
                    ├── MessageList (message-list.tsx)
                    │     └── Message (message.tsx)
                    ├── ModelSelector (model-selector.tsx)
                    └── ChatInput (chat-input.tsx)
```

## File Structure

```
src/
  app/
    api/chat/route.ts       — Multi-provider streaming chat endpoint
    global.css              — Theme variables, animations, syntax highlighting
    layout.tsx              — Root layout (fonts, metadata, theme script)
    page.tsx                — Main chat page (state, persistence, API calls)
  components/
    app-shell.tsx           — Sidebar + content layout wrapper
    button.tsx              — Reusable button primitive
    chat-input.tsx          — Auto-resizing textarea + send button
    message.tsx             — Single message bubble
    message-list.tsx        — Scrollable message container
    model-selector.tsx      — Model/provider dropdown
    sidebar.tsx             — Navigation drawer with theme toggle
    toast.tsx               — Toast notification
  lib/
    ai/
      index.ts              — Public API, system prompt
      providers/
        types.ts            — AIProvider, ModelConfig, StreamOptions
        index.ts            — Provider registry, model lookup
        groq.ts             — Groq provider
        openrouter.ts       — OpenRouter provider
    conversations.ts        — localStorage persistence
    highlight.ts            — Syntax highlighting
    markdown.ts             — Markdown renderer
    use-theme.ts            — Theme hook (light/dark toggle)
```
