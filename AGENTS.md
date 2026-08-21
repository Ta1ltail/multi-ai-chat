# AGENTS.md

Instructions for AI coding assistants working on this project.

## Before Making Changes

1. Read the relevant documentation in `docs/` before modifying code
2. Understand the existing code structure before changing it
3. Check `docs/03-ARCHITECTURE.md` for design decisions

## Code Rules

- **TypeScript strict mode** — no `any` unless absolutely necessary and justified
- **Modular code** — keep components and logic separate
- **Separate concerns** — UI components ≠ business logic ≠ API logic
- **No overengineering** — build what's needed, not what might be needed
- **No unnecessary dependencies** — verify a library is needed before adding it

## Security

- **Never expose API keys** — use environment variables only
- **Frontend isolation** — frontend code must never directly call AI providers with secret keys
- **All AI calls go through API routes** — server-side only

## Quality

- **Run checks before finishing** — `npm run lint`, `npx tsc --noEmit`, `npm run build`
- **Don't claim something works unless verified** — run the actual checks
- **Keep changes focused** — don't rewrite unrelated code
- **Update docs** — if architecture or behavior changes, update documentation

## File Organization

- Components go in `src/components/`
- App pages go in `src/app/`
- Utilities go in `src/lib/`
- Types go in `src/types/`
- Configuration stays at project root
