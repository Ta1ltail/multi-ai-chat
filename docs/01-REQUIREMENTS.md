# Requirements

## Functional Requirements

### Current Phase (Foundation)

- **FR-01** — Project runs with Next.js, TypeScript, Tailwind CSS
- **FR-02** — ESLint and Prettier enforce code quality
- **FR-03** — App Router structure for clean routing

### Planned

- **FR-10** — Users can send messages in a chat interface
- **FR-11** — Users can select an AI model
- **FR-12** — Users can switch between providers
- **FR-13** — System falls back to another provider if one fails
- **FR-14** — Users can view conversation history
- **FR-15** — System auto-selects the best available free model

## Non-Functional Requirements

- **NFR-01** — TypeScript strict mode enabled
- **NFR-02** — No `any` types without justification
- **NFR-03** — API keys stored in environment variables only
- **NFR-04** — Frontend never directly accesses AI provider APIs with secret keys
- **NFR-05** — Code must pass lint and type checks before commit
- **NFR-06** — Documentation kept up to date with architecture changes
