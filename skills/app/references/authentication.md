# Authentication

We use [Better Auth](https://www.better-auth.com) for authentication.

**Pinned version:** `better-auth@1.4.22`. Do not upgrade to 1.5.x — it breaks `autumn-js`.

Reference docs: [llms.txt](https://www.better-auth.com/llms.txt)

<preflight>
Before wiring, state which auth methods are needed, which routes/screens should be protected, where users land after sign-in, and which provider buttons should be visible. If the user asks for Google/Apple auth, default to Runable managed auth so they do not need provider credentials.
</preflight>

<design_thinking>
Auth pages are the first impression for returning users. Build a real app-native screen that matches the product UI. Do not show a generic Runable login button when the user asked for Google or Apple sign-in; show the provider labels the user expects.
</design_thinking>

## Default: Runable Managed Auth

Generated apps should use Runable managed auth by default for OAuth providers. The app renders its own custom UI, owns its own Better Auth session, and uses Runable only as the managed OAuth broker.

Generated apps use bearer tokens for application API calls. Do not rely on Better Auth's session cookies as the long-lived app auth mechanism. OAuth redirects may create a Better Auth session cookie as a browser handoff; immediately capture the session token after the callback and store it as the bearer token.

Use these provider ids:

```txt
runable-google  -> user-facing "Continue with Google"
runable-apple   -> user-facing "Continue with Apple"
runable         -> user-facing "Continue with Runable" only when explicitly requested
```

The app must not ask the user for Google or Apple client credentials for this default flow. Runable provisions these env vars during app creation:

```bash
RUNABLE_AUTH_ISSUER=
RUNABLE_AUTH_CLIENT_ID=
RUNABLE_AUTH_CLIENT_SECRET=
```

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
import { bearer, genericOAuth } from "better-auth/plugins";
import { expo } from "@better-auth/expo";
import { db } from "./database";

const runableIssuer = process.env.RUNABLE_AUTH_ISSUER;
const runableClientId = process.env.RUNABLE_AUTH_CLIENT_ID;
const runableClientSecret = process.env.RUNABLE_AUTH_CLIENT_SECRET;

if (!runableIssuer || !runableClientId || !runableClientSecret) {
  throw new Error("Missing Runable managed auth environment variables");
}

const runableOAuthUrl = (path: string) => new URL(path, `${runableIssuer}/`).toString();

const createRunableProvider = (providerId: string, authorizationPath: string) => ({
  providerId,
  clientId: runableClientId,
  clientSecret: runableClientSecret,
  authorizationUrl: runableOAuthUrl(authorizationPath),
  tokenUrl: runableOAuthUrl("oauth2/token"),
  userInfoUrl: runableOAuthUrl("oauth2/userinfo"),
  issuer: runableIssuer,
  scopes: ["openid", "email", "profile"],
  authentication: "basic" as const,
  pkce: true,
});

export const auth = betterAuth({
  basePath: "/api/auth",
  baseURL: process.env.WEBSITE_URL,
  database: drizzleAdapter(db, { provider: "sqlite" }),
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
        createRunableProvider("runable-google", "managed/oauth/google/authorize"),
        createRunableProvider("runable-apple", "managed/oauth/apple/authorize"),
        createRunableProvider("runable", "oauth2/authorize"),
      ],
    }),
  ],
});
```

`bearer()` is used for token-based auth in cross-origin previews. `expo()` handles native mobile CSRF behavior. `genericOAuth()` lets the app create its own session from Runable managed OAuth callbacks.

Use local email/password only when the user explicitly asks for app-owned email/password auth.

## 3. Generate Auth Schema

The CLI uses jiti, not Bun env loading. Pass env vars inline. Run generate before adding `export * from "./auth-schema"` to `schema.ts`.

```bash
cd packages/web
DATABASE_URL=$DATABASE_URL BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET RUNABLE_AUTH_ISSUER=$RUNABLE_AUTH_ISSUER RUNABLE_AUTH_CLIENT_ID=$RUNABLE_AUTH_CLIENT_ID RUNABLE_AUTH_CLIENT_SECRET=$RUNABLE_AUTH_CLIENT_SECRET bun x @better-auth/cli@latest generate --config=./src/api/auth.ts --output=./src/api/database/auth-schema.ts -y
```

After the schema file is generated, re-export from `src/api/database/schema.ts`:

```ts
export * from "./auth-schema";
```

Then push: `bun run db:push`

## 4. Mount Auth in Hono

Auth must be mounted before `.basePath()` so Better Auth receives the full `/api/auth/*` path. Use `.on()` with single `*` wildcard.

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

`exposeHeaders: ["set-auth-token"]` is required so JavaScript can read the bearer token from direct auth responses.

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

export function captureToken(ctx: { response: Response }) {
  const token = ctx.response.headers.get("set-auth-token");
  if (token) localStorage.setItem(TOKEN_KEY, token);
}

export async function captureTokenFromSessionCookie() {
  const { data } = await authClient.getSession({
    fetchOptions: { credentials: "include" },
  });
  const token = data?.session.token;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  return Boolean(token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}
```

The Hono typed API client (`hc`) needs its own bearer token headers:

```ts
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

Use provider-labeled buttons in custom UI:

```tsx
await authClient.signIn.oauth2({
  providerId: "runable-google",
  callbackURL: "/auth/callback?to=/dashboard",
});

await authClient.signIn.oauth2({
  providerId: "runable-apple",
  callbackURL: "/auth/callback?to=/dashboard",
});
```

Only render `Continue with Runable` when the user explicitly asks for Runable account sign-in:

```tsx
await authClient.signIn.oauth2({
  providerId: "runable",
  callbackURL: "/auth/callback?to=/dashboard",
});
```

Redirect-based OAuth does not expose the final callback response headers to the button click handler. Add an auth callback page that exchanges the temporary Better Auth cookie for the bearer token:

```tsx
import { useEffect } from "react";
import { useLocation } from "wouter";
import { captureTokenFromSessionCookie } from "../lib/auth";

export function AuthCallbackPage() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextPath = params.get("to") || "/";

    void captureTokenFromSessionCookie().then((captured) => {
      navigate(captured ? nextPath : "/sign-in");
    });
  }, [navigate]);

  return <div>Signing you in...</div>;
}
```

## 7. Mobile Auth Client

Create `packages/mobile/lib/auth.ts`.

Mobile can share the same Runable provider ids, but native OAuth requires a registered callback/deep link for the mobile app. Use web/desktop managed auth first unless the user explicitly asks for mobile login.

```ts
import { createAuthClient } from "better-auth/react";
import { genericOAuthClient } from "better-auth/client/plugins";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

const isWeb = Platform.OS === "web";
const TOKEN_KEY = "bearer_token";

const baseURL = Constants.expoConfig?.extra?.apiUrl ?? process.env.EXPO_PUBLIC_API_URL;

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
  plugins: [genericOAuthClient()],
  fetchOptions: {
    ...(isWeb ? { credentials: "omit" as const } : {}),
    auth: {
      type: "Bearer",
      token: () => getToken(),
    },
    headers: isWeb ? {} : { "expo-origin": "mobile://" },
  },
});

export function captureToken(ctx: { response: Response }) {
  const token = ctx.response.headers.get("set-auth-token");
  if (token) setToken(token);
}

export async function clearToken() {
  await removeToken();
}
```

## 8. Protected Routes

### Web

```tsx
import { Redirect } from "wouter";
import { authClient } from "../lib/auth";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return <div>Loading...</div>;
  if (!session) return <Redirect to="/sign-in" />;

  return <>{children}</>;
}
```

### Mobile

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
