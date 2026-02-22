/**
 * Vitest setup file
 * Runs before all tests
 */

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  error: (...args: unknown[]) => {
    // Only log errors in CI or when explicitly enabled
    if (process.env.CI || process.env.VERBOSE_TESTS) {
      console.error(...args);
    }
  },
};
