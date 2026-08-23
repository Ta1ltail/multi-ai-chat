# Roadmap

## Phase 0 — Project Foundation ✅

- **Goal:** Clean project setup with all tooling
- **Tasks:** Next.js, TypeScript, Tailwind, ESLint, Prettier, docs
- **Done when:** Dev server runs, lint passes, build succeeds

## Phase 1 — Basic Chat UI ✅

- **Goal:** Working chat interface (no AI yet)
- **Tasks:**
  - ChatInput component with auto-resizing textarea
  - Message component (user bubbles, assistant text, loading dots)
  - MessageList with smart auto-scroll
  - AppShell layout with collapsible sidebar
  - Dark mode support
  - Message entrance animations
- **Done when:** User can type and see messages in a clean UI

## Phase 2 — Single AI Provider ✅

- **Goal:** Connect to one AI provider
- **Tasks:**
  - API route for AI communication
  - Connect Groq (free tier, 14,400 req/day)
  - Stream responses
- **Done when:** User sends a message and gets an AI response

## Phase 3 — Conversation Management

- **Goal:** Store and manage conversations
- **Tasks:**
  - Conversation state management
  - Message history display
  - Clear/new conversation
- **Done when:** Conversations persist during session

## Phase 4 — Multiple AI Providers

- **Goal:** Support multiple AI providers
- **Tasks:**
  - Provider abstraction layer
  - Add Groq and OpenRouter
  - Provider configuration
- **Done when:** All providers work through the same interface

## Phase 5 — Model Selection

- **Goal:** Let users choose models
- **Tasks:**
  - Model list per provider
  - Model selector UI
  - Model configuration
- **Done when:** Users can switch between models freely

## Phase 6 — Auto Routing

- **Goal:** Automatically pick the best provider
- **Tasks:**
  - Routing logic (cost, speed, quality)
  - User preference settings
  - Auto vs manual mode
- **Done when:** System selects optimal provider automatically

## Phase 7 — Provider Fallback

- **Goal:** Handle provider failures gracefully
- **Tasks:**
  - Error detection
  - Fallback chain configuration
  - Retry logic
- **Done when:** Users never see provider errors (handled transparently)

## Phase 8 — Improvements & Production

- **Goal:** Polish and prepare for production
- **Tasks:**
  - Authentication
  - Database for conversations
  - Performance optimization
  - Error monitoring
  - Deployment setup
- **Done when:** App is production-ready
