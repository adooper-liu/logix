/**
 * SQL 安全验证器
 * SQL Security Validator
 *
 * 防止危险操作，仅允许安全的 SELECT 查询
 */

import { logger } from '../../utils/logger';

/**
 * SQL 验证结果
 */
export interface SqlValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * 允许的 SQL 关键词
 */
const _ALLOWED_KEYWORDS = [
  'SELECT',
  'FROM',
  'WHERE',
  'AND',
  'OR',
  'NOT',
  'IN',
  'LIKE',
  'BETWEEN',
  'ORDER BY',
  'GROUP BY',
  'HAVING',
  'LIMIT',
  'OFFSET',
  'AS',
  'ON',
  'JOIN',
  'INNER JOIN',
  'LEFT JOIN',
  'RIGHT JOIN',
  'CROSS JOIN',
  'COUNT',
  'SUM',
  'AVG',
  'MIN',
  'MAX',
  'DISTINCT',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'IS NULL',
  'IS NOT NULL',
  'EXISTS',
  'CAST',
  'COALESCE',
  'NULLIF',
  'ASC',
  'DESC',
  'UNION',
  'UNION ALL',
  'INTERSECT',
  'EXCEPT',
  'WITH',
  'OVER',
  'PARTITION BY',
  'ROW_NUMBER',
  'RANK',
  'DENSE_RANK',
  'FIRST_VALUE',
  'LAST_VALUE',
  'LEAD',
  'LAG',
  'NTH_VALUE',
  'PERCENT_RANK',
  'CUME_DIST',
  'NTILE',
  'ARRAY_AGG',
  'STRING_AGG',
  'JSON_AGG',
  'JSONB_AGG',
  'XMLAGG',
  'MIN',
  'MAX',
  'SUM',
  'AVG',
  'COUNT',
  'COUNT DISTINCT',
  'VAR_POP',
  'VAR_SAMP',
  'STDDEV_POP',
  'STDDEV_SAMP',
  'MODE',
  'MEDIAN',
  'PERCENTILE_CONT',
  'PERCENTILE_DISC',
  'DATE_TRUNC',
  'DATE_PART',
  'EXTRACT',
  'TO_CHAR',
  'TO_DATE',
  'TO_TIMESTAMP',
  'NOW',
  'CURRENT_DATE',
  'CURRENT_TIME',
  'CURRENT_TIMESTAMP',
  'INTERVAL',
  'AGE',
  'OVERLAPS',
  'CONCAT',
  'SUBSTRING',
  'LENGTH',
  'TRIM',
  'LTRIM',
  'RTRIM',
  'LOWER',
  'UPPER',
  'INITCAP',
  'REPLACE',
  'REGEXP_REPLACE',
  'SPLIT_PART',
  'POSITION',
  'STRPOS',
  'ARRAY',
  'ARRAY_LENGTH',
  'UNNEST',
  'ARRAY_TO_STRING',
  'STRING_TO_ARRAY',
  'JSONB',
  'JSON',
  'JSONB_BUILD_OBJECT',
  'JSONB_BUILD_ARRAY',
  'JSONB_AGG',
  'JSONB_OBJECT_AGG',
  'JSONB_ARRAY_ELEMENTS',
  'JSONB_OBJECT_KEYS',
  'JSONB_EXTRACT_PATH',
  'JSONB_EXTRACT_PATH_TEXT',
  'JSONB_SET',
  'JSONB_REMOVE',
  'JSONB_INSERT',
  'JSONB_ARRAY_APPEND',
  'JSONB_ARRAY_PREPEND',
  'JSONB_ARRAY_ELEMENTS_TEXT',
  'JSONB_TO_RECORD',
  'JSONB_TO_RECORDSET',
  'ILIKE',
  'SIMILAR TO',
  'NOT LIKE',
  'NOT ILIKE',
  'NOT SIMILAR TO',
  'ANY',
  'SOME',
  'ALL',
  'SINGLE ROW',
  'MULTISET',
  'TABLE',
  'VALUES',
  'DEFAULT',
  'NULL',
  'TRUE',
  'FALSE',
  'BOOLEAN',
  'INTEGER',
  'BIGINT',
  'SMALLINT',
  'REAL',
  'DOUBLE PRECISION',
  'NUMERIC',
  'DECIMAL',
  'VARCHAR',
  'CHAR',
  'TEXT',
  'DATE',
  'TIME',
  'TIMESTAMP',
  'TIMESTAMPTZ',
  'INTERVAL',
  'BYTEA',
  'UUID',
  'JSON',
  'JSONB',
  'XML',
  'POINT',
  'LINE',
  'LSEG',
  'BOX',
  'PATH',
  'POLYGON',
  'CIRCLE',
  'CIDR',
  'INET',
  'MACADDR',
  'TSVECTOR',
  'TSQUERY'
];

/**
 * 禁止的 SQL 关键词/模式
 */
const FORBIDDEN_PATTERNS = [
  /INSERT\s+INTO/i,
  /UPDATE\s+.+\s+SET/i,
  /DELETE\s+FROM/i,
  /DROP\s+(TABLE|DATABASE|INDEX|VIEW)/i,
  /TRUNCATE/i,
  /ALTER\s+TABLE/i,
  /CREATE\s+(TABLE|DATABASE|INDEX|VIEW|PROCEDURE|FUNCTION)/i,
  /GRANT/i,
  /REVOKE/i,
  /EXECUTE/i,
  /CALL\s+/i,
  /;\s*--/i, // SQL 注入尝试
  /'\s*OR\s+'1'\s*=\s*'1/i, // SQL 注入
  /UNION\s+ALL\s+SELECT.*FROM/i, // UNION 注入
  /'\s*OR\s+1\s*=\s*1/i, // SQL 注入
  /'\s*;\s*DROP/i, // SQL 注入
  /'\s*;\s*DELETE/i, // SQL 注入
  /'\s*;\s*UPDATE/i, // SQL 注入
  /'\s*;\s*INSERT/i, // SQL 注入
  /'\s*AND\s+1\s*=\s*1/i, // SQL 注入
  /'\s*AND\s+1\s*=\s*0/i, // SQL 注入
  /\bEXEC\b/i, // 执行存储过程
  /\bxp_/i, // 扩展存储过程
  /\bsp_/i, // 系统存储过程
  /\bCREATE\s+PROCEDURE\b/i, // 创建存储过程
  /\bALTER\s+PROCEDURE\b/i, // 修改存储过程
  /\bDROP\s+PROCEDURE\b/i, // 删除存储过程
  /\bEXECUTE\s+AS\b/i, // 执行上下文切换
  /\bWITH\s+EXECUTE\s+AS\b/i, // 执行上下文切换
  /\bOPENQUERY\b/i, // 链接服务器查询
  /\bOPENDATASOURCE\b/i, // 链接服务器查询
  /\bOPENROWSET\b/i, // 链接服务器查询
  /\bBULK\s+INSERT\b/i, // 批量插入
  /\bxp_cmdshell\b/i, // 执行命令
  /\bsp_configure\b/i, // 系统配置
  /\breconfigure\b/i, // 重新配置
  /\bSHUTDOWN\b/i, // 关闭服务器
  /\bKILL\b/i, // 终止进程
  /\bDBCC\b/i, // 数据库控制台命令
  /\bBACKUP\b/i, // 备份
  /\bRESTORE\b/i, // 恢复
  /\bCHECKPOINT\b/i, // 检查点
  /\bALTER\s+DATABASE\b/i, // 修改数据库
  /\bCREATE\s+DATABASE\b/i, // 创建数据库
  /\bDROP\s+DATABASE\b/i, // 删除数据库
  /\bUSE\s+\w+/i, // 切换数据库
  /\bSET\s+\w+\s*=/i, // 设置系统变量
  /\bDECLARE\s+@/i, // 声明变量
  /\bEXEC\s+sp_/i, // 执行系统存储过程
  /\bEXEC\s+xp_/i // 执行扩展存储过程
];

/**
 * SQL 验证器类
 */
export class SqlValidator {
  private maxQueryTime: number;
  private maxRows: number;
  private allowedTables: string[];

  constructor(options?: { maxQueryTime?: number; maxRows?: number; allowedTables?: string[] }) {
    this.maxQueryTime = options?.maxQueryTime ?? 30000; // 30秒
    this.maxRows = options?.maxRows ?? 1000; // 1000行
    this.allowedTables = options?.allowedTables ?? [];
  }

  /**
   * 验证 SQL 查询
   */
  validate(sql: string): SqlValidationResult {
    const warnings: string[] = [];

    // 1. 检查是否为空
    if (!sql || sql.trim().length === 0) {
      return {
        isValid: false,
        error: 'SQL query cannot be empty'
      };
    }

    // 2. 检查是否只包含允许的关键词
    const upperSql = sql.toUpperCase();

    // 必须以 SELECT 开头
    if (!upperSql.trim().startsWith('SELECT')) {
      return {
        isValid: false,
        error: 'Only SELECT queries are allowed'
      };
    }

    // 3. 检查禁止的模式
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(sql)) {
        logger.warn('[SqlValidator] Forbidden pattern detected:', pattern.source);
        return {
          isValid: false,
          error: `Forbidden SQL pattern detected: ${pattern.source}`
        };
      }
    }

    // 4. 检查是否有 SELECT * 警告
    if (/SELECT\s+\*/i.test(sql)) {
      warnings.push('Using SELECT * is not recommended, specify columns explicitly');
    }

    // 5. 检查是否有无 LIMIT 的查询
    if (!/LIMIT\s+\d+/i.test(sql)) {
      warnings.push(`No LIMIT specified, results will be capped at ${  this.maxRows}`);
    }

    // 6. 检查是否有潜在的多表查询问题
    if (!/JOIN/i.test(upperSql) && upperSql.includes('WHERE')) {
      // 单表查询，检查是否指定了表
      const tableMatch = sql.match(/FROM\s+(\w+)/i);
      if (!tableMatch) {
        return {
          isValid: false,
          error: 'Could not identify table in query'
        };
      }
    }

    // 7. 如果配置了允许的表，检查是否在允许列表中
    if (this.allowedTables.length > 0) {
      const tableMatches = sql.match(/FROM\s+(\w+)|JOIN\s+(\w+)/gi) || [];
      for (const match of tableMatches) {
        const tableName = match.split(/\s+/)[1]?.toLowerCase();
        if (tableName && !this.allowedTables.includes(tableName)) {
          return {
            isValid: false,
            error: `Table "${tableName}" is not in the allowed list`
          };
        }
      }
    }

    // 8. 检查危险的字符序列
    const dangerousChars = [
      ';',
      '--',
      '/*',
      '*/',
      'xp_',
      'sp_',
      'EXEC',
      'EXECUTE',
      'CREATE',
      'DROP',
      'ALTER',
      'INSERT',
      'UPDATE',
      'DELETE',
      'TRUNCATE',
      'GRANT',
      'REVOKE',
      'SHUTDOWN',
      'KILL'
    ];

    for (const char of dangerousChars) {
      if (sql.toUpperCase().includes(char)) {
        // 排除合法的使用情况
        if (!this.isLegitimateUse(sql, char)) {
          return {
            isValid: false,
            error: `Dangerous character sequence detected: ${char}`
          };
        }
      }
    }

    // 9. 检查参数化查询
    if (sql.includes('?') || sql.includes('$')) {
      warnings.push('Parameterized queries detected, ensure proper parameter binding');
    }

    // 10. 检查查询长度
    if (sql.length > 10000) {
      return {
        isValid: false,
        error: 'SQL query too long, maximum length is 10000 characters'
      };
    }

    // 11. 检查嵌套深度
    const parenthesesCount = (sql.match(/\(/g) || []).length;
    if (parenthesesCount > 10) {
      return {
        isValid: false,
        error: 'SQL query too complex, maximum nested depth is 10'
      };
    }

    return {
      isValid: true,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * 检查是否为合法的使用情况
   */
  private isLegitimateUse(sql: string, char: string): boolean {
    // 检查注释中的使用
    if (char === '--' || char === '/*' || char === '*/') {
      return true;
    }

    // 检查 JOIN 中的使用（如 INNER JOIN）
    if (char === 'JOIN') {
      return true;
    }

    // 检查函数中的使用（如 COUNT(*), MAX(*)）
    if (char === '*' && /\w+\(\*/.test(sql)) {
      return true;
    }

    // 检查字符串字面量中的使用
    const stringMatches = sql.match(/'([^']*)'/g);
    if (stringMatches) {
      for (const match of stringMatches) {
        if (match.includes(char)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 清理和规范化 SQL
   */
  sanitize(sql: string): string {
    // 移除多余的空白
    let sanitized = sql.replace(/\s+/g, ' ').trim();

    // 移除注释
    sanitized = sanitized.replace(/--.*$/gm, '');
    sanitized = sanitized.replace(/\/\*.*?\*\//gs, '');

    // 添加 LIMIT 如果没有
    if (!/LIMIT\s+\d+/i.test(sanitized)) {
      sanitized = `${sanitized} LIMIT ${this.maxRows}`;
    }

    return sanitized;
  }

  /**
   * 提取查询中的表名
   */
  extractTables(sql: string): string[] {
    const tables: string[] = [];
    const tableMatches = sql.matchAll(/(?:FROM|JOIN)\s+(\w+)/gi);

    for (const match of tableMatches) {
      const tableName = match[1].toLowerCase();
      if (!tables.includes(tableName)) {
        tables.push(tableName);
      }
    }

    return tables;
  }

  /**
   * 估算查询复杂度（简单实现）
   */
  estimateComplexity(sql: string): 'simple' | 'medium' | 'complex' {
    const upperSql = sql.toUpperCase();
    let score = 0;

    // JOIN 数量
    const joinCount = (upperSql.match(/JOIN/g) || []).length;
    score += joinCount * 2;

    // 子查询
    const subqueryCount = (upperSql.match(/\(SELECT/g) || []).length;
    score += subqueryCount * 3;

    // 聚合函数
    const aggCount = (upperSql.match(/\b(COUNT|SUM|AVG|MIN|MAX)\b/g) || []).length;
    score += aggCount;

    // LIKE 查询
    if (/LIKE/i.test(sql)) score += 1;

    // GROUP BY
    if (/GROUP BY/i.test(sql)) score += 1;

    if (score <= 3) return 'simple';
    if (score <= 7) return 'medium';
    return 'complex';
  }

  /**
   * 验证并返回清理后的 SQL
   */
  validateAndSanitize(sql: string): SqlValidationResult {
    const validation = this.validate(sql);

    if (!validation.isValid) {
      return validation;
    }

    return {
      isValid: true,
      warnings: validation.warnings,
      error: undefined
    };
  }
}

/**
 * 默认 SQL 验证器实例
 */
export const sqlValidator = new SqlValidator({
  maxQueryTime: 30000,
  maxRows: 1000
});
