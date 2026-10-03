const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', '.expo/*'] },
  // Патерн «const-об'єкт + однойменний union-тип» (src/types/enums.ts) — свідомий
  { rules: { '@typescript-eslint/no-redeclare': 'off' } },
]);
