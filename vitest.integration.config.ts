import { defineConfig } from 'vitest/config';

// Integration tests exercise real Supabase (DB + RLS + Auth) and the API route
// handlers. They need the Supabase env vars exposed on import.meta.env, so we
// widen envPrefix beyond Vite's default. Run with a local/CI Supabase stack up.
export default defineConfig({
  envPrefix: ['PUBLIC_', 'SUPABASE_', 'VITE_'],
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    // All suites share one Supabase instance; run files serially so fixtures in
    // one file cannot race another's setup/teardown.
    fileParallelism: false,
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
});
