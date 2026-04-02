import { Hono } from "hono";

const app = new Hono()
  .get("/", (c) => {
    return c.json({ message: "Hello from Hono!" }, 200);
  })
  .get("/health", (c) => {
    return c.json({ status: "ok" }, 200);
  });

export type AppType = typeof app;
export default app;
