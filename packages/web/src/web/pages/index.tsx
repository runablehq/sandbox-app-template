import { useState, useEffect } from "react";
import { api, type HealthResponse } from "../lib/api";
import { useDesktop } from "../hooks/use-desktop";

function Index() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState(false);
  const desktop = useDesktop();

  useEffect(() => {
    async function fetchHealth() {
      try {
        const res = await api.health.$get();
        const data = await res.json();
        setHealth(data);
      } catch {
        setError(true);
      }
    }
    fetchHealth();
  }, []);

  return (
    <div>
      <h1>Welcome</h1>
      <p>Platform: {desktop ? `Desktop (${desktop.platform})` : "Web"}</p>
      <p>
        API Status:{" "}
        {error ? "Error" : health ? health.status : "Loading..."}
      </p>
    </div>
  );
}

export default Index;
