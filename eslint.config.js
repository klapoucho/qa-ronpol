import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import playwright from 'eslint-plugin-playwright';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      'node_modules',
      'playwright-report',
      'test-results',
      'blob-report',
      'reports',
      '.claude',
      '.qa',
    ],
  },
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['eslint.config.js'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    ...playwright.configs['flat/recommended'],
    files: ['tests/**', 'src/**'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/no-wait-for-timeout': 'error',
    },
  },
  {
    files: ['tests/**/*.spec.ts'],
    rules: {
      // FR-05: specs take test and expect from the fixtures entry point. Type imports stay allowed.
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@playwright/test',
              allowTypeImports: true,
              message: "Import test and expect from '#src/fixtures/index.ts' (FR-05).",
            },
          ],
        },
      ],
    },
  },
  prettier,
);
