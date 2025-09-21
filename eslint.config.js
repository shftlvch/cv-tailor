import pluginJs from '@eslint/js';
import securityPlugin from 'eslint-plugin-security';
import unicornPlugin from 'eslint-plugin-unicorn';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tsPlugin from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default defineConfig([
  // Security
  securityPlugin.configs.recommended,
  {
    files: ['**/*.ts'],
  },
  {
    languageOptions: { globals: globals.node },
  },
  {
    rules: {
      'no-restricted-syntax': ['off', 'ForOfStatement'],
      'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
      'prefer-template': 'error',
      quotes: ['error', 'single', { avoidEscape: true }],
    },
  },
  // TypeScript Eslint
  {
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
    },
  },
  // Unicorn
  {
    plugins: {
      unicorn: unicornPlugin,
    },
    rules: {
      'unicorn/empty-brace-spaces': 'off',
      'unicorn/no-null': 'off',
    },
  },
  pluginJs.configs.recommended,
  ...tsPlugin.configs.recommended,
  eslintConfigPrettier,
]);
