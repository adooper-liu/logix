/**
 * 数据库查询工具
 * 提供只读的数据库查询能力
 * 安全限制：只能执行 SELECT 查询
 */

import { AppDataSource } from '../../database/index.js';
import { mcpLogger } from '../logger.js';

/**
 * 禁止的 SQL 关键词
 */
const FORBIDDEN_KEYWORDS = [
  'INSERT',
  'UPDATE',
  'DELETE',
  'DROP',
  'CREATE',
  'ALTER',
  'TRUNCATE',
  'GRANT',
  'REVOKE',
  'EXEC',
  'EXECUTE',
  'WITH',  // 禁止 WITH（可能用于递归或其他复杂查询）
  'RETURNING',
  'INTO',
];

/**
 * 验证 SQL 是否安全（只允许 SELECT）
 */
function validateSql(sql: string): void {
  const upperSql = sql.toUpperCase().trim();

  // 必须以 SELECT 开头
  if (!upperSql.startsWith('SELECT')) {
    throw new Error('只允许 SELECT 查询操作');
  }

  // 检查禁止的关键词
  for (const keyword of FORBIDDEN_KEYWORDS) {
    // 使用单词边界匹配，避免误报（如 SELECT 中包含 ELECT）
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(upperSql)) {
      throw new Error(`禁止使用 SQL 关键词: ${keyword}`);
    }
  }

  // 禁止多语句（分号分隔）
  if (upperSql.includes(';') && upperSql.split(';').filter(s => s.trim()).length > 1) {
    throw new Error('禁止执行多条 SQL 语句');
  }
}

/**
 * 限制返回结果数量
 */
function limitResults(sql: string, maxRows: number = 100): string {
  const upperSql = sql.toUpperCase();

  // 如果已经有 LIMIT，则不添加
  if (upperSql.includes('LIMIT')) {
    return sql;
  }

  // 在 SQL 末尾添加 LIMIT
  return `${sql} LIMIT ${maxRows}`;
}

/**
 * 获取数据库表列表
 */
async function getTableList(): Promise<string[]> {
  const result = await AppDataSource.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  return result.map((row: any) => row.table_name);
}

/**
 * 获取表结构
 */
async function getTableSchema(tableName: string): Promise<any[]> {
  const result = await AppDataSource.query(`
    SELECT 
      column_name,
      data_type,
      character_maximum_length,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);

  return result;
}

/**
 * 数据库查询工具
 */
export const databaseTool = {
  definition: {
    name: 'query_database',
    description: '查询 LogiX 数据库。安全限制：只能执行 SELECT 查询，禁止 INSERT/UPDATE/DELETE/DROP 等写操作。',
    inputSchema: {
      type: 'object',
      properties: {
        sql: {
          type: 'string',
          description: 'SQL 查询语句（必须是 SELECT 开头）'
        },
        maxRows: {
          type: 'number',
          description: '最大返回行数，默认 100',
          default: 100
        },
        showSchema: {
          type: 'boolean',
          description: '是否显示表结构（当 sql 为表名时有效）',
          default: false
        }
      },
      required: ['sql']
    }
  },

  /**
   * 执行数据库查询
   */
  async execute(args: { sql: string; maxRows?: number; showSchema?: boolean }): Promise<string> {
    const { sql, maxRows = 100, showSchema = false } = args;

    mcpLogger.info('Database query requested', { sql: sql.substring(0, 100) });

    // 验证 SQL 安全性
    validateSql(sql);

    // 限制返回结果
    const safeSql = limitResults(sql, maxRows);

    try {
      // 检查是否是表名查询
      if (showSchema && sql.trim().toUpperCase().startsWith('SHOW')) {
        // SHOW TABLES → 获取表列表
        const tables = await getTableList();

        let result = `LogiX 数据库表列表 (共 ${tables.length} 个表):\n\n`;

        for (const table of tables) {
          result += `📋 ${table}\n`;
        }

        return result;
      }

      // 检查是否是表结构查询
      if (showSchema && sql.trim().match(/^(DESCRIBE|SHOW COLUMNS FROM|TABLE\s+)/i)) {
        const tableName = sql.trim().match(/^(?:DESCRIBE|SHOW COLUMNS FROM|TABLE\s+)\s+(\w+)/i)?.[1];

        if (tableName) {
          const schema = await getTableSchema(tableName);

          let result = `表 ${tableName} 的结构:\n\n`;
          result += `| 字段名 | 类型 | 长度 | 可空 | 默认值 |\n`;
          result += `|--------|------|------|------|--------|\n`;

          for (const col of schema) {
            const len = col.character_maximum_length || '-';
            const nullable = col.is_nullable === 'YES' ? '是' : '否';
            const def = col.column_default || '-';
            result += `| ${col.column_name} | ${col.data_type} | ${len} | ${nullable} | ${def} |\n`;
          }

          return result;
        }
      }

      // 执行查询
      const startTime = Date.now();
      const result = await AppDataSource.query(safeSql);
      const queryTime = Date.now() - startTime;

      // 处理结果
      if (!result || result.length === 0) {
        return `查询成功，但返回 0 条记录\n\nSQL: ${sql}\n耗时: ${queryTime}ms`;
      }

      // 格式化输出
      let output = `✅ 查询成功，返回 ${result.length} 条记录 | 耗时: ${queryTime}ms\n\n`;

      // 如果是对象数组（PostgreSQL 结果）
      if (Array.isArray(result) && result.length > 0) {
        const columns = Object.keys(result[0]);

        // 限制列宽函数
        const truncate = (val: any, maxLen: number = 30): string => {
          if (val === null) return 'NULL';
          if (typeof val === 'object') return JSON.stringify(val).substring(0, maxLen);
          const str = String(val);
          return str.length > maxLen ? `${str.substring(0, maxLen - 2)  }..` : str;
        };

        // 简化列名显示（去除前缀如 container_）
        const simplifyColumn = (col: string): string => {
          const prefix = ['container_', 'bill_of_', 'logistics_', 'is_', 'requires_'];
          for (const p of prefix) {
            if (col.startsWith(p)) return col.substring(p.length);
          }
          return col;
        };

        // 简化后的列名
        const simpleColumns = columns.map(simplifyColumn);

        // 计算每列最大宽度
        const colWidths = simpleColumns.map((col, i) => {
          const headerLen = col.length;
          const maxDataLen = Math.min(...result.slice(0, maxRows).map(row => truncate(row[columns[i]], 50).length));
          return Math.min(Math.max(headerLen, maxDataLen) + 1, 35);
        });

        // 表头
        output += `${simpleColumns.map((col, i) => col.padEnd(colWidths[i])).join(' | ')  }\n`;
        output += `${colWidths.map(w => '-'.repeat(w)).join('-+-')  }\n`;

        // 数据行
        for (const row of result.slice(0, maxRows)) {
          const values = columns.map((col, i) => truncate(row[col], colWidths[i]).padEnd(colWidths[i]));
          output += `${values.join(' | ')  }\n`;
        }

        if (result.length > maxRows) {
          output += `\n📊 还有 ${result.length - maxRows} 条记录未显示`;
        }
      }

      return output;
    } catch (error: any) {
      mcpLogger.error('Database query failed', { error: error.message });
      throw new Error(`查询失败: ${error.message}`);
    }
  }
};
