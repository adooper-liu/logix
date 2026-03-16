/**
 * 数据库结构读取器
 * Database Schema Reader
 *
 * 读取数据库表结构，为 Text-to-SQL 提供上下文
 */

import { AppDataSource } from '../../database';
import { logger } from '../../utils/logger';
import { ColumnInfo, TableInfo } from '../types';
import { cacheManager } from './cacheManager';

/**
 * 表前缀分类
 */
const TABLE_PREFIXES = {
  dict: 'dict_',
  biz: 'biz_',
  process: 'process_',
  ext: 'ext_'
};

/**
 * 数据库结构读取器类
 */
export class SchemaReader {
  private cache: Map<string, TableInfo[]> = new Map();
  private cacheTime: number = 0;
  private cacheTTL: number = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 获取所有表信息
   */
  async getAllTables(): Promise<TableInfo[]> {
    // 检查缓存
    if (this.cache.has('all') && Date.now() - this.cacheTime < this.cacheTTL) {
      return this.cache.get('all')!;
    }

    try {
      const tables = await AppDataSource.query(`
        SELECT 
          table_name,
          table_type
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);

      const tableInfos: TableInfo[] = [];

      for (const table of tables) {
        const columns = await this.getTableColumns(table.table_name);
        tableInfos.push({
          tableName: table.table_name,
          tableType: this.getTableType(table.table_name),
          columns
        });
      }

      this.cache.set('all', tableInfos);
      this.cacheTime = Date.now();

      return tableInfos;
    } catch (error) {
      logger.error('[SchemaReader] Error fetching tables:', error);
      return [];
    }
  }

  /**
   * 获取指定表的列信息
   */
  async getTableColumns(tableName: string): Promise<ColumnInfo[]> {
    try {
      const columns = await AppDataSource.query(
        `
        SELECT 
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default,
          CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
        FROM information_schema.columns c
        LEFT JOIN (
          SELECT ku.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage ku 
            ON tc.constraint_name = ku.constraint_name
          WHERE tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_name = $1
        ) pk ON c.column_name = pk.column_name
        WHERE c.table_name = $1
        AND c.table_schema = 'public'
        ORDER BY c.ordinal_position
      `,
        [tableName]
      );

      // 获取外键信息
      const foreignKeys = await AppDataSource.query(
        `
        SELECT
          kcu.column_name,
          ccu.table_name as foreign_table,
          ccu.column_name as foreign_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = $1
          AND tc.table_schema = 'public'
      `,
        [tableName]
      );

      const fkMap = new Map<string, { table: string; column: string }>();
      for (const fk of foreignKeys) {
        fkMap.set(fk.column_name, {
          table: fk.foreign_table,
          column: fk.foreign_column
        });
      }

      return columns.map((col: any) => ({
        columnName: col.column_name,
        dataType: col.data_type,
        isNullable: col.is_nullable === 'YES',
        isPrimaryKey: col.is_primary_key,
        foreignKey: fkMap.get(col.column_name)
      }));
    } catch (error) {
      logger.error('[SchemaReader] Error fetching columns:', error);
      return [];
    }
  }

  /**
   * 获取表类型
   */
  private getTableType(tableName: string): 'dict' | 'biz' | 'process' | 'ext' {
    for (const [type, prefix] of Object.entries(TABLE_PREFIXES)) {
      if (tableName.startsWith(prefix)) {
        return type as 'dict' | 'biz' | 'process' | 'ext';
      }
    }
    return 'biz';
  }

  /**
   * 生成表结构的文本描述（用于 Prompt）
   */
  async generateSchemaDescription(tables?: string[]): Promise<string> {
    // 生成缓存键
    const cacheKey = tables ? `schema:${tables.sort().join(',')}` : 'schema:all';

    // 尝试从缓存获取
    const cachedDescription = cacheManager.get(cacheKey);
    if (cachedDescription) {
      logger.debug('[SchemaReader] Cache hit for schema description');
      return cachedDescription;
    }

    const allTables = await this.getAllTables();
    const targetTables = tables ? allTables.filter((t) => tables.includes(t.tableName)) : allTables;

    const descriptions: string[] = [];

    for (const table of targetTables) {
      const columnDescs = table.columns
        .map((col) => {
          let desc = `  - ${col.columnName} (${col.dataType})`;
          if (col.isPrimaryKey) desc += ' PK';
          if (!col.isNullable) desc += ' NOT NULL';
          if (col.foreignKey) desc += ` FK→${col.foreignKey.table}.${col.foreignKey.column}`;
          return desc;
        })
        .join('\n');

      descriptions.push(`## ${table.tableName} [${table.tableType}]\n${columnDescs}`);
    }

    const description = descriptions.join('\n\n');

    // 缓存结果
    cacheManager.set(cacheKey, description, 10 * 60 * 1000); // 10分钟缓存

    return description;
  }

  /**
   * 根据表名获取表信息
   */
  async getTableInfo(tableName: string): Promise<TableInfo | null> {
    const allTables = await this.getAllTables();
    return allTables.find((t) => t.tableName === tableName) || null;
  }

  /**
   * 搜索表（模糊匹配）
   */
  async searchTables(keyword: string): Promise<TableInfo[]> {
    const allTables = await this.getAllTables();
    const lowerKeyword = keyword.toLowerCase();

    return allTables.filter(
      (t) =>
        t.tableName.toLowerCase().includes(lowerKeyword) ||
        t.columns.some((c) => c.columnName.toLowerCase().includes(lowerKeyword))
    );
  }

  /**
   * 获取表之间的关系
   */
  async getTableRelationships(): Promise<
    {
      fromTable: string;
      fromColumn: string;
      toTable: string;
      toColumn: string;
    }[]
  > {
    try {
      const relationships = await AppDataSource.query(`
        SELECT
          kcu.table_name as from_table,
          kcu.column_name as from_column,
          ccu.table_name as to_table,
          ccu.column_name as to_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
        ORDER BY kcu.table_name, kcu.column_name
      `);

      return relationships;
    } catch (error) {
      logger.error('[SchemaReader] Error fetching relationships:', error);
      return [];
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheTime = 0;
  }
}

/**
 * 默认 SchemaReader 实例
 */
export const schemaReader = new SchemaReader();
