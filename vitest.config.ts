import { defineConfig } from "vitest/config";

/**
 * Logic-level tests only. The game rules, the pick, the update policy and
 * the two private-screen state machines are pure modules, and that is where
 * the failure modes worth pinning live. No DOM environment: the components
 * stay thin over these, and the production build is checked in a real
 * browser instead — see docs/review-2026-09.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
