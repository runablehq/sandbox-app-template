import { createReactQueryClient } from "@softnetics/hono-react-query";
import type { AppType } from "@template/api";

export const api = createReactQueryClient<AppType>({
  baseUrl: `http://localhost:${process.env.VITE_API_PORT || 3000}`,
});
