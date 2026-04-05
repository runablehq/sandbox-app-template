# Web

## Overview

`packages/web` is a React + Vite app with TanStack Router (file-based routing) and typed API calls via `@softnetics/hono-react-query`. Port is set in `app.config.json` and injected via `vite.config.ts`.

This is the **single UI codebase** — it also runs inside the desktop Electron shell.

## Project Structure

```
packages/web/
  src/
    main.tsx                 App entry (QueryClientProvider + RouterProvider)
    routes/
      __root.tsx             Root layout (wraps all pages)
      index.tsx              / page
      about.tsx              /about page
      users/
        index.tsx            /users page
        $id.tsx              /users/:id page
    hooks/
      use-desktop.ts         Desktop detection hook
    lib/
      api.ts                 Typed API client
      desktop.ts             ElectronAPI types + detection helpers
  index.html
  vite.config.ts
```

## Adding Pages

Create files in `src/routes/`. TanStack Router auto-generates the route tree.

```tsx
// src/routes/about.tsx
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
// src/routes/users/$id.tsx
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
// src/routes/__root.tsx
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

The API client is set up in `src/lib/api.ts`. The API port comes from `app.config.json` via Vite's `define` (available as `__APP_CONFIG__` at build time).

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

Available desktop APIs: `showOpenDialog`, `showSaveDialog`, `readFile`, `writeFile`, `showNotification`, `minimize`, `maximize`, `close`, `onDeepLink`. See `src/lib/desktop.ts` for full types.
