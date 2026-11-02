import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import json from 'eslint-plugin-json';
import globals from 'globals';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname, recommendedConfig: js.configs.recommended });

export default [
  {
    ignores: ['eslint.config.mjs', 'build', 'dist', 'web-ext-artifacts', 'src/js/depends/dragscroll.js'],
  },
  ...compat.extends('airbnb-base'),
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.webextensions },
    },
    rules: {
      'import/extensions': 0,
      'import/no-cycle': 0,
      'no-param-reassign': 0,
      'no-console': 0,
      'no-alert': 0,
    },
  },
  { files: ['**/*.json'], ...json.configs.recommended },
];
