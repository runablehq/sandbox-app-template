import app from "./src/app";
import appConfig from "../../app.config.json";

export type { AppType } from "./src/app";

export default {
  port: appConfig.services.api.port,
  fetch: app.fetch,
};
