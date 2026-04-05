import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import appConfig from "../../app.config.json";

export default defineConfig({
  plugins: [tanstackRouter({ quoteStyle: "double" }), react()],
  server: {
    port: appConfig.services.web.port,
  },
  define: {
    __APP_CONFIG__: JSON.stringify(appConfig),
  },
});
