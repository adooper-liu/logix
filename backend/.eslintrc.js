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
  plugins: ['@typescript-eslint'],
  rules: {
    ...namingRules.rules,

    // TypeScript 特定规则（强化类型安全）
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }
    ],
    '@typescript-eslint/no-explicit-any': 'error', // ❌ 禁止 any 类型
    '@typescript-eslint/explicit-module-boundary-types': 'error', // 🔴 升级为错误：强制返回类型注解
    '@typescript-eslint/explicit-function-return-type': 'off', // 可选，避免过度约束
    '@typescript-eslint/no-non-null-assertion': 'error', // 🔴 升级为错误：禁止使用 !
    '@typescript-eslint/no-floating-promises': 'error', // ✅ 必须处理 Promise
    '@typescript-eslint/typedef': [
      'warn',
      {
        parameter: true,
        propertyDeclaration: true
      }
    ],

    // 通用规则（强化代码质量）
    'no-console': 'error', // ❌ 禁止 console.log（允许 warn/error/info）
    'no-debugger': 'error',
    'no-unused-vars': 'off', // 使用 TypeScript 版本
    // TS 函数重载会触发误报，由 @typescript-eslint/no-redeclare 接管（TD-007）
    'no-redeclare': 'off',
    '@typescript-eslint/no-redeclare': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-template': 'error',
    'no-duplicate-imports': 'error',
    'no-undef': 'off', // TypeScript 已经处理了未定义变量检查
    
    // 复杂度控制（强制单一职责）
    'max-lines-per-function': ['error', { // 🔴 升级为错误：函数 ≤ 50 行
      max: 50, 
      skipBlankLines: true,
      skipComments: true,
      IIFEs: true
    }],
    'complexity': ['error', 10], // 🔴 升级为错误：圈复杂度 ≤ 10
    'max-depth': ['error', 4], // 🔴 升级为错误：嵌套深度 ≤ 4
    'max-nested-callbacks': ['error', 3], // 🔴 升级为错误：回调嵌套 ≤ 3

    // 代码风格（与 Prettier 配置保持一致）
    'indent': 'off',
    'quotes': 'off',
    'semi': 'off',
    'comma-dangle': 'off',
    'no-trailing-spaces': 'error',
    'eol-last': ['error', 'always'],
    'max-len': ['error', { code: 120, ignoreUrls: true }] // 🔴 升级为错误：行宽 ≤ 120
  },
  globals: {
    NodeJS: 'readonly'
  }
}