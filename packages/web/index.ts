import app from "./src/app";
import homepage from "./index.html";

Bun.serve({
  port: 3000,
  routes: {
    "/api": (req) => {
      const url = new URL(req.url);
      url.pathname = "/";
      return app.fetch(new Request(url, req));
    },
    "/api/*": (req) => {
      const url = new URL(req.url);
      url.pathname = url.pathname.replace(/^\/api/, "") || "/";
      return app.fetch(new Request(url, req));
    },
    "/*": homepage,
  },
  development: {
    hmr: true,
    console: true,
  },
});

export type { AppType } from "./src/app";

console.log("Server running on http://localhost:3000");
