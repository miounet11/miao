import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'out/**',
        '**/*.test.ts',
        '**/*.config.ts',
      ],
    },
    include: ['**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './extensions/shared-services'),
      vscode: path.resolve(__dirname, './__mocks__/vscode.ts'),
    },
  },
});
