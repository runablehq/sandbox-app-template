# web

Unified server — serves both the Hono API under `/api` and the React frontend from a single Bun.serve process.

## Run

```bash
bun run dev
```

The server port is read from the root `app.config.json`.

## Typecheck and build

```bash
bun run typecheck
bun run build
```
