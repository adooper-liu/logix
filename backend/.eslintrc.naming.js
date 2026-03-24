/**
 * LogiX Backend 命名规范规则（与存量代码、外部 API/状态码键名兼容）
 *
 * 说明：不再强制 interface 以 I 开头；对象字面量键允许 UPPER_CASE/PascalCase（飞驼/状态码）。
 */

module.exports = {
  rules: {
    '@typescript-eslint/naming-convention': [
      'error',
      { selector: 'class', format: ['PascalCase'] },
      {
        selector: 'interface',
        format: ['PascalCase']
      },
      { selector: 'typeAlias', format: ['PascalCase'] },
      { selector: 'enum', format: ['PascalCase'] },
      {
        selector: 'enumMember',
        format: ['UPPER_CASE', 'PascalCase']
      },
      {
        selector: 'variable',
        // 与 API/请求体 snake_case 解构对齐（TD-007）
        format: ['camelCase', 'UPPER_CASE', 'PascalCase', 'snake_case'],
        leadingUnderscore: 'allow'
      },
      {
        selector: 'property',
        format: ['camelCase', 'UPPER_CASE', 'PascalCase', 'snake_case'],
        leadingUnderscore: 'allow'
      },
      // 状态映射/数组式对象等含数字键、第三方键名，不强制格式
      {
        selector: 'objectLiteralProperty',
        format: null
      },
      { selector: 'function', format: ['camelCase', 'PascalCase'] },
      // 统计 SQL 子查询模板类允许 UPPER_CASE 静态方法名（TD-007）
      { selector: 'method', format: ['camelCase', 'PascalCase', 'UPPER_CASE'] },
      {
        selector: 'parameter',
        format: ['camelCase', 'PascalCase', 'snake_case'],
        leadingUnderscore: 'allow'
      }
    ]
  }
};
