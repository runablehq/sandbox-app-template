import { createReactQueryClient } from "@softnetics/hono-react-query";
import type { AppType } from "@template/web";

export const api = createReactQueryClient<AppType>({
  baseUrl: "/api",
});
