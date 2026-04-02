import { createFileRoute } from "@tanstack/react-router";
import { api } from "../lib/api";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const health = api.useQuery("/health", "$get", {});

  return (
    <div>
      <h1>Welcome</h1>
      <p>
        API Status:{" "}
        {health.isLoading
          ? "Loading..."
          : health.isError
            ? "Error"
            : health.data?.data.status}
      </p>
    </div>
  );
}
