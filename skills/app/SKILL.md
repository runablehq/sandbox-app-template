---
name: app
description: Use for any app creation task — planning, implementing pages, screens, API routes, database schema, and delivering. Supports web, mobile, and desktop from a single codebase. Includes authentication, payments, AI agent, and email as optional modules.
---

# App

## Stack

Monorepo: Bun workspaces + Turborepo.

- **Server:** Bun.serve — serves both the Hono API (under `/api`) and the web frontend (via HTML imports) from a single process in `packages/web`
- **API:** Hono, Drizzle ORM + Turso (SQLite) — source in `packages/web/src/api/`
- **Web Frontend:** React + TanStack Router, bundled by Bun's HTML imports — source in `packages/web/src/client/`
- **Mobile:** Expo + React Native + expo-router — Expo dev server port comes from `app.config.json`
- **Desktop:** Electron shell + Vite (loads the web app from the server, exposes native APIs via IPC) — Vite/Electron ports come from `app.config.json`

Typed end-to-end: `packages/web` exports `AppType`, all clients use `@softnetics/hono-react-query` for fully typed queries and mutations.

The server port is defined in `app.config.json` at the project root — never hardcode it.

## Preflight

1. Ask questions: what the app does, which platforms (web, mobile, desktop, or all), key features, data model, auth/payment needs.
2. If the user hasn't specified a UI theme/style, show a few inspiration images for UI reference; skip if their design intent is already clear.
3. Form a plan. State assumptions as decisions — the user corrects what's wrong. Include: what's being built, which packages are touched, API routes, database tables, screens/pages, files to create/modify.

Do not start implementation until the user approves or adjusts the plan.

## Workflow

1. Run preflight.
2. Call `app_init` with absolute `app_path`, `name`, `description`. **Do NOT create the directory beforehand** — `app_init` creates it and fails if it already exists.
3. Read `README.md` and `app.config.json` in the created directory for project structure and assigned ports.
4. Build API routes, database schema, pages/screens, components.
5. Call `deliver` with `type: app`, app folder path at index 0.

### Key Rules

- **All API routes must be chained** on the same `app` instance in `packages/web/src/api/app.ts`. Breaking the chain breaks type inference.
- **Always pass explicit status codes** — `c.json(data, 200)`, never `c.json(data)`. Without this, the typed RPC client resolves response types to `never`.
- **Routes in `src/api/app.ts` are defined without `/api` prefix.** The prefix is applied by `src/index.ts` at the Bun.serve routing level. A route `.get("/health", ...)` is accessible at `/api/health`.
- **Desktop has no separate renderer by default.** It loads the web app. Desktop-specific UI still lives in `packages/web/src/client/` and is gated with `useDesktop()` / `window.electronAPI`. Native functionality lives in `packages/desktop` and is exposed via IPC. Only create a separate desktop renderer if the user explicitly asks for a different desktop-only UI architecture.
- **Bun loads `.env` automatically** — no dotenv needed.
- **Port comes from `app.config.json`** — read it at runtime, never hardcode.
- **For any payment, subscription, or billing feature** — always consult [references/payments.md](references/payments.md) first. Use Autumn hooks (`useCustomer`, `useListPlans`) for plan display and checkout, never build custom payment logic.
- **For any AI model, chatbot, or agent feature** — always consult [references/ai-agent.md](references/ai-agent.md) first. Use AI SDK with the Vercel AI Gateway provider, never build custom LLM integration logic.

### Preview

Read `app.config.json` for the server port, then:

```bash
# Start the server (API + web)
bun run dev

# Individual platforms
bun run dev:mobile
bun run dev:desktop    # requires server running first
```

### Database

```bash
cd packages/web
bun run db:push        # Push schema to database
bun run db:generate    # Generate migration files
bun run db:migrate     # Run migrations
bun run db:studio      # Open Drizzle Studio
```

## Optional Capabilities

For optional capabilities, consult the matching reference before implementation:

- Authentication: [references/authentication.md](references/authentication.md)
- Payments, plans, subscriptions, billing, pricing, usage tracking: [references/payments.md](references/payments.md)
- AI agent: [references/ai-agent.md](references/ai-agent.md)
- Email: [references/email.md](references/email.md)

## Platform References

For platform-specific patterns, consult the matching reference:

- API routes and database: [references/api.md](references/api.md)
- Web pages and components: [references/web.md](references/web.md)
- Mobile screens: [references/mobile.md](references/mobile.md)
- Desktop native features: [references/desktop.md](references/desktop.md)

## Testing

Before delivering, run `bun run build` to verify the app compiles without errors. Then start `bun run dev` and `bun run dev:mobile` and check that both are reachable on their ports from `app.config.json`. Fix any failures before delivering.
