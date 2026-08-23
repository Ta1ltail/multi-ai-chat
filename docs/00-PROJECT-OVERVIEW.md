# Multi AI Chat

A web-based AI chat platform that gives users one unified interface to access multiple LLM providers and models, prioritizing free options.

## Goal

Build a single chat interface where users can:

- Access multiple AI providers and models
- Switch between models easily
- Get automatic fallback when a provider is unavailable
- Use free-tier models by default

## What's Included

- Next.js 15 project with TypeScript, Tailwind CSS, ESLint, Prettier
- App Router structure
- Clean, scalable folder layout
- Chat UI with auto-resizing textarea
- Message display (user bubbles, assistant text, loading indicator)
- Smart auto-scroll with manual scroll detection
- Collapsible sidebar with conversation list
- Conversation persistence via localStorage
- Light/dark mode toggle with system preference detection
- Responsive layout with overflow containment
- Multi-provider AI support (Groq, OpenRouter) with provider abstraction
- Model selector UI with grouped models by provider
- Markdown rendering with syntax highlighting
- Copy message and code block buttons
- Toast notifications for errors
- Delete confirmation for conversations
- Reduced motion support

## What's NOT Included Yet

- No provider routing or fallback chain
- No authentication
- No database (uses localStorage)
- No tests

## Core Principles

- **Free first** — prioritize free-tier models and providers
- **Simple** — clean, maintainable code
- **Scalable** — easy to add new providers and features
- **Reliable** — fallback when providers fail
