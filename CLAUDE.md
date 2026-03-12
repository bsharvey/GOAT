# CLAUDE.md — GOAT

Music Royalty Platform with OmniLLM, APEX Security & Voice Assistant.
Built by Harvey Miller (DJ Speedy).

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | >=20.0.0 |
| Backend | Express | ^5.1 |
| Language | TypeScript | ^5.7 |
| Frontend | React | ^19 |
| Build | Vite | ^6 |
| Styling | Tailwind CSS | v4 |
| State (FE) | Zustand ^5, TanStack Query ^5 | — |
| Charts | Recharts ^2.15 | — |
| Animation | Framer Motion ^11 | — |
| Database | MongoDB (Mongoose ^8) | — |
| AI (Primary) | Claude Sonnet 4.6 | `claude-sonnet-4-20250514` |
| AI (Fast) | Claude Haiku 4.5 | `claude-haiku-4-5-20251001` |
| AI (Multi) | OmniLLM Router | Claude, GPT, Gemini, NVIDIA, Ollama |
| TTS | OpenAI TTS-1 / ElevenLabs | — |
| STT | OpenAI Whisper | — |
| CLI | Commander.js ^13 | — |
| Package Manager | pnpm | ^10.30.3 |

## Monorepo Map

```
GOAT/
├── CLAUDE.md              ← you are here
├── package.json           ← root scripts: dev, build, typecheck, cli
├── pnpm-workspace.yaml    ← packages: ["packages/*"]
├── tsconfig.base.json     ← shared TS config
├── packages/
│   ├── api/               ← Express backend
│   │   └── src/
│   │       ├── index.ts           ← Express app entry, middleware, route mounting
│   │       ├── routes/
│   │       │   ├── health.ts      ← health check
│   │       │   ├── royalties.ts   ← artists, songs, royalty records, stats
│   │       │   ├── agent.ts       ← OmniLLM chat + model listing
│   │       │   ├── voice.ts       ← STT (Whisper) + TTS (OpenAI/ElevenLabs)
│   │       │   └── security.ts    ← APEX: email scanning, threats, evidence
│   │       └── services/
│   │           └── omni-llm.ts    ← Multi-model router (Anthropic/OpenAI/Google)
│   ├── web/               ← React SPA (Vite)
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx            ← Routes + nav
│   │       ├── pages/
│   │       │   ├── Dashboard.tsx  ← Royalty dashboard + stats + add song
│   │       │   ├── Agent.tsx      ← OmniLLM chat interface
│   │       │   └── Security.tsx   ← APEX threat monitor
│   │       ├── components/
│   │       ├── hooks/
│   │       └── stores/
│   ├── cli/               ← GOAT CLI tool
│   │   └── src/
│   │       └── index.ts           ← goat chat, goat models, goat health
│   └── core/              ← Shared types & constants
│       └── src/
│           ├── index.ts           ← barrel export
│           ├── types/
│           │   ├── royalties.ts   ← Artist, Song, RoyaltyRecord, StreamingMetrics
│           │   ├── llm.ts         ← LLMProvider, LLMModel, LLMResponse, OmniLLMConfig
│           │   ├── security.ts    ← Threat, Evidence, SecurityScanResult
│           │   └── auth.ts        ← User, AuthToken
│           └── constants/
│               ├── models.ts      ← MODEL_REGISTRY, DEFAULT_MODEL, FAST_MODEL
│               └── royalties.ts   ← ROYALTY_SOURCES, PRO_AFFILIATIONS
├── agent-training/        ← ~60 training docs for archetypes (from Chairman)
├── docs/                  ← Decision System of Record (DSRs)
└── scripts/               ← Build/deploy scripts
```

## Coding Conventions

- **TypeScript everywhere** — no plain JS files
- **ES modules** — `"type": "module"` in all packages
- **`.js` extensions** in TypeScript imports: `import { foo } from "./bar.js"`
- **No default exports** except entry points
- **Package imports**: Always `@goat/core`, `@goat/api`, etc. — never cross-package relative paths
- **Express routes** are factory functions returning `Router`:
  ```typescript
  export function fooRoutes() {
    const router = Router();
    router.get("/", handler);
    return router;
  }
  ```

## Environment Variables

See `packages/api/.env.example` for the full list:

```
PORT=5001
NODE_ENV=development
JWT_SECRET=...
AUTH_SECRET=...
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
GOOGLE_API_KEY=...
NVIDIA_API_KEY=...
XAI_API_KEY=...
MONGODB_URI=mongodb://localhost:27017/goat
ELEVENLABS_API_KEY=...
THREATINTEL_API_KEY=...
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
```

## OmniLLM — Multi-Model Router

The `OmniLLMService` in `packages/api/src/services/omni-llm.ts` routes queries to the best available model:

1. **Auto mode** — analyzes query intent (code, analysis, speed) and selects the best model
2. **Ensemble mode** — queries multiple providers, synthesizes responses
3. **Manual mode** — user picks a specific model

Provider priority: Anthropic → OpenAI → Google → Ollama (local)

Model registry in `@goat/core` — `MODEL_REGISTRY` maps model keys to provider IDs + capabilities.

## APEX Security Features

- **Email Scanning** — OAuth-based Gmail/Outlook threat detection
- **Dark Web Search** — keyword monitoring via threat intel API
- **Threat Database** — track, investigate, resolve threats
- **Evidence Management** — file upload + case number tagging
- **Incident Response** — automated notifications on high-severity threats

## Common Commands

```bash
pnpm dev              # Start API (Express, port 5001)
pnpm dev:web          # Start dashboard (Vite, port 3000)
pnpm dev:all          # Start both in parallel
pnpm build            # Build all packages
pnpm typecheck        # TypeScript checks across all packages
pnpm cli -- chat "your question"   # Use GOAT CLI
pnpm cli -- models                 # List available models
```

## Supporting Files (from Chairman)

The `agent-training/` and `docs/` directories contain archetype training docs and decision records from the Chairman-Infrastructure project. These are preserved for reference and continuity.
