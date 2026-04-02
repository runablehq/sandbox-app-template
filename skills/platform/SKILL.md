---
name: platform
description: Use for any cross-platform app task — building web apps, mobile apps, desktop apps, API routes, or database schema. Read the relevant reference file for the specific platform or capability being worked on.
---

# Platform

Cross-platform app template: Hono API + React web + Expo mobile + Electron desktop.

## Architecture

```
packages/
  api/        Hono on Bun (:3000). Drizzle ORM + Turso. Exports AppType for typed RPC.
  web/        React + Vite + TanStack Router. Also runs inside desktop's Electron shell.
  mobile/     Expo + React Native + expo-router.
  desktop/    Thin Electron shell. Loads web app. Exposes native APIs via IPC bridge.
```

Monorepo: Bun workspaces + Turborepo. Run `turbo dev` from root.

## Routing to References

Read the reference that matches the task before implementing:

- Building API routes or database tables → [references/api.md](references/api.md)
- Building web pages or components → [references/web.md](references/web.md)
- Building mobile screens → [references/mobile.md](references/mobile.md)
- Building desktop-native features → [references/desktop.md](references/desktop.md)
- Adding authentication → [references/authentication.md](references/authentication.md)
- Adding payments → [references/payments.md](references/payments.md)
- Adding AI agent capabilities → [references/ai-agent.md](references/ai-agent.md)
- Adding email → [references/email.md](references/email.md)

Multiple references can apply to a single task. For example, "add a paid AI chatbot to mobile" means reading api.md, mobile.md, ai-agent.md, and payments.md.

## Preflight

1. Ask questions: what the app does, which platforms (web, mobile, desktop, or all), key features, data model, auth/payment needs.
2. Form a plan. State assumptions as decisions — the user corrects what's wrong. Include: packages touched, API routes, database tables, screens/pages.
3. Do not start implementation until the user approves.
