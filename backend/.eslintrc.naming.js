/**
 * LogiX Backend 命名规范规则
 * 
 * 规则说明：
 * - 数据库表名: snake_case (如: port_operations, replenishment_orders)
 * - 实体类名: PascalCase + 对应表名 (如: PortOperation, ReplenishmentOrder)
 * - 字典表实体: Dict + PascalCase (如: DictPort, DictShippingCompany)
 * - 接口/类型: PascalCase + I 前缀 (如: IContainer, ICreateContainerDto)
 * - 枚举: PascalCase + Enum 后缀 (如: LogisticsStatusEnum)
 * - 常量: UPPER_SNAKE_CASE
 * - 变量/函数: camelCase
 * - 类名: PascalCase
 */

module.exports = {
  rules: {
    // TypeScript 命名约定
    '@typescript-eslint/naming-convention': [
      'error',
      // 类名和接口名：PascalCase
      {
        selector: 'class',
        format: ['PascalCase'],
        custom: {
          regex: '^(I[A-Z]|[A-Z][a-z])',
          match: false
        }
      },
      {
        selector: 'interface',
        format: ['PascalCase'],
        prefix: ['I'],
        custom: {
          regex: '^I[A-Z][a-zA-Z0-9]*$',
          match: true
        }
      },
      // 类型别名：PascalCase
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

    // 数据库表名和字段名检查（通过注释）
    'valid-jsdoc': [
      'warn',
      {
        prefer: {
          arg: 'param',
          return: 'returns',
          argtype: 'type'
        },
        preferType: {
          Boolean: 'boolean',
          Number: 'number',
          object: 'Object',
          function: 'Function'
        }
      }
    ]
  },

  // 自定义规则（通过插件实现更严格的检查）
  plugins: ['custom-naming-rules']
};
