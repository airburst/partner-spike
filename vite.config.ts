import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
  // SB API sends no CORS headers: proxy so the browser calls same-origin.
  // Trade search lives under /api (usa) or /trade_search (cyber), by product.
  server: {
    proxy: {
      "/api": "http://localhost:3000",
      "/trade_search": "http://localhost:3000",
    },
  },
});

export default config;
