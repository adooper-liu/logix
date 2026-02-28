const namingRules = require('./.eslintrc.naming.js');

module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true
  },
  extends: ['eslint:recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json'
  },
  plugins: ['@typescript-eslint', 'custom-naming-rules'],
  rules: {
    ...namingRules.rules,

    // TypeScript 特定规则
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }
    ],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-floating-promises': 'warn',

    // 通用规则
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    'no-debugger': 'error',
    'no-unused-vars': 'off', // 使用 TypeScript 版本
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-template': 'error',
    'no-duplicate-imports': 'error',
    'no-undef': ['error', { globals: { NodeJS: 'readonly' } }],

    // 代码风格（与 Prettier 配置保持一致）
    'indent': 'off',
    'quotes': 'off',
    'semi': 'off',
    'comma-dangle': 'off',
    'no-trailing-spaces': 'error',
    'eol-last': ['error', 'always'],
    'max-len': ['warn', { code: 120, ignoreUrls: true }],

    // 自定义命名规则
    'custom-naming-rules/entity-class-name': 'error',
    'custom-naming-rules/entity-property-name': 'warn',
    'custom-naming-rules/table-name-snake-case': 'error',
    'custom-naming-rules/interface-name-with-prefix': 'error'
  }
}
