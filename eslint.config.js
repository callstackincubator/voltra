/* eslint-env node */
const { defineConfig } = require('eslint/config')

const expoConfig = require('eslint-config-expo/flat')
const prettierConfig = require('eslint-config-prettier')
const simpleImportSort = require('eslint-plugin-simple-import-sort')

module.exports = defineConfig([
  // Base Expo configuration
  expoConfig,

  // Prettier config to disable conflicting rules
  prettierConfig,

  // Ignore build artifacts and generated files
  {
    ignores: [
      'build/',
      'plugin/build/',
      'node_modules/',
      '**/*.d.ts',
      'coverage/',
      'example/',
      'website/',
      'generator/',
      '**/__tests__/',
    ],
  },

  // Configuration files settings
  {
    files: ['**/babel.config.js', '**/*.config.js', '**/.eslintrc.js'],
    languageOptions: {
      globals: {
        __dirname: 'readonly',
        module: 'readonly',
        require: 'readonly',
        process: 'readonly',
      },
    },
  },

  // Test files settings
  {
    files: ['**/__tests__/**/*', '**/*.test.ts', '**/*.test.tsx'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        test: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  },

  // Import sorting rules
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },

  // TypeScript-specific rules
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Prefer type imports for better tree-shaking
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],

      // Disable rules that TypeScript handles better
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
])
