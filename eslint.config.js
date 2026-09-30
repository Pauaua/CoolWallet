// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'coverage/*', 'node_modules/*'],
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Los colores solo se definen en src/theme/.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/theme/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^#[0-9a-fA-F]+$/]',
          message: 'Usa los tokens de color de src/theme en vez de colores literales.',
        },
        {
          selector: 'Literal[value=/^(rgb|hsl)a?[(]/]',
          message: 'Usa los tokens de color de src/theme en vez de colores literales.',
        },
      ],
    },
  },
]);
