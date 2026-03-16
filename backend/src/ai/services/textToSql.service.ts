/**
 * Text-to-SQL 服务
 * Text-to-SQL Service
 *
 * 将自然语言转换为 SQL 查询
 */

import { AppDataSource } from '../../database';
import { logger } from '../../utils/logger';
import { SiliconFlowAdapter } from '../adapters/SiliconFlowAdapter';
import { TextToSqlRequest, TextToSqlResponse } from '../types';
import { SchemaReader } from '../utils/schemaReader';
import { SqlValidator } from '../utils/sqlValidator';

/**
 * Text-to-SQL 服务类
 */
export class TextToSqlService {
  private adapter: SiliconFlowAdapter;
  private validator: SqlValidator;
  private schemaReader: SchemaReader;

  constructor() {
    this.adapter = new SiliconFlowAdapter({
      provider: 'siliconflow',
      model: process.env.SILICON_FLOW_MODEL || 'deepseek-ai/DeepSeek-V2-Chat'
    });
    this.validator = new SqlValidator();
    this.schemaReader = new SchemaReader();
  }

  /**
   * 生成 SQL
   */
  async generateSql(request: TextToSqlRequest): Promise<TextToSqlResponse> {
    try {
      // 1. 获取数据库结构
      const schemaDescription = await this.schemaReader.generateSchemaDescription(request.tables);

      // 2. 构建 Prompt
      const systemPrompt = `你是一个 SQL 专家，专门为 PostgreSQL 数据库生成查询语句。

## 数据库结构
${schemaDescription}

## 重要规则
1. 只生成 SELECT 查询，不要生成 INSERT/UPDATE/DELETE
2. 表名使用实际表名，不要使用别名
3. 列名使用实际列名
4. 日期格式：YYYY-MM-DD
5. 如果用户问题涉及多个表，使用 JOIN 连接
6. 如果不确定，返回一个简单的查询或空查询

## 返回格式
只返回 SQL 语句，不要返回任何解释或 Markdown 格式。
如果无法生成有效的 SQL，返回 "INVALID_QUERY"
`;

      const userPrompt = `请为以下问题生成 SQL 查询：
"${request.query}"

请只返回 SQL 语句，不要其他内容。`;

      // 3. 调用 AI 生成 SQL
      const result = await this.adapter.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);

      if (!result.success || !result.result) {
        return {
          success: false,
          sql: '',
          error: result.error || 'Failed to generate SQL'
        };
      }

      // 4. 提取 SQL
      let generatedSql = result.result.toString().trim();

      // 清理 Markdown 格式
      generatedSql = generatedSql
        .replace(/^```sql\s*/i, '')
        .replace(/^```\s*$/gm, '')
        .trim();

      // 5. 验证 SQL
      const validation = this.validator.validate(generatedSql);
      if (!validation.isValid) {
        return {
          success: false,
          sql: generatedSql,
          error: validation.error || 'Invalid SQL'
        };
      }

      // 6. 清理 SQL
      const sanitizedSql = this.validator.sanitize(generatedSql);

      return {
        success: true,
        sql: sanitizedSql,
        rowCount: 0 // 尚未执行
      };
    } catch (error: any) {
      logger.error('[TextToSqlService] Error generating SQL:', error);
      return {
        success: false,
        sql: '',
        error: error.message
      };
    }
  }

  /**
   * 执行 SQL
   */
  async executeSql(sql: string, limit?: number): Promise<TextToSqlResponse> {
    try {
      // 规范化 SQL：移除末尾分号、修正 "; LIMIT" 为 " LIMIT"（AI 可能生成错误格式）
      let normalizedSql = sql
        .trim()
        .replace(/;\s*(?=LIMIT\s+\d+)/i, ' ')
        .replace(/;\s*$/, '');
      if (normalizedSql !== sql) sql = normalizedSql;

      // 验证 SQL
      const validation = this.validator.validate(sql);
      if (!validation.isValid) {
        return {
          success: false,
          sql,
          error: validation.error || 'Invalid SQL'
        };
      }

      // 添加 LIMIT
      let querySql = sql;
      const maxLimit = limit || 1000;
      if (!/LIMIT\s+\d+/i.test(sql)) {
        querySql = `${sql} LIMIT ${maxLimit}`;
      }

      // 尝试从缓存获取
      const cachedResult = cacheManager.getCachedSqlQuery(querySql);
      if (cachedResult) {
        logger.info('[TextToSqlService] Cache hit for SQL query');
        return cachedResult;
      }

      // 执行查询
      const startTime = Date.now();
      const data = await AppDataSource.query(querySql);
      const executionTime = Date.now() - startTime;

      logger.info(
        `[TextToSqlService] Query executed in ${executionTime}ms, returned ${Array.isArray(data) ? data.length : 0} rows`
      );

      const result: TextToSqlResponse = {
        success: true,
        sql,
        data: Array.isArray(data) ? data : [],
        rowCount: Array.isArray(data) ? data.length : 0
      };

      // 缓存结果
      cacheManager.cacheSqlQuery(querySql, result);

      return result;
    } catch (error: any) {
      logger.error('[TextToSqlService] Error executing SQL:', error);
      return {
        success: false,
        sql,
        error: error.message,
        rowCount: 0
      };
    }
  }

  /**
   * 生成并执行 SQL
   */
  async generateAndExecute(request: TextToSqlRequest): Promise<TextToSqlResponse> {
    // 1. 生成 SQL
    const generateResult = await this.generateSql(request);
    if (!generateResult.success) {
      return generateResult;
    }

    // 2. 执行 SQL
    return await this.executeSql(generateResult.sql, request.limit);
  }

  /**
   * 预览 SQL（不执行）
   */
  async preview(request: TextToSqlRequest): Promise<TextToSqlResponse> {
    return await this.generateSql(request);
  }

  /**
   * 获取数据库表列表
   */
  async getTables(): Promise<{ tableName: string; tableType: string }[]> {
    const tables = await this.schemaReader.getAllTables();
    return tables.map((t) => ({
      tableName: t.tableName,
      tableType: t.tableType
    }));
  }

  /**
   * 获取表的列信息
   */
  async getTableColumns(tableName: string): Promise<any[]> {
    const tableInfo = await this.schemaReader.getTableInfo(tableName);
    return tableInfo?.columns || [];
  }
}

/**
 * 默认 TextToSqlService 实例
 */
export const textToSqlService = new TextToSqlService();
