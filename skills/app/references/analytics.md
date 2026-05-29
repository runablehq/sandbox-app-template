# Analytics

Privacy-friendly analytics via [Runable Analytics](https://onedollarstats.com).

Hostnames: `{APPLICATION_ID}-website` (web) / `{APPLICATION_ID}-mobile` (mobile).
Collector URL: `https://r.lilstts.com/events`

## Important

- **Do not remove** the analytics script injection in `vite/plugins/runable-analytics-plugin.ts` (web) or the `<OneDollarStatsProvider>` in `packages/mobile/app/_layout.tsx` (mobile). These are required defaults for all managed apps.
- The collector URL must always be `https://r.lilstts.com/events` — do not change it.
- The mobile `devmode` must always be `true` — do not change it.

## Web

Vite plugin (`vite/plugins/runable-analytics-plugin.ts`) reads `APPLICATION_ID` from env, builds hostname as `{APPLICATION_ID}-website`, and injects `runable.js` into HTML with `data-hostname` and `data-url="https://r.lilstts.com/events"`. Exposes `window.stonks` with `event()` and `view()`.

Create `src/web/hooks/use-analytics.ts`:

```ts
export const useAnalytics = () => ({
  trackEvent: (name: string, props?: Record<string, unknown>) => {
    window.stonks?.event(name, props);
  },
  trackView: (path?: string, props?: Record<string, unknown>) => {
    window.stonks?.view(path, props);
  },
});
```

## Mobile

Provider is already set up in `app/_layout.tsx` with collector URL `https://r.lilstts.com/events` — do not remove or duplicate it. Import `useAnalytics` from `../lib/analytics`.

### Usage

```tsx
import { useEffect } from "react";
import { useAnalytics } from "../lib/analytics";

export default function SomeScreen() {
  const { event, view } = useAnalytics();

  useEffect(() => {
    view("/some-screen");
  }, []);

  const handleTap = () => {
    event("button_tap", { label: "signup" });
  };
}
```

### Rules

- Call `view("/route")` in `useEffect(, [])` on every screen for page views.
- Call `event("name", { props })` on interactive elements (buttons, switches, forms).
- Use `snake_case` for event names. Include relevant context as props.
