import tsParser from '@typescript-eslint/parser';
import angular from '@angular-eslint/eslint-plugin';
import templateParser from '@angular-eslint/template-parser';
import template from '@angular-eslint/eslint-plugin-template';
export default [
  { ignores: ['node_modules/**', 'server/node_modules/**', 'www/**', '.angular/**', 'artifacts/**'] },
  {
    files: ['src/**/*.ts'],
    languageOptions: { parser: tsParser, parserOptions: { ecmaVersion: 'latest', sourceType: 'module' } },
    plugins: { '@angular-eslint': angular },
    rules: { ...angular.configs.recommended.rules, '@angular-eslint/prefer-inject': 'off', '@angular-eslint/component-class-suffix': ['error', { suffixes: ['Page', 'Component'] }], 'no-debugger': 'error' },
  },
  {
    files: ['src/**/*.html'],
    languageOptions: { parser: templateParser },
    plugins: { '@angular-eslint/template': template },
    rules: { ...template.configs.recommended.rules },
  },
];
