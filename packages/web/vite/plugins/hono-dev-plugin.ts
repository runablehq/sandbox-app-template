import type { Plugin } from "vite";

export default function honoDevPlugin(): Plugin {
	return {
		name: "hono-dev-server",
		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				if (!req.url?.startsWith("/api")) return next();

				try {
					// Dynamic import so the module reloads on changes
					const { default: app } = await server.ssrLoadModule("/src/api/index.ts");

					const url = new URL(req.url, `http://${req.headers.host}`);
					const headers = new Headers();
					for (const [key, value] of Object.entries(req.headers)) {
						if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
					}

					let body: string | undefined;
					if (req.method !== "GET" && req.method !== "HEAD") {
						body = await new Promise<string>((resolve) => {
							let data = "";
							req.on("data", (chunk: string) => { data += chunk; });
							req.on("end", () => resolve(data));
						});
					}

					const request = new Request(url.toString(), {
						method: req.method,
						headers,
						body,
					});

					const response = await app.fetch(request);

					res.statusCode = response.status;
					response.headers.forEach((value: string, key: string) => {
						res.setHeader(key, value);
					});

					const responseBody = await response.arrayBuffer();
					res.end(Buffer.from(responseBody));
				} catch (err) {
					console.error("[hono-dev-plugin]", err);
					res.statusCode = 500;
					res.end("Internal Server Error");
				}
			});
		},
	};
}
