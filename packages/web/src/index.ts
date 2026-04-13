import { join } from "node:path";
import appConfig from "../../../app.config.json";
import app from "./api/app";
import homepage from "./client/index.html";

const publicDir = join(import.meta.dir, "..", "public");
const port = appConfig.services.website.port;

Bun.serve({
  port,
  routes: {
    "/": homepage,
  },
  fetch(req) {
    const url = new URL(req.url);

    // Route /api/* to Hono (strips the /api prefix)
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      const apiUrl = new URL(url);
      apiUrl.pathname = url.pathname.replace(/^\/api/, "") || "/";
      return app.fetch(new Request(apiUrl.toString(), {
        method: req.method,
        headers: req.headers,
        body: req.body,
      }));
    }

    // Serve static files from public/
    const filePath = join(publicDir, url.pathname);
    const file = Bun.file(filePath);
    return file.exists().then((exists) => {
      if (exists) return new Response(file);
      // SPA fallback — return the Bun HTML import (bundled, with HMR)
      return homepage as unknown as Response;
    });
  },
  development: {
    hmr: true,
    console: true,
  },
});

export type { AppType } from "./api/app";

console.log(`Server running on http://localhost:${port}`);
