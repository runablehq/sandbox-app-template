---
name: app
description: Use for any app creation task — planning, implementing pages, screens, API routes, database schema, and delivering. Supports web, mobile, and desktop from a single codebase. Includes authentication, payments, AI agent, and email as optional modules.
---

# App

## Stack

Monorepo: Bun workspaces + Turborepo.

- **API:** Hono on Bun, Drizzle ORM + Turso (SQLite)
- **Web:** React + Vite + TanStack Router
- **Mobile:** Expo + React Native + expo-router
- **Desktop:** Electron shell (loads the web app, exposes native APIs via IPC)

Typed end-to-end: API exports `AppType`, all clients use `@softnetics/hono-react-query` for fully typed queries and mutations.

## Preflight

1. Ask questions: what the app does, which platforms (web, mobile, desktop, or all), key features, data model, auth/payment needs.
2. Form a plan. State assumptions as decisions — the user corrects what's wrong. Include: what's being built, which packages are touched, API routes, database tables, screens/pages, files to create/modify.

Do not start implementation until the user approves or adjusts the plan.

## Workflow

1. Run preflight.
2. Call `app_init` with absolute `app_path`, `name`, `description`. **Do NOT create the directory beforehand** — `app_init` creates it and fails if it already exists.
3. Read `README.md` in the created directory for project structure and tech reference.
4. Build API routes, database schema, pages/screens, components.
5. Call `deliver` with `type: app`, app folder path at index 0.

### Key Rules

- **All API routes must be chained** on the same `app` instance in `packages/api/src/app.ts`. Breaking the chain breaks type inference.
- **Always pass explicit status codes** — `c.json(data, 200)`, never `c.json(data)`. Without this, the typed RPC client resolves response types to `never`.
- **Desktop has no UI of its own.** It loads the web app. Desktop-specific features are exposed via IPC bridge and used conditionally with `useDesktop()`.
- **Environment variables:** Unprefixed = API-only. `VITE_` prefix = exposed to web/desktop clients. Mobile reads from Expo config or constants.
- **Bun loads `.env` automatically** — no dotenv needed.

### Preview

```bash
# All packages from root
turbo dev

# Individual packages
cd packages/api && bun dev          # API on :3000
cd packages/web && bun dev          # Web on :5173
cd packages/mobile && bun start     # Expo dev server
cd packages/desktop && bun dev      # Electron (loads web on :5173)
```

### Database

```bash
cd packages/api
bun run db:push        # Push schema to database
bun run db:generate    # Generate migration files
bun run db:migrate     # Run migrations
bun run db:studio      # Open Drizzle Studio
```

## Optional Capabilities

For optional capabilities, consult the matching reference before implementation:

- Authentication: [references/authentication.md](references/authentication.md)
- Payments: [references/payments.md](references/payments.md)
- AI agent: [references/ai-agent.md](references/ai-agent.md)
- Email: [references/email.md](references/email.md)

## Platform References

For platform-specific patterns, consult the matching reference:

- API routes and database: [references/api.md](references/api.md)
- Web pages and components: [references/web.md](references/web.md)
- Mobile screens: [references/mobile.md](references/mobile.md)
- Desktop native features: [references/desktop.md](references/desktop.md)

## Testing

Before delivering, verify the app works. Start the dev servers, test key flows, confirm no console errors or broken layouts. Don't deliver a broken app.
