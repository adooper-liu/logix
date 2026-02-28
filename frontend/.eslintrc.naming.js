/**
 * LogiX Frontend 命名规范规则
 * 
 * 规则说明：
 * - 组件名: PascalCase (如: ContainerList.vue, PortOperationsTab.vue)
 * - 组合式函数: use + PascalCase (如: useContainerData, usePortOperations)
 * - 接口/类型: PascalCase + I 前缀 (如: IContainer, IPortOperation)
 * - Props/Emits 定义: camelCase + Props/Emits 后缀
 * - 常量: UPPER_SNAKE_CASE
 * - 变量/函数: camelCase
 * - CSS 类名: kebab-case (如: .container-card, .port-operation-table)
 * - API 请求函数: fetch + PascalCase (如: fetchContainerList, fetchPortOperations)
 */

module.exports = {
  rules: {
    // TypeScript 命名约定
    '@typescript-eslint/naming-convention': [
      'error',
      // 类名：PascalCase
      {
        selector: 'class',
        format: ['PascalCase'],
        custom: {
          regex: '^(I[A-Z]|[A-Z][a-z])',
          match: false
        }
      },
      // 接口名：PascalCase + I 前缀
      {
        selector: 'interface',
        format: ['PascalCase'],
        prefix: ['I'],
        custom: {
          regex: '^I[A-Z][a-zA-Z0-9]*$',
          match: true
        }
      },
      // 类型别名：PascalCase + T 前缀
      {
        selector: 'typeAlias',
        format: ['PascalCase'],
        prefix: ['T']
      },
      // 枚举：PascalCase + Enum 后缀
      {
        selector: 'enum',
        format: ['PascalCase'],
        suffix: ['Enum']
      },
      // 枚举成员：UPPER_SNAKE_CASE
      {
        selector: 'enumMember',
        format: ['UPPER_CASE']
      },
      // 变量和函数：camelCase
      {
        selector: 'variable',
        format: ['camelCase', 'UPPER_CASE']
      },
      {
        selector: 'function',
        format: ['camelCase']
      },
      // 接口属性：camelCase
      {
        selector: 'interfaceProperty',
        format: ['camelCase'],
        leadingUnderscore: 'allow'
      },
      // 类属性：camelCase
      {
        selector: 'classProperty',
        format: ['camelCase'],
        leadingUnderscore: 'allow'
      },
      // 方法和访问器：camelCase
      {
        selector: 'method',
        format: ['camelCase']
      },
      {
        selector: 'accessor',
        format: ['camelCase']
      },
      // 参数：camelCase
      {
        selector: 'parameter',
        format: ['camelCase'],
        leadingUnderscore: 'allow'
      }
    ],

    // Vue 组件命名检查
    'vue/component-definition-name-casing': ['error', 'PascalCase'],
    
    // 组件名必须是多单词
    'vue/multi-word-component-names': 'off', // 允许单单词组件名（如 Container.vue）

    // API 请求函数命名规范（自定义规则）
    'no-restricted-syntax': [
      'error',
      {
        selector: 'FunctionDeclaration',
        message: 'Use arrow functions and proper naming convention: fetchXxx, updateXxx, createXxx, deleteXxx'
      }
    ]
  },

  // 自定义规则检查
  plugins: ['custom-naming-rules', 'vue']
};
