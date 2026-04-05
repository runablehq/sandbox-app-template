# sandbox-platform-template

## App Config

All service configuration lives in `app.config.json` at the project root. This is the single source of truth for service names, ports, and dev commands — used by the agent, UI preview buttons, and the services themselves.

## Environment Variables

Secrets and credentials live in `.env` at the project root (gitignored). Bun, Vite, and Expo all load it automatically.

| Variable | Description |
| --- | --- |
| `TURSO_TOKEN` | Turso platform API token |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token (R2 + API Tokens) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |

> **Rule of thumb:** If a value is safe to ship in a client bundle, prefix it with `VITE_`. Everything else stays unprefixed and is only accessible server-side.

## Dev Commands

```sh
bun run dev            # start everything
bun run dev:api        # just the API
bun run dev:web        # just the web app
bun run dev:desktop    # just the desktop app
bun run dev:mobile     # just the mobile app
```
