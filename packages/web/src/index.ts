import { join } from "node:path";
import appConfig from "../../../app.config.json";
import app from "./api/app";
import homepage from "./client/index.html";

const publicDir = join(import.meta.dir, "..", "public");
const port = appConfig.services.website.port;

/** Proxy a request to Hono, stripping the /api prefix */
function proxyToHono(req: Request): Response | Promise<Response> {
  const url = new URL(req.url);
  const apiUrl = new URL(url);
  apiUrl.pathname = url.pathname.replace(/^\/api/, "") || "/";
  return app.fetch(new Request(apiUrl.toString(), {
    method: req.method,
    headers: req.headers,
    body: req.body,
  }));
}

Bun.serve({
  port,
  routes: {
    "/api/*": proxyToHono,
    "/favicon.ico": Bun.file(join(publicDir, "favicon.ico")),
    "/og-image.png": Bun.file(join(publicDir, "og-image.png")),
    "/*": homepage,
  },
  development: process.env.NODE_ENV !== "production" ? {
    hmr: true,
    console: true,
  } : false,
});

export type { AppType } from "./api/app";

console.log(`Server running on http://localhost:${port}`);
