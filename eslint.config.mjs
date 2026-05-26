// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'dist/**', 'node_modules/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // TypeScript
      '@typescript-eslint/no-explicit-any': 'warn', // changed: warn instead of fully off
      '@typescript-eslint/no-floating-promises': 'error', // changed: error, not warn — unhandled promises in NestJS can silently break things
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }], // added: ignore intentionally unused args prefixed with _
      '@typescript-eslint/explicit-function-return-type': 'off', // added: too noisy for resolvers/controllers
      '@typescript-eslint/no-misused-promises': 'error', // added: catches async functions passed where sync is expected

      // General
      'no-console': 'warn', // added: encourages using a proper logger (NestJS Logger)

      // Prettier — use "lf" to match your prettier config, not "auto"
      'prettier/prettier': ['error', { endOfLine: 'lf' }], // changed: was "auto", sync with prettier config
    },
  },
);
