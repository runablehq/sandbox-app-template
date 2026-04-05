# sandbox-platform-template

## Environment Variables

All environment variables are defined in `.env` at the project root. Bun, Vite, and Expo all load it automatically.

### Service Ports

| Variable | Default | Used by |
| --- | --- | --- |
| `VITE_API_PORT` | `3000` | `packages/api`, `packages/web`, `packages/mobile` |
| `WEB_PORT` | `5173` | `packages/desktop` (Electron dev URL) |
| `DESKTOP_PORT` | `5174` | `packages/desktop` |
| `MOBILE_PORT` | `8081` | `packages/mobile` |

### Secrets

| Variable | Scope | Description |
| --- | --- | --- |
| `TURSO_TOKEN` | Private | Turso platform API token |
| `CLOUDFLARE_API_TOKEN` | Private | Cloudflare API token (R2 + API Tokens) |
| `CLOUDFLARE_ACCOUNT_ID` | Private | Cloudflare account ID |

> **Rule of thumb:** If a value is safe to ship in a client bundle, prefix it with `VITE_`. Everything else stays unprefixed and is only accessible server-side.
