# sandbox-platform-template

## Environment Variables

All environment variables are defined in `.env` files at the project root.

| Prefix | Scope | Example |
| ------ | ----- | ------- |
| `VITE_` | **Public** — exposed to web, desktop, and mobile clients | `VITE_API_URL`, `VITE_POSTHOG_KEY` |
| _(none)_ | **Private** — available only in `packages/api` | `DATABASE_URL`, `JWT_SECRET` |

> **Rule of thumb:** If a value is safe to ship in a client bundle, prefix it with `VITE_`. Everything else stays unprefixed and is only accessible server-side in the API.
