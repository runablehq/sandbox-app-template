import { createReactQueryClient } from "@softnetics/hono-react-query";
import { Platform } from "react-native";
import type { AppType } from "@template/web";

import appConfig from "../../../app.config.json";

const apiPort = appConfig.services.api.port;
const baseUrl = Platform.select({
  android: `http://10.0.2.2:${apiPort}/api`,
  default: `http://localhost:${apiPort}/api`,
});

export const api = createReactQueryClient<AppType>({ baseUrl });
