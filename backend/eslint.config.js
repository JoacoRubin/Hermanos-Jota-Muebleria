const js = require('@eslint/js')
const globals = require('globals')

module.exports = [
  {
    ignores: ['node_modules/**', 'coverage/**'],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': [
        'error',
        // Los error handlers de Express necesitan los 4 argumentos aunque
        // no usen `next`, y el patrón `const { password, ...rest }` para
        // descartar campos es deliberado.
        { argsIgnorePattern: '^_|^next$', ignoreRestSiblings: true },
      ],
      'no-console': 'off',
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
]
