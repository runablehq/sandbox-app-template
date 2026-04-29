import { hc } from "hono/client";
import Constants from "expo-constants";
import { Platform } from "react-native";
import type { AppType } from "@template/web";

const { services } = require("../../app.config.json") as { services: { website: { port: number } } };
const port = services.website.port;

const baseUrl =
  Constants.expoConfig?.extra?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL ??
  Platform.select({
    android: `http://10.0.2.2:${port}`,
    default: `http://localhost:${port}`,
  });

const client = hc<AppType>(baseUrl!);

export const api = client.api;
