# Authentication

We use [Better Auth](https://www.better-auth.com) for authentication.

**Pinned version:** `better-auth@1.4.22`. Do not upgrade to 1.5.x — it breaks `autumn-js`.

Reference docs: [llms.txt](https://www.better-auth.com/llms.txt)

<preflight>
Before wiring, state your assumptions about which auth methods are needed (email/password, OAuth, magic link), which routes/screens should be protected, where users land after sign-in, and whether sign-in/sign-up are separate pages or a single page with tabs. The user will correct what's wrong.
</preflight>

<design_thinking>
Auth pages are the first impression for returning users — match the app's visual language, don't ship barebones forms. Error states matter as much as the happy path. Loading and redirect transitions should feel instant.
</design_thinking>

## 1. Install

```bash
cd packages/web && bun add better-auth@1.4.22
cd packages/mobile && bun add better-auth@1.4.22
```

## 2. Auth Config

Create `packages/web/src/api/auth.ts`.

`basePath` must be `/api/auth` and `baseURL` must be just the origin (e.g., `http://localhost:3000`). Auth is handled in `src/index.ts` before the `/api` prefix is stripped, so Better Auth receives the original request URL with `/api/auth/...` intact.

```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import appConfig from "../../../../app.config.json";
import { db } from "./database";

export const createAuth = (baseURL: string) =>
  betterAuth({
    basePath: "/api/auth",
    baseURL,
    database: drizzleAdapter(db, { provider: "sqlite" }),
    emailAndPassword: { enabled: true },
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: async (request) => {
      const origin = request?.headers.get("origin");
      if (origin) return [origin];
      return [`http://localhost:${appConfig.services.website.port}`];
    },
  });

// Static export for CLI schema generation only.
export const auth = createAuth(`http://localhost:${appConfig.services.website.port}`);
```

## 3. Generate Auth Schema

```bash
cd packages/web
bun x @better-auth/cli@latest generate --config=./src/api/auth.ts --output=./src/api/database/auth-schema.ts -y
```

Re-export from `src/api/database/schema.ts`:

```ts
export * from "./auth-schema";
```

Then push: `bun run db:push`

## 4. Mount Auth in Server

Add to `src/index.ts` in the `fetch()` handler, **before** the `/api` strip block:

```ts
import { createAuth } from "./api/auth";

// Inside fetch(req):
if (url.pathname.startsWith("/api/auth")) {
  const baseURL = `${url.protocol}//${url.host}`;
  const auth = createAuth(baseURL);
  return auth.handler(req);
}
```

**Do NOT mount auth in `app.ts`.** Hono only sees requests after `/api` is stripped. Better Auth needs the full `/api/auth/...` path.

## 5. Auth Middleware

Create `packages/web/src/api/middleware/auth.ts`:

```ts
import { createMiddleware } from "hono/factory";
import { createAuth } from "../auth";

const getBaseURL = (req: Request) => {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
};

export const authMiddleware = createMiddleware(async (c, next) => {
  const auth = createAuth(getBaseURL(c.req.raw));
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  return next();
});

export const requireAuth = createMiddleware(async (c, next) => {
  if (!c.get("user")) return c.json({ message: "Unauthorized" }, 401);
  return next();
});
```

## 6. Web Auth Client

Create `packages/web/src/client/lib/auth.ts`:

```ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: "/api/auth",
});
```

Usage:

```tsx
await authClient.signUp.email({ name, email, password });
await authClient.signIn.email({ email, password });
await authClient.signOut();
const { data: session, isPending } = authClient.useSession();
```

## 7. Mobile Auth Client

Create `packages/mobile/lib/auth.ts`:

```ts
import { createAuthClient } from "better-auth/react";
import { Platform } from "react-native";
import appConfig from "../../../app.config.json";

const websitePort = appConfig.services.website.port;

export const authClient = createAuthClient({
  baseURL: Platform.select({
    android: `http://10.0.2.2:${websitePort}`,
    default: `http://localhost:${websitePort}`,
  }),
  basePath: "/api/auth",
});
```

## 8. Protected Routes

### Web (TanStack Router)

```tsx
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
