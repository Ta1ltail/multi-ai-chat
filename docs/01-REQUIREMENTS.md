# Requirements

## Functional Requirements

### Phase 0 — Foundation ✅

- **FR-01** — Project runs with Next.js, TypeScript, Tailwind CSS
- **FR-02** — ESLint and Prettier enforce code quality
- **FR-03** — App Router structure for clean routing

### Phase 1 — Basic Chat UI ✅

- **FR-10** — Users can send messages in a chat interface
- **FR-11** — Auto-resizing textarea grows as user types (up to 280px)
- **FR-12** — Enter sends, Shift+Enter inserts newline
- **FR-13** — User messages displayed in blue bubbles (right-aligned)
- **FR-14** — Assistant messages displayed as plain text (left-aligned)
- **FR-15** — Loading indicator shows while waiting for response
- **FR-16** — Smart auto-scroll (only if user is near bottom)
- **FR-17** — Message entrance animation (fade-in + slide-up)
- **FR-18** — Collapsible sidebar with conversation list
- **FR-19** — Empty state shows greeting + centered input

### Phase 2 — Single AI Provider ✅

- **FR-30** — API route streams AI responses via SSE
- **FR-31** — Groq integration with free-tier models

### Phase 3 — Conversation Management ✅

- **FR-40** — Conversations persist via localStorage
- **FR-41** — New chat creation
- **FR-42** — Conversation deletion with confirmation
- **FR-43** — Message history display

### Phase 4-5 — Multiple Providers + Model Selection ✅

- **FR-20** — Users can select an AI model
- **FR-21** — Users can switch between providers
- **FR-50** — Provider abstraction layer (Groq, OpenRouter)
- **FR-51** — Model selector UI with grouped models

### Phase 6 — Auto Routing ✅

- **FR-24** — System auto-selects the best available free model

### Phase 7+ — Planned

- **FR-22** — System falls back to another provider if one fails

## Non-Functional Requirements

- **NFR-01** — TypeScript strict mode enabled
- **NFR-02** — No `any` types without justification
- **NFR-03** — API keys stored in environment variables only
- **NFR-04** — Frontend never directly accesses AI provider APIs with secret keys
- **NFR-05** — Code must pass lint and type checks before commit
- **NFR-06** — Documentation kept up to date with architecture changes
