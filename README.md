# sandbox-app-template

Monorepo: Bun workspaces + Turborepo.

## Project Structure

```
app.config.json              Service config (ports, commands) — source of truth
.env                         Secrets (gitignored)
packages/
  web/                       Unified server (API + web frontend)
    src/
      index.ts               Server entry (Bun.serve — routes API + serves HTML)
      api/
        app.ts               Hono routes + AppType export
        database/
          index.ts           Database client
          schema.ts          Drizzle schema
      client/                Frontend source (React)
        index.html           Frontend HTML entry
        main.tsx             App entry
        routes/              TanStack Router file-based routing
        lib/
          api.ts             Typed API client (baseUrl: "/api")
          desktop.ts         Electron API types
        hooks/
          use-desktop.ts     Desktop detection
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

## Desktop UI

The desktop app has no separate renderer by default. It loads the web app from `packages/web`; desktop-specific UI should live in `packages/web/src/client/` and be gated with `useDesktop()` / `window.electronAPI`. Keep `packages/desktop` for Electron window setup, menus/tray/shortcuts, IPC handlers, native OS APIs, and packaging. Only add a separate desktop renderer when the product intentionally needs a different desktop-only UI architecture.

## Environment Variables

Secrets and credentials live in `.env` at the project root (gitignored). Bun loads it automatically.

## Dev Commands

```sh
bun run dev            # start the web service (API + frontend)
bun run dev:desktop    # start the desktop app (requires server running)
bun run dev:mobile            # start the Expo dev server
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
