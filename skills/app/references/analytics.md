# Analytics

Privacy-friendly analytics via [Runable Analytics](https://onedollarstats.com).

Hostnames: `{APPLICATION_ID}-website` (web) / `{APPLICATION_ID}-mobile` (mobile).

## Web

Vite plugin injects `runable.js` → exposes `window.stonks` with `event()` and `view()`.

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

Provider is already set up in `app/_layout.tsx` — do not duplicate it. Import `useAnalytics` from `../lib/analytics`.

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
