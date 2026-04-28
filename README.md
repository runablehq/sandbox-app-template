# sandbox-app-template

Monorepo: Bun workspaces + Turborepo.

## Project Structure

```
app.config.json              Service config (ports, commands) — source of truth
.env                         Secrets (gitignored), loaded via Vite's loadEnv
packages/
  web/                       Unified server (API + web frontend via Vite)
    vite.config.ts           Vite 7 config — loads .env, sets port, registers plugins
    index.html               Frontend HTML entry
    vite/plugins/
      hono-dev-plugin.ts     Intercepts /api/* in dev, forwards to Hono via SSR
      runable-analytics-plugin.ts
    src/
      api/
        index.ts             Hono routes (.basePath('api')) + AppType export
        database/
          index.ts           Database client (Turso/LibSQL)
          schema.ts          Drizzle schema
      web/
        main.tsx             App entry
        app.tsx              Root component + Wouter routing
        pages/               Page components
        components/          UI components
        hooks/
          use-desktop.ts     Desktop detection
        lib/
          api.ts             Typed API client (hono client)
          desktop.ts         Electron API types
          utils.ts           Shared utilities
        styles.css           Tailwind CSS entry
  mobile/                    Expo + React Native + expo-router
    app/                     File-based routing
    lib/
      api.ts                 Typed API client
  desktop/                   Electron shell (loads web app from server)
    electron/
      main.ts                Main process + IPC handlers
      preload.ts             contextBridge API
    vite.config.ts           Vite config, reads desktop port from app.config.json
```

## App Config

All service configuration lives in `app.config.json` at the project root. Read this file to get ports and dev commands for each service. The template code reads ports from this file; do not hardcode ports in application code, agent examples, or platform clients.

The web service serves both the API at `/api/*` and the web frontend at `/*` from a single web port.

## Environment Variables

Secrets and credentials live in `.env` at the project root (gitignored). Vite's `loadEnv` loads them into `process.env` at dev/build time (configured in `packages/web/vite.config.ts`). In API code (Hono), use `process.env.YOUR_VAR`. In browser code, only `VITE_`-prefixed vars are exposed via `import.meta.env.VITE_YOUR_VAR`. Drizzle scripts use `bun --env-file=../../.env` to load env vars directly.

## Desktop UI

The desktop app has no separate renderer by default. It loads the web app from `packages/web`; desktop-specific UI should live in `packages/web/src/web/` and be gated with `useDesktop()` / `window.electronAPI`. Keep `packages/desktop` for Electron window setup, menus/tray/shortcuts, IPC handlers, native OS APIs, and packaging. Only add a separate desktop renderer when the product intentionally needs a different desktop-only UI architecture.

## Dev Commands

```sh
bun run dev            # start the web service (API + frontend) on port 3000
bun run dev:desktop    # start the desktop app (requires server running)
bun run dev:mobile     # start the Expo dev server
```

## Quality Commands

```sh
bun run typecheck
bun run build
```

## Database

```sh
cd packages/web
bun run db:push        # Push schema to database
bun run db:generate    # Generate migration files
bun run db:migrate     # Run migrations
bun run db:studio      # Open Drizzle Studio
```
