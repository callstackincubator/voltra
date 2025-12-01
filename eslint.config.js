/* eslint-env node */
const path = require('path')
const { defineConfig } = require('eslint/config')

const repoRoot = process.cwd()
const expoConfig = require('eslint-config-expo/flat')
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended')
const simpleImportSort = require('eslint-plugin-simple-import-sort')

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    ignores: ['build/*', 'plugin/build/*'],
  },
  defineConfig([
    {
      files: ['example/webpack.config.js'],
      languageOptions: {
        globals: {
          __dirname: 'readonly',
        },
      },
    },
    {
      basePath: 'example',
      settings: {
        'import/resolver': {
          alias: {
            map: [
              ['voltra', path.join(repoRoot, 'src')],
              ['~', path.join(repoRoot, 'example')],
            ],
            extensions: ['.ts', '.tsx', '.js', '.jsx'],
          },
        },
      },
    },
    {
      plugins: {
        'simple-import-sort': simpleImportSort,
      },
      rules: {
        'simple-import-sort/imports': 'error',
        'simple-import-sort/exports': 'error',
      },
    },
  ]),
])
