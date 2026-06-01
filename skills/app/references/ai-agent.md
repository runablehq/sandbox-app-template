# AI Agent

Uses [AI SDK](https://v6.ai-sdk.dev) with a self-hosted AI Gateway (`createGateway`). Everything goes through v3 protocol only.

<preflight>
State assumptions about: agent persona, model, tools needed, chat UI location (web/mobile/both). User corrects what's wrong.
</preflight>

## Env vars (root `.env`)

```
AI_GATEWAY_BASE_URL=<gateway-url>
AI_GATEWAY_API_KEY=<gateway-api-key>
```

## Supported Models

- `anthropic/claude-opus-4.6`
- `anthropic/claude-sonnet-4.6`
- `anthropic/claude-haiku-4.5`
- `openai/gpt-5.4`
- `openai/gpt-5.4-mini`
- `openai/gpt-5.4-nano`
- `google/gemini-3-flash`
- `google/gemini-3.1-pro-preview`
- `google/gemini-3.1-flash-lite-preview`
- `google/gemini-3-pro-image`

## Install

```bash
bun add ai dedent @ai-sdk/react --cwd packages/web
bun add @ai-sdk/react ai --cwd packages/mobile
```

## Gateway Setup

```ts
// packages/web/src/api/agent/gateway.ts
import { createGateway } from "ai";

export const gateway = createGateway({
  baseURL: process.env.AI_GATEWAY_BASE_URL,
  apiKey: process.env.AI_GATEWAY_API_KEY,
});
```

## Agent + API Route

```ts
// packages/web/src/api/agent/index.ts
import { stepCountIs, SystemModelMessage, ToolLoopAgent } from "ai";
import dedent from "dedent";
import { gateway } from "./gateway";

export const agent = new ToolLoopAgent({
  model: gateway("anthropic/claude-sonnet-4.6"),
  instructions: [{ role: "system", content: dedent`You are a helpful assistant.` }],
  tools: {},
  stopWhen: [stepCountIs(10)],
});

// Chain on main app in packages/web/src/api/index.ts
import { createAgentUIStreamResponse } from "ai";
import { agent } from "./agent";

.post("/agent/messages", async (c) => {
  const { messages } = await c.req.json();
  return createAgentUIStreamResponse({ agent, uiMessages: messages });
})
```

## Text Generation

```ts
import { generateText } from "ai";

.post("/generate/text", async (c) => {
  const { prompt } = await c.req.json();
  const { text } = await generateText({ model: gateway("anthropic/claude-sonnet-4.6"), prompt });
  return c.json({ text }, 200);
})
```

## Image Generation

Use `google/gemini-3-pro-image` via `generateText`. Save all generated images to tigris (see [file-upload.md](file-upload.md)).

```ts
const { files } = await generateText({
  model: gateway("google/gemini-3-pro-image"),
  providerOptions: { google: { responseModalities: ["TEXT", "IMAGE"] } },
  prompt: `Generate an image: ${prompt}`,
});

if (files && files.length > 0) {
  const file = files[0]!;
  const key = `generated/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;

  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET, Key: key,
    Body: Buffer.from(file.uint8Array), ContentType: file.mediaType,
  }));

  const url = await getSignedUrl(s3, new GetObjectCommand({
    Bucket: process.env.S3_BUCKET, Key: key,
  }), { expiresIn: 3600 });
}
```

## Tools

Create under `packages/web/src/api/agent/tools/`. Register in agent: `tools: { myTool }`.

```ts
import z from "zod";
import { tool } from "ai";

export const myTool = tool({
  description: "What this tool does.",
  inputSchema: z.object({ input: z.string() }),
  async execute({ input }) { return { result: input }; },
});
```

For custom tool UI, check `part.type === "tool-invocation"` and `part.toolInvocation.toolName` in the message renderer.

## Web Chat UI

```tsx
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";

const { messages, sendMessage, status } = useChat({
  transport: new DefaultChatTransport({ api: "/api/agent/messages" }),
});
// status: "streaming" | "submitted" | "ready"
// sendMessage({ text: input })
```

## Mobile Chat UI

```tsx
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Constants from "expo-constants";

const baseUrl = Constants.expoConfig?.extra?.apiUrl ?? process.env.EXPO_PUBLIC_API_URL;
const { messages, sendMessage, status } = useChat({
  transport: new DefaultChatTransport({ api: `${baseUrl}/api/agent/messages` }),
});
```

## Rules

- Everything goes through v3 only — `createGateway` handles the protocol.
- Image generation uses an image-capable model via `generateText`, not a separate endpoint.
- All generated files must be saved to tigris and returned as presigned URLs — never return base64.
