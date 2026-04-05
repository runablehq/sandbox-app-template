import app from "./src/app";

export type { AppType } from "./src/app";

export default {
  port: Number(process.env.VITE_API_PORT) || 3000,
  fetch: app.fetch,
};
