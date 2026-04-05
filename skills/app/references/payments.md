# Payments

We use [Autumn](https://useautumn.com) for payments and usage tracking.

**Pinned versions:** `autumn-js@1.2.0`, `atmn@1.1.8`.

**Docs:** [docs.useautumn.com/llms.txt](https://docs.useautumn.com/llms.txt) | [CLI config](https://docs.useautumn.com/cli/config)

<preflight>
Before wiring, state your assumptions about which features to gate, pricing tiers and their limits, billing model (boolean access vs usage-based vs credits), and whether there's a pricing page. The user will correct what's wrong.
</preflight>

## 1. Install

```bash
cd packages/api && bun add autumn-js@1.2.0
cd packages/web && bun add autumn-js@1.2.0
cd packages/mobile && bun add autumn-js@1.2.0
```

Install CLI globally: `bun add -g atmn@1.1.8`

## 2. Autumn Config

Create `autumn.config.ts` in project root:

> `reset` and `price` are mutually exclusive on `item()`. Consumable metered features **must have one of them**. `included` must be >= 0. For unlimited, use `unlimited: true`.

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

Push to Autumn: `atmn push -y`

## 3. Provider Setup (Web)

In `packages/web/src/main.tsx`, wrap with `AutumnProvider`:

```tsx
import { AutumnProvider } from "autumn-js/react";

// Inside render:
<QueryClientProvider client={queryClient}>
  <AutumnProvider useBetterAuth>
    <RouterProvider router={router} />
  </AutumnProvider>
</QueryClientProvider>
```

## 4. Provider Setup (Mobile)

In `packages/mobile/app/_layout.tsx`:

```tsx
import { AutumnProvider } from "autumn-js/react";

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

## 5. Better Auth Plugin

Add Autumn plugin in `packages/api/src/auth.ts`:

```ts
import { autumn } from "autumn-js/better-auth";

export const auth = betterAuth({
  // ...existing config
  plugins: [autumn()],
});
```

## 6. Frontend Usage

Same API on web and mobile:

```tsx
import { useCustomer, useListPlans } from "autumn-js/react";

function PricingPage() {
  const { data: customer, attach } = useCustomer();
  const { data: plans } = useListPlans();

  const activePlan = customer?.subscriptions?.[0]?.planId ?? "free";
  const balance = customer?.balances?.["messages"];
  // balance.remaining, balance.granted, balance.usage, balance.unlimited

  return (
    <button onClick={() => attach({ planId: "pro", successUrl: window.location.origin })}>
      Upgrade to Pro
    </button>
  );
}
```

## 7. Backend Check & Track

SDK reads `AUTUMN_SECRET_KEY` from env automatically:

```ts
import { Autumn } from "autumn-js";

const autumn = new Autumn();

// Check — verify balance before allowing access
const result = await autumn.check({
  customerId: userId,
  featureId: "messages",
  requiredBalance: 1,
});
if (!result.allowed) {
  return c.json({ error: "Insufficient balance" }, 403);
}

// Track — record usage after action succeeds
await autumn.track({
  customerId: userId,
  featureId: "messages",
  value: 1,
});
```

## 8. Backend Handler (non-Better-Auth)

If not using Better Auth, mount `autumnHandler`:

```ts
import { autumnHandler } from "autumn-js/hono";

// In app.ts chain:
.all("/api/autumn/*", autumnHandler({
  identify: async (c) => {
    const user = getUser(c);
    return { customerId: user.id };
  },
}))
```

## CLI Commands

`atmn init` | `atmn login` | `atmn push` (`-p` for prod, `-y` to confirm) | `atmn pull` | `atmn nuke` | `atmn env` | `atmn dashboard`
