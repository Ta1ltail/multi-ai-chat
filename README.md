# Multi AI Chat

A web-based AI chat platform that gives users one unified interface to access multiple LLM providers and models, prioritizing free options.

## Status

🚧 **In Development** — Project foundation complete. Chat functionality coming next.

## Tech Stack

- **Next.js 15** — React framework with App Router
- **TypeScript** — Type-safe development
- **Tailwind CSS 4** — Utility-first styling
- **ESLint + Prettier** — Code quality and formatting

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/Ta1ltail/multi-ai-chat.git
cd multi-ai-chat
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Quality Commands

```bash
npm run lint        # Run ESLint
npx tsc --noEmit    # Type check
npm run build       # Production build
```

## Project Structure

```
multi-ai-chat/
├── src/
│   └── app/          # App Router pages
├── public/           # Static assets
├── docs/             # Project documentation
├── AGENTS.md         # AI assistant instructions
├── README.md
├── .env.example      # Environment variable template
├── package.json
└── tsconfig.json
```

## Documentation

- [Project Overview](docs/00-PROJECT-OVERVIEW.md)
- [Requirements](docs/01-REQUIREMENTS.md)
- [Tech Stack](docs/02-TECH-STACK.md)
- [Architecture](docs/03-ARCHITECTURE.md)
- [Roadmap](docs/07-ROADMAP.md)

## License

Private — Not yet licensed for public use.
