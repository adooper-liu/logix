const namingRules = require('./.eslintrc.naming.js');

module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    '@vue/eslint-config-typescript'
  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    ecmaVersion: 'latest',
    parser: '@typescript-eslint/parser',
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint', 'vue', 'custom-naming-rules'],
  rules: {
    ...namingRules.rules,

    // Vue 特定规则
    'vue/multi-word-component-names': 'off',
    'vue/no-v-html': 'warn',
    'vue/require-default-prop': 'off',
    'vue/no-unused-vars': 'warn',
    'vue/html-indent': ['error', 2],
    'vue/max-attributes-per-line': ['error', { singleline: 3, multiline: 1 }],
    'vue/component-definition-name-casing': ['error', 'PascalCase'],

    // TypeScript 特定规则（强化类型安全）
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }
    ],
    '@typescript-eslint/no-explicit-any': 'error', // ❌ 禁止 any 类型
    '@typescript-eslint/explicit-module-boundary-types': 'error', // 🔴 升级为错误：强制返回类型注解
    '@typescript-eslint/no-non-null-assertion': 'error', // 🔴 升级为错误：禁止使用 !

    // 通用规则（强化代码质量）
    'no-console': 'error', // ❌ 禁止 console.log
    'no-debugger': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'no-duplicate-imports': 'error',
    
    // 复杂度控制（强制单一职责）
    'max-lines-per-function': ['error', { // 🔴 升级为错误：函数 ≤ 50 行
      max: 50, 
      skipBlankLines: true,
      skipComments: true,
      IIFEs: true
    }],
    'complexity': ['error', 10], // 🔴 升级为错误：圈复杂度 ≤ 10
    'max-depth': ['error', 4], // 🔴 升级为错误：嵌套深度 ≤ 4

    // 代码风格
    'indent': 'off', // 使用 Prettier
    'quotes': 'off', // 使用 Prettier
    'semi': 'off', // 使用 Prettier
    'comma-dangle': 'off', // 使用 Prettier
    'no-trailing-spaces': 'error',
    'eol-last': ['error', 'always'],
    'max-len': ['error', { code: 120, ignoreUrls: true }], // 🔴 升级为错误：行宽 ≤ 120,

    // 自定义命名规则
    'custom-naming-rules/vue-component-filename': 'error',
    'custom-naming-rules/composable-function-name': 'error',
    'custom-naming-rules/api-function-naming': 'warn',
    'custom-naming-rules/template-class-name-kebab': 'warn'
  }
}
