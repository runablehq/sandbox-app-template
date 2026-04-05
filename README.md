# sandbox-platform-template

Monorepo: Bun workspaces + Turborepo.

## Project Structure

```
app.config.json              Service config (ports, commands) — source of truth
.env                         Secrets (gitignored)
packages/
  api/                       Hono on Bun, Drizzle ORM + Turso (SQLite)
    index.ts                 Server entry
    src/
      app.ts                 App definition + AppType export
      db/
        index.ts             Database client
        schema.ts            Drizzle schema
      auth.ts                Better Auth config (optional)
      agent/                 AI agent config + tools (optional)
  web/                       React + Vite + TanStack Router
    src/
      main.tsx               App entry
      routes/                File-based routing
      lib/
        api.ts               Typed API client
        auth.ts              Auth client (optional)
        desktop.ts           Electron API types
      hooks/
        use-desktop.ts       Desktop detection
  mobile/                    Expo + React Native + expo-router
    app/                     File-based routing
    lib/
      api.ts                 Typed API client
      auth.ts                Auth client (optional)
  desktop/                   Electron shell (loads web app)
    electron/
      main.ts                Main process + IPC handlers
      preload.ts             contextBridge API
```

## App Config

All service configuration lives in `app.config.json` at the project root. Read this file to get ports and dev commands for each service.

```json
{
  "services": {
    "api":     { "port": 3000, "dev": "bun run dev:api" },
    "web":     { "port": 5173, "dev": "bun run dev:web" },
    "desktop": { "port": 5174, "dev": "bun run dev:desktop" },
    "mobile":  { "port": 8081, "dev": "bun run dev:mobile" }
  }
}
```

Ports are dynamically assigned per sandbox — never hardcode them in application code. Import `app.config.json` or read from env instead.

## Environment Variables

Secrets and credentials live in `.env` at the project root (gitignored). Bun, Vite, and Expo all load it automatically.

> **Rule of thumb:** `VITE_` prefix = exposed to web/desktop clients. Everything else = API-only.

## Dev Commands

```sh
bun run dev            # start everything
bun run dev:api        # just the API
bun run dev:web        # just the web app
bun run dev:desktop    # just the desktop app
bun run dev:mobile     # just the mobile app
```

## Database

```sh
cd packages/api
bun run db:push        # Push schema to database
bun run db:generate    # Generate migration files
bun run db:migrate     # Run migrations
bun run db:studio      # Open Drizzle Studio
```
