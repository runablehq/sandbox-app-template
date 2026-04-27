# Payments

We use [Autumn](https://useautumn.com) for payments and usage tracking.

**Pinned versions:** `autumn-js@1.2.0`, `atmn@1.1.8`.

**Docs:** [docs.useautumn.com/llms.txt](https://docs.useautumn.com/llms.txt) | [CLI config](https://docs.useautumn.com/cli/config)

<preflight>
Before wiring, state your assumptions about which features to gate, pricing tiers and their limits, billing model (boolean access vs usage-based vs credits), and whether there's a pricing page. The user will correct what's wrong.
</preflight>

## 1. Install

```bash
cd packages/web && bun add autumn-js@1.2.0
cd packages/mobile && bun add autumn-js@1.2.0
```

Install CLI: `bun add -D atmn@1.1.8` (project root)

## 2. Autumn Config

Create `autumn.config.ts` in project root. `reset` and `price` are mutually exclusive on `item()`. The `included` value must be a non-negative integer.

```ts
import { feature, plan, item } from "atmn";

export const messages = feature({
  id: "messages",
  name: "Messages",
  type: "metered",
  consumable: true,
});

export const free = plan({
  id: "free",
  name: "Free",
  autoEnable: true,
  items: [
    item({
      featureId: messages.id,
      included: 100,
      reset: { interval: "month" },
    }),
  ],
});

export const pro = plan({
  id: "pro",
  name: "Pro",
  price: { amount: 2000, interval: "month" },
  items: [
    item({
      featureId: messages.id,
      included: 1000,
      reset: { interval: "month" },
    }),
  ],
});

export default {
  features: [messages],
  plans: [free, pro],
};
```

Push to Autumn: `npx atmn push -y`

## 3. Better Auth Plugin

Add `autumn()` plugin in `packages/web/src/api/auth.ts`. This registers all Autumn endpoints under `/api/auth/autumn/*` as POST routes. No separate Hono handler needed.

```ts
import { autumn } from "autumn-js/better-auth";

export const auth = betterAuth({
  // ...existing config
  plugins: [autumn()],
});
```

## 4. Provider Setup (Web)

In `packages/web/src/web/main.tsx`:

```tsx
import { AutumnProvider } from "autumn-js/react";

<Router>
  <AutumnProvider useBetterAuth>
    <App />
  </AutumnProvider>
</Router>
```

## 5. Provider Setup (Mobile)

In `packages/mobile/app/_layout.tsx`:

```tsx
import { AutumnProvider } from "autumn-js/react";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AutumnProvider useBetterAuth>
          <Slot />
        </AutumnProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
```

## 6. Frontend Usage

`useListPlans` returns `Plan[]` directly. Each plan has `id`, `name`, `price` (`{ amount, interval }` or null), `items[]`, and `customerEligibility` (`{ attachAction, status }`).

`useCustomer` returns `Customer` with `subscriptions[]` (each has `planId`, `status`), `balances` (keyed by feature ID, each has `granted`, `remaining`, `usage`, `unlimited`).

`attach` takes `{ planId, successUrl? }` — returns a Stripe checkout URL for paid plans, applies immediately for free.

```tsx
import { useCustomer, useListPlans } from "autumn-js/react";

function PricingPage() {
  const { data: customer, attach } = useCustomer();
  const { data: plans } = useListPlans();

  const activePlan = customer?.subscriptions?.[0]?.planId ?? "free";
  const balance = customer?.balances?.["messages"];

  return (
    <div>
      <p>Plan: {activePlan}</p>
      <p>Messages: {balance?.remaining} / {balance?.granted}</p>
      {(plans ?? []).map((plan) => (
        <button
          key={plan.id}
          disabled={plan.id === activePlan}
          onClick={() => attach({ planId: plan.id, successUrl: window.location.origin })}
        >
          {plan.name} — {plan.price ? `$${plan.price.amount / 100}/mo` : "Free"}
        </button>
      ))}
    </div>
  );
}
```

## 7. Backend Check & Track

SDK reads `AUTUMN_SECRET_KEY` from env automatically.

```ts
import { Autumn } from "autumn-js";

const autumn = new Autumn();

// Check — returns { allowed, balance }
const { allowed } = await autumn.check({
  customerId: userId,
  featureId: "messages",
});
if (!allowed) return c.json({ error: "Insufficient balance" }, 403);

// Track — returns { balance } with updated remaining
await autumn.track({
  customerId: userId,
  featureId: "messages",
  value: 1,
});
```

## 8. Handler (non-Better-Auth)

Only needed if **not** using the Better Auth plugin. Mount in `src/api/index.ts`:

```ts
import { autumnHandler } from "autumn-js/hono";

const app = new Hono()
  .basePath("api")
  // ...existing routes
  .all("/autumn/*", autumnHandler({
    identify: (c) => {
      const user = c.get("user");
      return { customerId: user?.id };
    },
  }));
```

When using this handler without Better Auth, set `AutumnProvider` without `useBetterAuth` and pass `backendUrl` + `pathPrefix` manually.

## CLI Commands

`npx atmn push -y` | `npx atmn push -p` (prod) | `npx atmn pull` | `npx atmn nuke` | `npx atmn env` | `npx atmn dashboard`
