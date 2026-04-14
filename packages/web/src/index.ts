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
    // API routes — matched before the catch-all due to higher specificity
    "/api/*": proxyToHono,
    // SPA catch-all — serves the HTML bundle for all non-API routes
    // Bun routes are matched by specificity: exact > param > wildcard
    // so "/api/*" always takes priority over "/*"
    "/*": homepage,
  },
  async fetch(req) {
    const url = new URL(req.url);
    const filePath = join(publicDir, url.pathname);
    const file = Bun.file(filePath);
    if (await file.exists()) return new Response(file);
    return new Response("Not Found", { status: 404 });
  },
  development: {
    hmr: true,
    console: true,
  },
});

export type { AppType } from "./api/app";

console.log(`Server running on http://localhost:${port}`);
