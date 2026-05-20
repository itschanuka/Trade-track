import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  cacheDir: ".vitest-cache",
  resolve: {
    alias: {
      "@": root
    }
  },
  test: {
    environment: "node",
    exclude: ["_later-phase-hold/**", "node_modules/**", ".next/**"],
    include: ["app/api/**/*.test.ts", "lib/**/*.test.ts"]
  }
});
