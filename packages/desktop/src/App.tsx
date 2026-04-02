import { api } from './lib/api'

function App() {
  const health = api.useQuery("/health", "$get", {});

  return (
    <div>
      <h1>Desktop App</h1>
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

export default App
