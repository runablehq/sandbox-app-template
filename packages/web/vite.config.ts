import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite"
import path from "path";
import runableAnalyticsPlugin from "./vite/plugins/runable-analytics-plugin";
import honoDevPlugin from "./vite/plugins/hono-dev-plugin";
import appConfig from "../../app.config.json";

const root = path.resolve(__dirname, "../..");

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, root, '');
	const port = appConfig.services.website.port;
	if (!env.BETTER_AUTH_URL) env.BETTER_AUTH_URL = `http://localhost:${port}`;
	Object.assign(process.env, env);

	return {
		plugins: [honoDevPlugin(), react(), runableAnalyticsPlugin(), tailwind()],
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "./src/web"),
			},
		},
		server: {
			port: appConfig.services.website.port,
			allowedHosts: true,
			hmr: { overlay: false, }
		}
	};
});
