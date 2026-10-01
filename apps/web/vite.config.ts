/// <reference types="vitest/config" />
import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, "")
  const apiTarget = env.VITE_API_PROXY_TARGET ?? "http://localhost:3000"

  // Same-origin /api in dev and preview, so auth cookies work without CORS.
  const proxy = { "/api": { target: apiTarget, changeOrigin: true } }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": resolve(import.meta.dirname, "./src"),
      },
    },
    server: { proxy },
    preview: { proxy },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      css: false,
      restoreMocks: true,
    },
  }
})
