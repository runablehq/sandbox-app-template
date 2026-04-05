import { createReactQueryClient } from "@softnetics/hono-react-query";
import type { AppType } from "@template/api";

import appConfig from "../../app.config.json";

export const api = createReactQueryClient<AppType>({
  baseUrl: `http://localhost:${appConfig.services.api.port}`,
});
