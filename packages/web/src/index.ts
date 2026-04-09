import { join } from "node:path";
import appConfig from "../../../app.config.json";
import app from "./api/app";
import homepage from "./client/index.html";

const publicDir = join(import.meta.dir, "..", "public");
const port = appConfig.services.website.port;

Bun.serve({
  port,
  routes: {
    "/api": (req) => {
      const url = new URL(req.url);
      url.pathname = "/";
      return app.fetch(new Request(url.toString(), req));
    },
    "/api/*": (req) => {
      const url = new URL(req.url);
      url.pathname = url.pathname.replace(/^\/api/, "") || "/";
      return app.fetch(new Request(url.toString(), req));
    },
    "/*": homepage,
  },
  fetch(req) {
    const url = new URL(req.url);
    const filePath = join(publicDir, url.pathname);
    const file = Bun.file(filePath);
    return file
      .exists()
      .then((exists) => (exists ? new Response(file) : new Response("Not Found", { status: 404 })));
  },
  development: {
    hmr: true,
    console: true,
  },
});

export type { AppType } from "./api/app";

console.log(`Server running on http://localhost:${port}`);
