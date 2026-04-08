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

Create `packages/web/src/auth.ts`. Since the API and web are served from the same origin, `trustedOrigins` only needs the server URL. Set `basePath` to `/auth` because the Hono app receives requests with the `/api` prefix already stripped:

```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import appConfig from "../../app.config.json";

export const auth = betterAuth({
  basePath: "/auth",
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
  },
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [
    `http://localhost:${appConfig.services.api.port}`,
  ],
});
```

## 3. Generate Auth Schema

```bash
cd packages/web
bun x @better-auth/cli@latest generate --config=./src/auth.ts --output=./src/db/auth-schema.ts -y
```

Then import and re-export from `src/db/schema.ts`, and run `bun run db:push`.

## 4. Mount Auth Routes

In `packages/web/src/api/app.ts`. Note: routes are defined without `/api` prefix (it's stripped by `src/index.ts`):

```ts
import { auth } from "./auth";

const app = new Hono()
  .on(["POST", "GET"], "/auth/**", (c) => auth.handler(c.req.raw))
  .get("/health", (c) => c.json({ status: "ok" }, 200));
```

The auth endpoints are accessible at `/api/auth/**` from the browser.

## 5. Auth Middleware

Create `packages/web/src/middleware/auth.ts`:

```ts
import { createMiddleware } from "hono/factory";
import { auth } from "../auth";

export const authMiddleware = createMiddleware(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  return next();
});

export const requireAuth = createMiddleware(async (c, next) => {
  const user = c.get("user");
  if (!user) return c.json({ message: "Unauthorized" }, 401);
  return next();
});
```

## 6. Web Auth Client

Create `packages/web/src/client/lib/auth.ts`. Since web and API are same origin, use a relative base URL:

```ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: "/api",
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
import appConfig from "../../app.config.json";

export const authClient = createAuthClient({
  baseURL: `http://localhost:${appConfig.services.api.port}/api`,
  basePath: "/auth",
});
```

Same API as web — `authClient.signIn.email()`, `authClient.useSession()`, etc.

## 8. Protected Routes

### Web (TanStack Router)

```tsx
// web/routes/__root.tsx
import { authClient } from "../lib/auth";

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    const { data: session } = await authClient.getSession();
    if (!session && location.pathname !== "/sign-in") {
      throw redirect({ to: "/sign-in" });
    }
  },
  component: () => <Outlet />,
});
```

### Mobile (Expo Router)

```tsx
// app/_layout.tsx
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
