# Personal AI Agent

## What This Is
A browser-automation AI agent powered by Kernel (cloud browsers) and multi-model LLMs (OpenRouter / AWS Bedrock). Similar to OpenClaw and Base44 Super Agents. The agent can navigate any website, fill forms, extract data, and perform multi-step workflows in SaaS applications.

## Architecture
- **Monorepo** with npm workspaces: `packages/core`, `packages/cli`, `packages/web`
- **Core**: Agent engine (pure TS, no UI) - LLM providers, browser management, tools, agent loop
- **CLI**: Terminal interface - `agent run "task..."` with model/provider/budget flags
- **Web**: Next.js chat UI with embedded Kernel live view, real-time step streaming, cost tracking

## Critical Rules

### Browser Session Management
- ALWAYS use `chromium.connectOverCDP(cdpWsUrl)` to connect to Kernel browsers
- NEVER call `browser.newContext()` on a Kernel browser - it breaks stealth/proxy/extension config
- ALWAYS use `browser.contexts()[0]` and `context.pages()[0]` for the default context/page
- ALWAYS destroy browser sessions on agent termination (cleanup in finally blocks)

### LLM Provider Layer
- ALL model creation goes through `provider-factory.ts` - never import provider packages directly
- The rest of the codebase only sees the Vercel AI SDK `LanguageModel` interface
- Switching providers = changing a config string, nothing else

### Tool Definitions
- ALL tools use Vercel AI SDK `tool()` with Zod input schemas
- Hybrid approach: Playwright tools (fast, selector-based) + Vision tools (screenshot + coordinates)
- System prompt instructs LLM to prefer Playwright tools, fall back to vision when selectors unknown

### Cost Control
- Cost tracker runs on every step via `onStepFinish`
- Budget enforcement via stop conditions - agent terminates if cumulative cost exceeds MAX_BUDGET
- Dynamic model switching: cheap model for navigation, expensive model only for vision steps

## Key Files
- `packages/core/src/agent/agent.ts` - Agent factory, wires everything together
- `packages/core/src/llm/provider-factory.ts` - Multi-provider model creation
- `packages/core/src/browser/browser-session.ts` - Kernel + Playwright lifecycle
- `packages/core/src/tools/index.ts` - All tool registrations
- `packages/core/src/agent/system-prompt.ts` - LLM instructions

## Commands
```bash
npm install                    # Install all workspace dependencies
npm run agent -- run "task"    # Run agent via CLI
npm run dev                    # Start web UI dev server
npm run build                  # Build all packages
```

## Environment Variables
See `.env.example` for all required variables. At minimum you need:
- `KERNEL_API_KEY` - from https://dashboard.onkernel.com
- `OPENROUTER_API_KEY` - from https://openrouter.ai/keys
  (or AWS credentials for Bedrock)
