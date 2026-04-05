import { createReactQueryClient } from "@softnetics/hono-react-query";
import type { AppType } from "@template/api";

export const api = createReactQueryClient<AppType>({
  baseUrl: `http://localhost:${__APP_CONFIG__.services.api.port}`,
});
