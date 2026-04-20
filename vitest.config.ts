import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    exclude: ["tests/e2e/**"],
    // Use forks pool so each worker gets its own @libsql/client native binding.
    // The default "threads" pool crashes with SQLITE_BUSY on concurrent writes
    // when multiple workers share the same libsql connection.
    pool: "forks",
    server: {
      deps: {
        inline: ["next"],
      },
    },
  },
});
