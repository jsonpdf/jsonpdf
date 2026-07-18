import { defineConfig } from 'vite-plus';

export default defineConfig({
  fmt: {
    ignorePatterns: ['**/dist/**', '**/coverage/**', 'pnpm-lock.yaml'],
    semi: true,
    singleQuote: true,
    trailingComma: 'all',
    printWidth: 100,
    tabWidth: 2,
  },
  lint: {
    ignorePatterns: ['**/dist/**', '**/coverage/**', '**/*.js'],
    plugins: ['typescript'],
  },
  run: {
    cache: true,
  },
  test: {
    environment: 'node',
    include: ['packages/*/__tests__/**/*.test.{ts,tsx}'],
    passWithNoTests: true,
  },
});
