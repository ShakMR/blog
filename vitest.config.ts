import { defineConfig } from 'vitest/config';

// Fast, service-free unit tests. Integration tests live in tests/integration
// and run via vitest.integration.config.ts against a real Supabase stack.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'src/lib/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
    },
  },
});
