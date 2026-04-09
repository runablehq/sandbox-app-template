import { createReactQueryClient } from "@softnetics/hono-react-query";
import Constants from "expo-constants";
import { Platform } from "react-native";
import type { AppType } from "@template/web";

import appConfig from "../../../app.config.json";

const websitePort = appConfig.services.website.port;
const baseUrl =
  Constants.expoConfig?.extra?.apiUrl ??
  Platform.select({
    android: `http://10.0.2.2:${websitePort}/api`,
    default: `http://localhost:${websitePort}/api`,
  });

export const api = createReactQueryClient<AppType>({ baseUrl });
