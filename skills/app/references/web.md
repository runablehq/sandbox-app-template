# Web

## Overview

The web frontend lives in `packages/web/src/web/` and is served by Vite in development. The API runs in the same process via a Vite plugin. Uses React, Wouter for routing, and typed API calls via `@softnetics/hono-react-query`.

This is the **single UI codebase** — it also runs inside the desktop Electron shell.

## Key Rules

- **Always show a loading state for every API call** — check `isLoading` and render a loader/skeleton before rendering data. For action buttons (submit, save, delete, etc.), show a loading indicator and disable the button while the mutation is pending.

## Project Structure

```
packages/web/
  public/                        Static assets (favicon, images, fonts)
  index.html                     Frontend HTML entry
  vite.config.ts                 Vite config (React, Tailwind, Hono dev plugin)
  vite/plugins/
    hono-dev-plugin.ts           Serves Hono API in dev via Vite middleware
    runable-analytics-plugin.ts  Injects analytics script
  website.config.json            Website metadata (hostname, port)
  src/
    api/                         Backend source
      index.ts                   Hono routes + AppType export
      database/                  Database (schema, client)
    web/                         Frontend source
      main.tsx                   App entry (Router)
      app.tsx                    Root app component (Switch + routes)
      styles.css                 Global styles (Tailwind)
      pages/                     Page components
        index.tsx                / page
      components/                Shared components
        provider.tsx             App providers
        ui/                      UI primitives
      hooks/                     Custom hooks
      lib/                       Utilities
      types/                     Type definitions
```

## Adding Pages

1. Create a page component in `src/web/pages/`:

```tsx
// src/web/pages/about.tsx
export default function AboutPage() {
  return <h1>About</h1>;
}
```

2. Add a route in `src/web/app.tsx`:

```tsx
import { Route, Switch } from "wouter";
import AboutPage from "./pages/about";

function App() {
  return (
    <Switch>
      <Route path="/" component={Index} />
      <Route path="/about" component={AboutPage} />
    </Switch>
  );
}
```

### Dynamic routes

```tsx
// src/web/pages/user.tsx
import { useParams } from "wouter";
import { api } from "../lib/api";

export default function UserPage() {
  const { id } = useParams<{ id: string }>();
  const user = api.useQuery("api/users/:id", "$get", { param: { id } });

  if (user.isLoading) return <div>Loading...</div>;

  return <h1>{(user.data as any)?.data?.name}</h1>;
}

// In app.tsx:
<Route path="/users/:id" component={UserPage} />
```

### Nested layouts

```tsx
// src/web/components/layout.tsx
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav>
        <a href="/">Home</a>
        <a href="/about">About</a>
      </nav>
      {children}
    </div>
  );
}

// In app.tsx, wrap routes:
<Layout>
  <Switch>
    <Route path="/" component={Index} />
    <Route path="/about" component={AboutPage} />
  </Switch>
</Layout>
```

## Typed API Client

The API client uses a base URL without `/api` since Hono's `.basePath('api')` includes it in route type paths:

```ts
// src/web/lib/api.ts
import { createReactQueryClient } from "@softnetics/hono-react-query";
import type { AppType } from "../../api";

export const api = createReactQueryClient<AppType>({
  baseUrl: "",
});
```

### Queries

```tsx
import { api } from "../lib/api";

// GET request — typed input, typed response
const users = api.useQuery("api/users", "$get", {});

// With parameters
const user = api.useQuery("api/users/:id", "$get", { param: { id: "1" } });
```

### Mutations

```tsx
const createUser = api.useMutation("api/users", "$post");

createUser.mutate({ json: { name: "Alice", email: "alice@example.com" } });
```

### Query invalidation

```tsx
const invalidateUsers = api.useInvalidateQueries("api/users", "$get");

// After a mutation succeeds
createUser.mutate(data, {
  onSuccess: () => invalidateUsers(),
});
```

**Note:** Route paths in the typed client include the `api/` prefix (e.g., `"api/health"`, `"api/users"`) because Hono's `.basePath('api')` bakes it into the type.
