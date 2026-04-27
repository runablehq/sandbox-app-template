import { createReactQueryClient } from "@softnetics/hono-react-query";
import Constants from "expo-constants";
import { Platform } from "react-native";
import type { AppType } from "@template/web";

const baseUrl =
  Constants.expoConfig?.extra?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL ??
  Platform.select({
    android: "http://10.0.2.2:3000",
    default: "http://localhost:3000",
  });

export const api = createReactQueryClient<AppType>({ baseUrl });
