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
const ALLOWED_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN',
  'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'OFFSET', 'AS', 'ON',
  'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'CROSS JOIN',
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'DISTINCT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'IS NULL', 'IS NOT NULL', 'EXISTS', 'CAST', 'COALESCE', 'NULLIF',
  'ASC', 'DESC', 'UNION', 'UNION ALL'
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
  /;\s*--/i,  // SQL 注入尝试
  /'\s*OR\s+'1'\s*=\s*'1/i,  // SQL 注入
  /UNION\s+ALL\s+SELECT.*FROM/i  // UNION 注入
];

/**
 * SQL 验证器类
 */
export class SqlValidator {
  private maxQueryTime: number;
  private maxRows: number;
  private allowedTables: string[];

  constructor(options?: {
    maxQueryTime?: number;
    maxRows?: number;
    allowedTables?: string[];
  }) {
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
      warnings.push('No LIMIT specified, results will be capped at ' + this.maxRows);
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

    return {
      isValid: true,
      warnings: warnings.length > 0 ? warnings : undefined
    };
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
