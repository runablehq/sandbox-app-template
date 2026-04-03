# API & Database

## Overview

`packages/api` is a Hono server running on Bun (port 3000) with Drizzle ORM + Turso (SQLite).

Two entry points:
- `index.ts` — server entry (`bun --hot index.ts`)
- `src/app.ts` — app definition + `AppType` export (consumed by web/mobile as a package)

## Adding API Routes

All routes **must** be chained on the same `app` instance in `src/app.ts`. Breaking the chain breaks type inference for consumers.

```ts
// src/app.ts
import { Hono } from "hono";
import { db } from "./db";
import * as schema from "./db/schema";

const app = new Hono()
  .get("/health", (c) => c.json({ status: "ok" }, 200))
  .get("/users", async (c) => {
    const users = await db.select().from(schema.users);
    return c.json({ users }, 200);
  })
  .post("/users", async (c) => {
    const body = await c.req.json();
    const user = await db.insert(schema.users).values(body).returning();
    return c.json({ user }, 201);
  });

export type AppType = typeof app;
export default app;
```

**Critical:** Always pass explicit status codes — `c.json(data, 200)`, never `c.json(data)`. Without this, the typed RPC client resolves response types to `never`.

## Organizing Routes

For larger APIs, use Hono's `.route()` to compose sub-routers. Each sub-router must also be chained:

```ts
// src/routes/users.ts
import { Hono } from "hono";

export const users = new Hono()
  .get("/", async (c) => { /* list */ })
  .post("/", async (c) => { /* create */ })
  .get("/:id", async (c) => { /* get by id */ });

// src/app.ts
import { users } from "./routes/users";

const app = new Hono()
  .route("/users", users)
  .get("/health", (c) => c.json({ status: "ok" }, 200));
```

## Database Schema

Define tables in `packages/api/src/db/schema.ts`:

```ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
```

## Database Commands

```bash
cd packages/api
bun run db:push        # Push schema to database
bun run db:generate    # Generate migration files
bun run db:migrate     # Run migrations
bun run db:studio      # Open Drizzle Studio
```

## Using the Database

```ts
import { db } from "./db";
import * as schema from "./db/schema";
import { eq } from "drizzle-orm";

// Select
const users = await db.select().from(schema.users);
const user = await db.select().from(schema.users).where(eq(schema.users.id, 1));

// Insert
const [newUser] = await db.insert(schema.users).values({ name: "Alice", email: "alice@example.com" }).returning();

// Update
await db.update(schema.users).set({ name: "Bob" }).where(eq(schema.users.id, 1));

// Delete
await db.delete(schema.users).where(eq(schema.users.id, 1));
```

## Middleware

```ts
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";

const logger = createMiddleware(async (c, next) => {
  console.log(`${c.req.method} ${c.req.url}`);
  await next();
});

const app = new Hono()
  .use("*", logger)
  .get("/health", (c) => c.json({ status: "ok" }, 200));
```

## Environment Variables

API-only (unprefixed): `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `BETTER_AUTH_SECRET`, `AI_GATEWAY_BASE_URL`, `AI_GATEWAY_API_KEY`, `AUTUMN_SECRET_KEY`.

Bun loads `.env` automatically — no dotenv needed.

## Running

```bash
cd packages/api
bun dev          # Hot-reload dev server on :3000
bun start        # Production start
```
