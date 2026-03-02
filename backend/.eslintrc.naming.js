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
      // 类名：PascalCase
      {
        selector: 'class',
        format: ['PascalCase']
      },
      // 接口名：PascalCase，必须以I开头
      {
        selector: 'interface',
        format: ['PascalCase'],
        prefix: ['I']
      },
      // 类型别名：PascalCase
      {
        selector: 'typeAlias',
        format: ['PascalCase']
      },
      // 枚举：PascalCase
      {
        selector: 'enum',
        format: ['PascalCase']
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
      // 属性：camelCase
      {
        selector: 'property',
        format: ['camelCase'],
        leadingUnderscore: 'allow'
      },
      // 方法：camelCase
      {
        selector: 'method',
        format: ['camelCase']
      },
      // 参数：camelCase
      {
        selector: 'parameter',
        format: ['camelCase'],
        leadingUnderscore: 'allow'
      }
    ]
  }
};
