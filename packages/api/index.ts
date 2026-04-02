import app from "./src/app";

export type { AppType } from "./src/app";

export default {
  port: 3000,
  fetch: app.fetch,
};
