import { createFileRoute } from "@tanstack/react-router";
import { api } from "../lib/api";
import { useDesktop } from "../hooks/use-desktop";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const health = api.useQuery("/health", "$get", {});
  const desktop = useDesktop();

  return (
    <div>
      <h1>Welcome</h1>
      <p>
        Platform: {desktop ? `Desktop (${desktop.platform})` : "Web"}
      </p>
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
