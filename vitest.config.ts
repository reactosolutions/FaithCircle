import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 20000,
    // These hit the real hosted Supabase project with real seeded users —
    // there's no local/mocked Postgres to isolate against (see the "RLS
    // test suite" decision in CLAUDE.md's Permissions section), so
    // parallel test files would race each other's auth sessions.
    fileParallelism: false,
  },
});
