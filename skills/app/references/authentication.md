# Authentication

We use [Better Auth](https://www.better-auth.com) for authentication.

**Pinned version:** `better-auth@1.4.22`. Do not upgrade to 1.5.x — it breaks `autumn-js`.

Reference docs: [llms.txt](https://www.better-auth.com/llms.txt)

<preflight>
Before wiring, state your assumptions about which auth methods are needed (email/password, OAuth, magic link), which routes/screens should be protected, where users land after sign-in, and whether sign-in/sign-up are separate pages or a single page with tabs. The user will correct what's wrong.
</preflight>

## 1. Install

```bash
cd packages/web && bun add better-auth@1.4.22
cd packages/mobile && bun add better-auth@1.4.22
```

## 2. Auth Config

Create `packages/web/src/api/auth.ts`.

```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import appConfig from "../../../../app.config.json";
import { db } from "./database";

export const createAuth = (baseURL: string) =>
  betterAuth({
    basePath: "/auth",
    baseURL,
    database: drizzleAdapter(db, {
      provider: "sqlite",
    }),
    emailAndPassword: {
      enabled: true,
    },
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: async (request) => {
      const origin = request?.headers.get("origin");
      if (origin) return [origin];
      return [`http://localhost:${appConfig.services.website.port}`];
    },
  });

// Static export for CLI schema generation only (uses the local dev server port).
export const auth = createAuth(`http://localhost:${appConfig.services.website.port}/api`);
```

**Key points:**
- `basePath: "/auth"` — routes are `/auth/**` inside Hono (accessible at `/api/auth/**` from the browser).
- `baseURL` — must include `/api` because that's where the auth endpoints live from the client's perspective. The factory builds this from the request origin + `/api`.
- `trustedOrigins` — dynamic function so it works for every client (web, mobile, desktop, production) without hardcoding each one.
- The static `auth` export exists only so `@better-auth/cli` can read the config for schema generation.

## 3. Generate Auth Schema

```bash
cd packages/web
bun x @better-auth/cli@latest generate --config=./src/api/auth.ts --output=./src/api/database/auth-schema.ts -y
```

Then import and re-export from `src/api/database/schema.ts`, and run `bun run db:push`.

## 4. Mount Auth Routes

In `packages/web/src/api/app.ts`. The handler must derive `baseURL` from the **original** request origin, not the rewritten URL:

```ts
import { Hono } from "hono";
import { createAuth } from "./auth";

const app = new Hono()
  .on(["POST", "GET"], "/auth/**", (c) => {
    const origin = new URL(c.req.raw.url);
    const baseURL = `${origin.protocol}//${origin.host}/api`;
    const auth = createAuth(baseURL);
    return auth.handler(c.req.raw);
  })
  .get("/health", (c) => c.json({ status: "ok" }, 200));
```

> **Note:** The Hono handler receives the rewritten URL (without `/api`), but `origin.protocol` and `origin.host` are still correct. We append `/api` to reconstruct the real base URL that clients use.

The auth endpoints are accessible at `/api/auth/**` from the browser.

## 5. Auth Middleware

Create `packages/web/src/api/middleware/auth.ts`:

```ts
import { createMiddleware } from "hono/factory";
import { createAuth } from "../auth";

const getBaseURL = (request: Request) => {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}/api`;
};

// Attaches session and user to Hono context if authenticated.
export const authMiddleware = createMiddleware(async (c, next) => {
  const auth = createAuth(getBaseURL(c.req.raw));
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  return next();
});

// Use on routes that require authentication.
export const requireAuth = createMiddleware(async (c, next) => {
  const user = c.get("user");
  if (!user) return c.json({ message: "Unauthorized" }, 401);
  return next();
});
```

## 6. Web Auth Client

Create `packages/web/src/client/lib/auth.ts`. Uses `window.location.origin` so it works in dev, production, and desktop (Electron loads from the same origin):

```ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: window.location.origin + "/api",
  basePath: "/auth",
});
```

Use in components:

```tsx
import { authClient } from "../lib/auth";

// Sign in
await authClient.signIn.email({ email, password });

// Sign up
await authClient.signUp.email({ name, email, password });

// Sign out
await authClient.signOut();

// Get session (hook)
const { data: session } = authClient.useSession();
```

## 7. Mobile Auth Client

Create `packages/mobile/lib/auth.ts`:

```ts
import { createAuthClient } from "better-auth/react";
import { Platform } from "react-native";
import appConfig from "../../../app.config.json";

const websitePort = appConfig.services.website.port;
const baseURL = Platform.select({
  android: `http://10.0.2.2:${websitePort}/api`,
  default: `http://localhost:${websitePort}/api`,
});

export const authClient = createAuthClient({
  baseURL,
  basePath: "/auth",
});
```

Same API as web — `authClient.signIn.email()`, `authClient.useSession()`, etc.

## 8. Authentication Pages

Add sign-in and sign-up pages in `packages/web/src/client/routes/`.

Use the Better Auth client methods:
- Sign in: `authClient.signIn.email({ email, password })`
- Sign up: `authClient.signUp.email({ name, email, password })`

Design requirement:
- Do not ship barebones forms.
- Match the existing visual language of the app.
- Error states matter — show clear, specific messages (not "something went wrong").
- Loading and redirect transitions should feel instant, not jarring.

## 9. Protected Routes

### Web (TanStack Router)

```tsx
// packages/web/src/client/routes/__root.tsx
import { authClient } from "../lib/auth";

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    const { data: session } = await authClient.getSession();
    if (!session && location.pathname !== "/sign-in" && location.pathname !== "/sign-up") {
      throw redirect({ to: "/sign-in" });
    }
  },
  component: () => <Outlet />,
});
```

### Mobile (Expo Router)

```tsx
// packages/mobile/app/_layout.tsx
import { useRouter, useSegments } from "expo-router";
import { authClient } from "../lib/auth";
import { useEffect } from "react";

export default function RootLayout() {
  const { data: session, isPending } = authClient.useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isPending) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!session && !inAuthGroup) router.replace("/sign-in");
    if (session && inAuthGroup) router.replace("/");
  }, [session, isPending]);

  return <Slot />;
}
```
