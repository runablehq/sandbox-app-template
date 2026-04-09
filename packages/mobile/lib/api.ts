import { createReactQueryClient } from "@softnetics/hono-react-query";
import { Platform } from "react-native";
import type { AppType } from "@template/web";

import appConfig from "../../../app.config.json";

const webPort = appConfig.services.web.port;
const baseUrl = Platform.select({
  android: `http://10.0.2.2:${webPort}/api`,
  default: `http://localhost:${webPort}/api`,
});

export const api = createReactQueryClient<AppType>({ baseUrl });
