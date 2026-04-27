import { hc, type InferResponseType } from "hono/client";
import type { AppType } from "../../api";

const client = hc<AppType>("/");

export const api = client.api;

export type HealthResponse = InferResponseType<typeof api.health.$get>;
export type PingResponse = InferResponseType<typeof api.ping.$get>;
