# Architecture

## Current State

```
User
  ↓
Next.js UI (App Router)
  ↓
Page Components
```

## Target Architecture

```
User
  ↓
Next.js UI (App Router)
  ↓
Application/API Layer
  ↓
AI Provider Layer
  ├── Gemini (Google)
  ├── Groq
  └── OpenRouter
```

## How It Will Grow

### Phase 1-3: Chat UI + Single Provider

```
User → Chat UI → API Route → Single AI Provider
```

### Phase 4-5: Multiple Providers + Model Selection

```
User → Chat UI → API Route → Provider Router → Provider A / B / C
```

### Phase 6-7: Auto Routing + Fallback

```
User → Chat UI → API Route → Router (best provider) → Fallback chain
```

## Key Design Decisions

- **API routes handle AI calls** — secret keys never reach the client
- **Provider abstraction** — easy to add new providers without changing UI
- **Fallback chain** — automatic retry with next provider on failure
- **Free-tier first** — default to free models, upgrade optional
