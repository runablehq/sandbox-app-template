# Authentication

We use [Better Auth](https://www.better-auth.com) for authentication.

**Pinned version:** `better-auth@1.4.22`. Do not upgrade to 1.5.x — it breaks `autumn-js`.

Reference docs: [llms.txt](https://www.better-auth.com/llms.txt)

<preflight>
Before wiring, state your assumptions about which auth methods are needed (email/password, OAuth, magic link), which routes/screens should be protected, where users land after sign-in, and whether sign-in/sign-up are separate pages or a single page with tabs. The user will correct what's wrong.
</preflight>

## OAuth Provider Policy

For Google, Apple, and Microsoft login, default to Runable managed auth. Do not ask the user for Google/Apple/Microsoft OAuth credentials unless they explicitly need their own provider app. If they ask to bring their own credentials, briefly push back: Runable managed auth avoids provider setup and is the simplest path; use custom credentials only for custom branding, custom scopes, compliance, or owning the provider app.

For every other OAuth provider, or when the user insists on custom credentials, use Better Auth's official SDK/provider options and keep all provider secrets in `.env`.

<design_thinking>
Auth pages are the first impression for returning users — match the app's visual language, don't ship barebones forms. Error states matter as much as the happy path. Loading and redirect transitions should feel instant.
</design_thinking>

## 1. Install

```bash
cd packages/web && bun add better-auth@1.4.22 @better-auth/expo@1.4.22
cd packages/mobile && bun add better-auth@1.4.22 expo-secure-store
```

## 2. Auth Config

Create `packages/web/src/api/auth.ts`.

`basePath` must be `/api/auth`. Auth routes are served by the Hono app under the `/api` basePath, so Better Auth receives requests at `/api/auth/...`.

```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";
import { expo } from "@better-auth/expo";
import { db } from "./database";

export const auth = betterAuth({
  basePath: "/api/auth",
  baseURL: process.env.WEBSITE_URL,
  database: drizzleAdapter(db, { provider: "sqlite" }),
  emailAndPassword: { enabled: true },
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: (request) => {
    const origin = request?.headers.get("origin");
    return origin ? [origin] : ["*"];
  },
  plugins: [bearer(), expo()],
});
```

`bearer()` — token-based auth for cross-origin iframes. `expo()` — CSRF handling for native mobile clients.

`baseURL` is set from `WEBSITE_URL` env var. Required for OAuth callbacks and production. Do **not** import JSON config files in this file — the Better Auth CLI uses jiti which cannot resolve them.

### Managed Google, Apple, Microsoft Login

When the user wants Google, Apple, or Microsoft login, add Runable managed auth via Better Auth's generic OAuth plugin instead of asking for provider credentials.

#### Env vars (root `.env`)

Generated Runable apps should already receive these values. If they are missing in local development, put them in the project root `.env`; never use `.env.local`.

```bash
RUNABLE_AUTH_ISSUER=
RUNABLE_AUTH_CLIENT_ID=
RUNABLE_AUTH_CLIENT_SECRET=
```

Vite loads root `.env` into `process.env` for API code, so read these directly in `packages/web/src/api/auth.ts`.

Update `packages/web/src/api/auth.ts`:

```ts
import { genericOAuth } from "better-auth/plugins/generic-oauth";

const RUNABLE_AUTH_ISSUER = process.env.RUNABLE_AUTH_ISSUER!;
const RUNABLE_AUTH_CLIENT_ID = process.env.RUNABLE_AUTH_CLIENT_ID!;
const RUNABLE_AUTH_CLIENT_SECRET = process.env.RUNABLE_AUTH_CLIENT_SECRET!;

export const auth = betterAuth({
  basePath: "/api/auth",
  baseURL: process.env.WEBSITE_URL,
  database: drizzleAdapter(db, { provider: "sqlite" }),
  emailAndPassword: { enabled: true },
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: (request) => {
    const origin = request?.headers.get("origin");
    return origin ? [origin] : ["*"];
  },
  plugins: [
    bearer(),
    expo(),
    genericOAuth({
      config: [
        {
          providerId: "runable-google",
          authorizationUrl: `${RUNABLE_AUTH_ISSUER}/managed/oauth/google/authorize`,
          tokenUrl: `${RUNABLE_AUTH_ISSUER}/oauth2/token`,
          userInfoUrl: `${RUNABLE_AUTH_ISSUER}/oauth2/userinfo`,
          clientId: RUNABLE_AUTH_CLIENT_ID,
          clientSecret: RUNABLE_AUTH_CLIENT_SECRET,
          scopes: ["openid", "email", "profile"],
          pkce: true,
          authentication: "basic",
        },
        {
          providerId: "runable-apple",
          authorizationUrl: `${RUNABLE_AUTH_ISSUER}/managed/oauth/apple/authorize`,
          tokenUrl: `${RUNABLE_AUTH_ISSUER}/oauth2/token`,
          userInfoUrl: `${RUNABLE_AUTH_ISSUER}/oauth2/userinfo`,
          clientId: RUNABLE_AUTH_CLIENT_ID,
          clientSecret: RUNABLE_AUTH_CLIENT_SECRET,
          scopes: ["openid", "email", "profile"],
          pkce: true,
          authentication: "basic",
        },
        {
          providerId: "runable-microsoft",
          authorizationUrl: `${RUNABLE_AUTH_ISSUER}/managed/oauth/microsoft/authorize`,
          tokenUrl: `${RUNABLE_AUTH_ISSUER}/oauth2/token`,
          userInfoUrl: `${RUNABLE_AUTH_ISSUER}/oauth2/userinfo`,
          clientId: RUNABLE_AUTH_CLIENT_ID,
          clientSecret: RUNABLE_AUTH_CLIENT_SECRET,
          scopes: ["openid", "email", "profile"],
          pkce: true,
          authentication: "basic",
        },
      ],
    }),
  ],
});
```

For all non-managed social providers, use Better Auth's official provider configuration with the user's credentials.

## 3. Generate Auth Schema

The CLI uses jiti (not bun env loading). Pass env vars inline. Run generate BEFORE adding `export * from "./auth-schema"` to `schema.ts` — the CLI fails if the target file doesn't exist yet.

```bash
cd packages/web
DATABASE_URL=$DATABASE_URL BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET bun x @better-auth/cli@latest generate --config=./src/api/auth.ts --output=./src/api/database/auth-schema.ts -y
```

After the schema file is generated, re-export from `src/api/database/schema.ts`:

```ts
export * from "./auth-schema";
```

Then push: `bun run db:push`

## 4. Mount Auth in Hono

Auth must be mounted **before** `.basePath()` so Better Auth receives the full `/api/auth/*` path. Use `.on()` with single `*` wildcard (Hono v4 uses `*` not `**`):

```ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth";

const app = new Hono()
  .use(cors({ origin: (origin) => origin ?? "*", credentials: true, exposeHeaders: ["set-auth-token"] }))
  .on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw))
  .basePath("api")
  .get("/health", (c) => c.json({ status: "ok" }, 200));

export type AppType = typeof app;
export default app;
```

`exposeHeaders: ["set-auth-token"]` is required so the browser allows JavaScript to read the bearer token from the response header.

## 5. Auth Middleware

Create `packages/web/src/api/middleware/auth.ts`:

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
  if (!c.get("user")) return c.json({ message: "Unauthorized" }, 401);
  return next();
});
```

## 6. Web Auth Client

Create `packages/web/src/web/lib/auth.ts`:

```ts
import { createAuthClient } from "better-auth/react";
import { genericOAuthClient } from "better-auth/client/plugins";

export const TOKEN_KEY = "bearer_token";

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? "";
}

export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: "/api/auth",
  plugins: [genericOAuthClient()],
  fetchOptions: {
    auth: {
      type: "Bearer",
      token: () => localStorage.getItem(TOKEN_KEY) ?? "",
    },
  },
});

/** Call in onSuccess of signIn/signUp to capture the bearer token */
export function captureToken(ctx: { response: Response }) {
  const token = ctx.response.headers.get("set-auth-token");
  if (token) localStorage.setItem(TOKEN_KEY, token);
}

/** Clear stored token on sign-out */
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}
```

The Hono typed API client (`hc`) does NOT use the authClient's fetch — it needs its own bearer token headers:

```ts
// packages/web/src/web/lib/api.ts
import { hc } from "hono/client";
import type { AppType } from "../../api";
import { getToken } from "./auth";

const client = hc<AppType>("/", {
  headers: () => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
});
export const api = client.api;
```

Usage:

```tsx
await authClient.signUp.email({ name, email, password }, { onSuccess: captureToken });
await authClient.signIn.email({ email, password }, { onSuccess: captureToken });
await authClient.signOut();
clearToken();
const { data: session, isPending } = authClient.useSession();
```

Managed OAuth usage:

```tsx
await authClient.signIn.oauth2({
  providerId: "runable-google",
  callbackURL: window.location.origin,
  newUserCallbackURL: window.location.origin,
});
```

Use provider IDs `runable-google`, `runable-apple`, or `runable-microsoft`.

## 7. Mobile Auth Client

Create `packages/mobile/lib/auth.ts`:

Mobile must work in both Expo Go (native) and Expo Web. Uses `expo-secure-store` on native (encrypted), falls back to `localStorage` on web via try/catch. Platform-specific fetch options handle CORS and CSRF differences.

```ts
import { createAuthClient } from "better-auth/react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

const isWeb = Platform.OS === "web";
const TOKEN_KEY = "bearer_token";

const baseURL =
  Constants.expoConfig?.extra?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL;

export function getToken(): string {
  try {
    return SecureStore.getItem(TOKEN_KEY) ?? "";
  } catch {
    return localStorage.getItem(TOKEN_KEY) ?? "";
  }
}

function setToken(token: string) {
  try {
    SecureStore.setItem(TOKEN_KEY, token);
  } catch {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

async function removeToken() {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export const authClient = createAuthClient({
  baseURL,
  basePath: "/api/auth",
  fetchOptions: {
    ...(isWeb ? { credentials: "omit" as const } : {}),
    auth: {
      type: "Bearer",
      token: () => getToken(),
    },
    headers: isWeb ? {} : { "expo-origin": "mobile://" },
  },
});

/** Call in onSuccess of signIn/signUp to capture the bearer token */
export function captureToken(ctx: { response: Response }) {
  const token = ctx.response.headers.get("set-auth-token");
  if (token) setToken(token);
}

/** Clear stored token on sign-out */
export async function clearToken() {
  await removeToken();
}
```

Platform differences:
- **Native (Expo Go)**: cookies work normally, `expo-origin` header passes CSRF check, SecureStore for token storage
- **Web (Expo Web)**: `credentials: "omit"` skips cookies to avoid CORS preflight issues, `localStorage` for token storage

```ts
// packages/mobile/lib/api.ts
import { hc } from "hono/client";
import Constants from "expo-constants";
import type { AppType } from "@template/web";
import { getToken } from "./auth";

const baseUrl = Constants.expoConfig?.extra?.apiUrl ?? process.env.EXPO_PUBLIC_API_URL;
const client = hc<AppType>(baseUrl!, {
  headers: () => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
});
export const api = client.api;
```

## 8. Protected Routes

### Web (Wouter)

```tsx
// src/web/components/protected-route.tsx
import { Redirect } from "wouter";
import { authClient } from "../lib/auth";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return <div>Loading...</div>;
  if (!session) return <Redirect to="/sign-in" />;

  return <>{children}</>;
}

// In app.tsx:
<Route path="/dashboard">
  <ProtectedRoute>
    <DashboardPage />
  </ProtectedRoute>
</Route>
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
