# Web

## Overview

The web frontend lives in `packages/web/src/client/` and is served by the same Bun.serve process as the API. Bun's HTML imports handle bundling, HMR, and serving — no separate dev server needed. Uses React, TanStack Router, and typed API calls via `@softnetics/hono-react-query`.

This is the **single UI codebase** — it also runs inside the desktop Electron shell.

## Key Rules

- **Always show a loading state for every API call** — check `isLoading` and render a loader/skeleton before rendering data. For action buttons (submit, save, delete, etc.), show a loading indicator and disable the button while the mutation is pending.

## Project Structure

```
packages/web/
  public/                        Static assets (favicon, images, fonts)
  src/
    index.ts                     Server entry (Bun.serve — API + web)
    api/                         Backend source
      app.ts                     Hono routes + AppType export
      database/                  Database (schema, client)
    client/                      Frontend source
      index.html                 Frontend HTML entry (imported by src/index.ts)
      main.tsx                   App entry (QueryClientProvider + RouterProvider)
      routeTree.gen.ts           Route tree (manual — add new routes here)
      routes/
        __root.tsx               Root layout (wraps all pages)
        index.tsx                / page
      hooks/
        use-desktop.ts           Desktop detection hook
      lib/
        api.ts                   Typed API client (baseUrl: "/api")
        desktop.ts               ElectronAPI types + detection helpers
```

## Adding Pages

1. Create a route file in `src/client/routes/` using `createRoute`:

```tsx
// src/client/routes/about.tsx
import { createRoute } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/about",
  component: AboutPage,
});

function AboutPage() {
  return <h1>About</h1>;
}
```

2. Add it to `routeTree.gen.ts`:

```ts
import { Route as rootRoute } from "./routes/__root"
import { Route as IndexRoute } from "./routes/index"
import { Route as AboutRoute } from "./routes/about"

export const routeTree = rootRoute.addChildren([
  IndexRoute,
  AboutRoute,
])
```

### Dynamic routes

```tsx
// src/client/routes/users/$id.tsx
import { createRoute } from "@tanstack/react-router";
import { Route as rootRoute } from "../__root";
import { api } from "../../lib/api";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/users/$id",
  component: UserPage,
});

function UserPage() {
  const { id } = Route.useParams();
  const user = api.useQuery("/users/:id", "$get", { param: { id } });

  if (user.isLoading) return <div>Loading...</div>;

  return <h1>{user.data?.data.name}</h1>;
}
```

### Layout routes

```tsx
// src/client/routes/__root.tsx
import { createRootRoute, Outlet, Link } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: () => (
    <div>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
      </nav>
      <Outlet />
    </div>
  ),
});
```

## Typed API Client

The API client is set up in `src/client/lib/api.ts` with a relative baseUrl of `/api` (same origin):

```ts
import { createReactQueryClient } from "@softnetics/hono-react-query";
import type { AppType } from "@template/web";

export const api = createReactQueryClient<AppType>({
  baseUrl: "/api",
});
```

### Queries

```tsx
import { api } from "../lib/api";

// GET request — typed input, typed response
const users = api.useQuery("/users", "$get", {});
users.data?.data.users;  // fully typed

// With parameters
const user = api.useQuery("/users/:id", "$get", { param: { id: "1" } });
```

### Mutations

```tsx
const createUser = api.useMutation("/users", "$post");

createUser.mutate({ json: { name: "Alice", email: "alice@example.com" } });
```

### Query invalidation

```tsx
const invalidateUsers = api.useInvalidateQueries("/users", "$get");

// After a mutation succeeds
createUser.mutate(data, {
  onSuccess: () => invalidateUsers(),
});
```

## Desktop-Aware Components

The web app detects when it's running inside Electron via `useDesktop()`:

```tsx
import { useDesktop } from "../hooks/use-desktop";

function SaveButton({ data }: { data: string }) {
  const desktop = useDesktop();

  const handleSave = async () => {
    if (desktop) {
      const path = await desktop.showSaveDialog({ title: "Save file" });
      if (path) await desktop.writeFile(path, data);
    } else {
      const blob = new Blob([data], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "file.txt";
      a.click();
    }
  };

  return <button onClick={handleSave}>Save</button>;
}
```

Available desktop APIs: `showOpenDialog`, `showSaveDialog`, `readFile`, `writeFile`, `showNotification`, `minimize`, `maximize`, `close`, `onDeepLink`. See `src/client/lib/desktop.ts` for full types.
