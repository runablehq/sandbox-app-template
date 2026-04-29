# Mobile

## Overview

`packages/mobile` is an Expo + React Native app with expo-router (file-based routing) and typed API calls via `@softnetics/hono-react-query`. The API URL is configured via `extra.apiUrl` in `app.json`. When the port in `app.config.json` changes, update `packages/mobile/app.json` → `expo.extra.apiUrl` to match.

## Project Structure

```
packages/mobile/
  app/
    _layout.tsx              Root layout (QueryClientProvider + SafeAreaProvider)
    index.tsx                / screen
    profile.tsx              /profile screen
    users/
      index.tsx              /users screen
      [id].tsx               /users/:id screen
  lib/
    api.ts                   Typed API client
  assets/                    App icons, splash screen
  app.json                   Expo config (extra.apiUrl must match app.config.json port)
  eas.json                   EAS build profiles with env vars
  env.d.ts                   Type declarations for process.env
  web/
    src/
      api/                   For all the api endpoints/database
```

## Adding Screens

Create files in `app/`. Expo Router uses file-based routing.

```tsx
// app/profile.tsx
import { View, Text } from "react-native";

export default function ProfileScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Profile</Text>
    </View>
  );
}
```

### Dynamic routes

```tsx
// app/users/[id].tsx
import { View, Text, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { api } from "../../lib/api";

export default function UserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = api.useQuery("api/users/:id", "$get", { param: { id } });

  if (user.isLoading) return <ActivityIndicator />;

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24 }}>{user.data?.data.name}</Text>
    </View>
  );
}
```

### Layouts and navigation

```tsx
// app/_layout.tsx
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <Stack />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
```

Tab navigation:

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
```

## Typed API Client

The client is in `lib/api.ts`. The base URL comes from `extra.apiUrl` in `app.json`(default is web package api routes), with fallbacks to `EXPO_PUBLIC_API_URL` and platform-specific localhost defaults:

```ts
import { createReactQueryClient } from "@softnetics/hono-react-query";
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

export const api = createReactQueryClient<AppType>({ baseUrl });
```

**Note:** The `baseUrl` does NOT include `/api`. Hono's `.basePath('api')` bakes the prefix into the route type paths (e.g., `"api/health"`), so the library appends it automatically.

Usage:

```tsx
import { api } from "../lib/api";

// Queries
const users = api.useQuery("api/users", "$get", {});

// Mutations
const createUser = api.useMutation("api/users", "$post");
createUser.mutate({ json: { name: "Alice", email: "alice@example.com" } });
```

## Running

```bash
cd packages/mobile
bun run dev            # Expo dev server
bun run ios            # iOS simulator
bun run android        # Android emulator
```
