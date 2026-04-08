# Web

## Overview

The web frontend lives in `packages/web/web/` and is served by the same Bun.serve process as the API. Bun's HTML imports handle bundling, HMR, and serving — no separate dev server needed. Uses React, TanStack Router (file-based routing), and typed API calls via `@softnetics/hono-react-query`.

This is the **single UI codebase** — it also runs inside the desktop Electron shell.

## Project Structure

```
packages/web/
  index.ts                       Server entry (Bun.serve — API + web)
  index.html                     Frontend HTML entry (imported by index.ts)
  src/                           API source
    app.ts                       Hono routes + AppType export
    db/                          Database (schema, client)
  web/                      Frontend source
    main.tsx                     App entry (QueryClientProvider + RouterProvider)
    routeTree.gen.ts             Generated route tree
    routes/
      __root.tsx                 Root layout (wraps all pages)
      index.tsx                  / page
      about.tsx                  /about page
      users/
        index.tsx                /users page
        $id.tsx                  /users/:id page
    hooks/
      use-desktop.ts             Desktop detection hook
    lib/
      api.ts                     Typed API client (baseUrl: "/api")
      desktop.ts                 ElectronAPI types + detection helpers
```

## Adding Pages

Create files in `web/routes/`. TanStack Router uses file-based routing.

After adding a new route file, regenerate the route tree:

```bash
cd packages/web && bunx @tanstack/router-cli generate
```

```tsx
// web/routes/about.tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

function AboutPage() {
  return <h1>About</h1>;
}
```

### Dynamic routes

```tsx
// web/routes/users/$id.tsx
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../lib/api";

export const Route = createFileRoute("/users/$id")({
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
// web/routes/__root.tsx
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

The API client is set up in `web/lib/api.ts` with a relative baseUrl of `/api` (same origin):

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

Available desktop APIs: `showOpenDialog`, `showSaveDialog`, `readFile`, `writeFile`, `showNotification`, `minimize`, `maximize`, `close`, `onDeepLink`. See `web/lib/desktop.ts` for full types.
