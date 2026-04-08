# sandbox-platform-template

Monorepo: Bun workspaces + Turborepo.

## Project Structure

```
app.config.json              Service config (ports, commands) — source of truth
.env                         Secrets (gitignored)
packages/
  web/                       Unified server (API + web frontend)
    index.ts                 Server entry (Bun.serve — routes API + serves HTML)
    index.html               Frontend HTML entry
    src/                     API source
      app.ts                 Hono routes + AppType export
      db/
        index.ts             Database client
        schema.ts            Drizzle schema
      auth.ts                Better Auth config (optional)
      agent/                 AI agent config + tools (optional)
    web/                Frontend source (React)
      main.tsx               App entry
      routes/                TanStack Router file-based routing
      lib/
        api.ts               Typed API client (baseUrl: "/api")
        auth.ts              Auth client (optional)
        desktop.ts           Electron API types
      hooks/
        use-desktop.ts       Desktop detection
  mobile/                    Expo + React Native + expo-router
    app/                     File-based routing
    lib/
      api.ts                 Typed API client
      auth.ts                Auth client (optional)
  desktop/                   Electron shell (loads web app from server)
    electron/
      main.ts                Main process + IPC handlers
      preload.ts             contextBridge API
```

## App Config

All service configuration lives in `app.config.json` at the project root. Read this file to get ports and dev commands for each service.

```json
{
  "services": {
    "api":     { "port": 3000, "dev": "bun run dev" },
    "desktop": { "port": 5174, "dev": "bun run dev:desktop" },
    "mobile":  { "port": 8081, "dev": "bun run dev:mobile" }
  }
}
```

The server serves both the API at `/api/*` and the web frontend at `/*` from a single port. Ports are dynamically assigned per sandbox — never hardcode them in application code.

## Environment Variables

Secrets and credentials live in `.env` at the project root (gitignored). Bun loads it automatically.

## Dev Commands

```sh
bun run dev            # start the server (API + web)
bun run dev:desktop    # start the desktop app (requires server running)
bun run dev:mobile     # start the mobile app
```

## Database

```sh
cd packages/web
bun run db:push        # Push schema to database
bun run db:generate    # Generate migration files
bun run db:migrate     # Run migrations
bun run db:studio      # Open Drizzle Studio
```
