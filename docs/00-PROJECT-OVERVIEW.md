# Multi AI Chat

A web-based AI chat platform that gives users one unified interface to access multiple LLM providers and models, prioritizing free options.

## Goal

Build a single chat interface where users can:

- Access multiple AI providers and models
- Switch between models easily
- Get automatic fallback when a provider is unavailable
- Use free-tier models by default

## What's Included (Now)

- Next.js project foundation with TypeScript, Tailwind CSS, ESLint
- App Router structure
- Clean, scalable folder layout
- Chat UI with auto-resizing textarea
- Message display (user bubbles, assistant text, loading indicator)
- Smart auto-scroll with manual scroll detection
- Collapsible sidebar with conversation list
- Dark mode support
- Responsive layout with overflow containment
- Groq AI integration with streaming responses
- Markdown rendering with syntax highlighting
- Copy message and code block buttons
- Toast notifications for errors

## What's NOT Included Yet

- No conversation storage/persistence
- No authentication
- No database
- No model selection UI
- No provider routing or fallback
- No error handling/retry logic
- No tests

## Core Principles

- **Free first** — prioritize free-tier models and providers
- **Simple** — clean, maintainable code
- **Scalable** — easy to add new providers and features
- **Reliable** — fallback when providers fail
