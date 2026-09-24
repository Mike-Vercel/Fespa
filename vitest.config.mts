import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const fromRoot = (relativePath: string) => fileURLToPath(new URL(relativePath, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": fromRoot("./src"),
      // "server-only" blocca l'import nei bundle client di Next; nei test gira tutto in Node.
      "server-only": fromRoot("./tests/support/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // PGlite carica Postgres in WASM: il primo avvio può richiedere qualche secondo.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
