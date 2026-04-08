# AI Agent

We use [AI SDK](https://v6.ai-sdk.dev) with the Vercel AI Gateway provider for AI agents.

<preflight>
Before wiring, state your assumptions about the agent's persona, which model to use, what tools it needs, and where the chat UI lives (web, mobile, or both). The user will correct what's wrong.
</preflight>

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

## 1. Install

```bash
cd packages/web && bun add ai dedent @ai-sdk/react
cd packages/mobile && bun add @ai-sdk/react ai
```

## 2. Agent Config

Create `packages/web/src/api/agent/index.ts`:

```ts
import { createGateway, stepCountIs, SystemModelMessage, ToolLoopAgent } from "ai";
import dedent from "dedent";

const gateway = createGateway({
  baseURL: process.env.AI_GATEWAY_BASE_URL,
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

const INSTRUCTIONS: SystemModelMessage[] = [
  {
    role: "system",
    content: dedent`You are a helpful assistant.`,
  },
];

export const agent = new ToolLoopAgent({
  model: gateway("anthropic/claude-sonnet-4.6"),
  instructions: INSTRUCTIONS,
  tools: {},
  stopWhen: [stepCountIs(100)],
});
```

## 3. Add Tools

Create tools under `packages/web/src/api/agent/`.

```ts
// packages/web/src/api/agent/calculate-tool.ts
import z from "zod";
import { evaluate } from "mathjs";
import { tool, UIToolInvocation } from "ai";

export const calculate = tool({
  description: "Calculate a mathematical expression.",
  inputSchema: z.object({
    expression: z.string().describe("The mathematical expression to calculate."),
  }),
  async execute({ expression }) {
    try {
      return evaluate(expression);
    } catch (error) {
      return String(error);
    }
  },
});

export type CalculateToolResult = UIToolInvocation<typeof calculate>;
```

Register in agent config:

```ts
import { calculate } from "./calculate-tool";

export const agent = new ToolLoopAgent({
  // ...
  tools: { calculate },
});
```

## 4. API Route

Add agent route to `packages/web/src/api/app.ts` (no `/api` prefix — it's applied by `src/index.ts`):

```ts
import { createAgentUIStreamResponse } from "ai";
import { agent } from "./agent";

const app = new Hono()
  // ...existing routes
  .post("/agent/messages", async (c) => {
    const { messages } = await c.req.json();
    return createAgentUIStreamResponse({ agent, messages });
  });
```

The endpoint is accessible at `/api/agent/messages`.

## 5. Web Chat UI

The API is on the same origin, so use a relative URL:

```tsx
// packages/web/src/client/routes/chat.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useState } from "react";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
});

function MessagePart({ part }: { part: UIMessage["parts"][number] }) {
  if (part.type === "text") return <span>{part.text}</span>;
  return null;
}

function ChatPage() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/agent/messages" }),
  });
  const [input, setInput] = useState("");
  const isLoading = status === "streaming" || status === "submitted";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", maxWidth: 768, margin: "0 auto" }}>
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ textAlign: msg.role === "user" ? "right" : "left", marginBottom: 8 }}>
            {msg.parts.map((part, i) => <MessagePart key={i} part={part} />)}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, padding: 16, borderTop: "1px solid #eee" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask something..."
          style={{ flex: 1, padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>Send</button>
      </form>
    </div>
  );
}
```

## 6. Mobile Chat UI

```tsx
// packages/mobile/app/chat.tsx
import { View, TextInput, FlatList, Text, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";
import appConfig from "../../../app.config.json";

export default function ChatScreen() {
  const apiPort = appConfig.services.api.port;
  const baseUrl = Platform.select({
    android: `http://10.0.2.2:${apiPort}/api`,
    default: `http://localhost:${apiPort}/api`,
  });
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: `${baseUrl}/agent/messages` }),
  });
  const [input, setInput] = useState("");
  const isLoading = status === "streaming" || status === "submitted";

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <View style={{ padding: 8, alignItems: item.role === "user" ? "flex-end" : "flex-start" }}>
            {item.parts.map((part, i) =>
              part.type === "text" ? <Text key={i}>{part.text}</Text> : null
            )}
          </View>
        )}
        style={{ flex: 1 }}
      />
      <View style={{ flexDirection: "row", padding: 8, gap: 8, borderTopWidth: 1, borderColor: "#eee" }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask something..."
          style={{ flex: 1, padding: 8, borderWidth: 1, borderColor: "#ccc", borderRadius: 4 }}
          editable={!isLoading}
        />
        <Pressable onPress={handleSend} disabled={isLoading || !input.trim()}>
          <Text>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
```

## Tool Renderers

For custom tool UI, check `part.type === "tool-{toolName}"` in the message parts renderer and render a dedicated component. Export `UIToolInvocation<typeof myTool>` from each tool file for typing.
