/**
 * 数据库迁移管理服务
 * 提供迁移脚本的读取、解析、执行功能
 */

import * as fs from 'fs';
import * as path from 'path';
import { AppDataSource } from '../database';
import { logger } from '../utils/logger';

export interface MigrationScript {
  filename: string;
  path: string;
  description: string;
  executedAt?: Date;
  status: 'pending' | 'success' | 'failed' | 'running';
  error?: string;
}

export interface MigrationExecutionResult {
  success: boolean;
  filename: string;
  message: string;
  duration: number;
  error?: string;
}

// 迁移记录表名
const MIGRATION_LOG_TABLE = 'migration_logs';

// 迁移脚本描述映射表（文件名 → 中文描述）
const MIGRATION_DESCRIPTIONS: Record<string, string> = {
  // 数据结构类
  'add_common_ports': '补充常用港口到字典表（萨凡纳、纽约、上海等22个港口）',
  'add_container_number_to_replenishment_orders': '备货单表添加 container_number 外键字段',
  'add_country_concept_comments': '国家概念统一：为相关字段添加语义注释',
  'add_country_to_dict_tables': '清关公司表和拖车公司表添加 country 国家字段',
  'add_country_to_warehouse_trucking_mapping': '创建仓库-车队映射表并添加国家字段',
  'add_daily_capacity_to_trucking_companies': '拖车公司表添加日容量字段（智能排产用）',
  'add_daily_unload_capacity_to_warehouses': '仓库表添加日卸柜能力字段',
  'add_demurrage_calculation_mode': '滞港费计算支持实际/预测两种模式',
  'add_demurrage_record_permanence': '滞港费记录表增加临时/永久标识与计算时间',
  'add_demurrage_standards_and_records': '创建滞港费标准表和滞港费记录表',
  'add_destination_port_to_demurrage_records': '滞港费记录表增加目的港和物流状态字段',
  'add_feituo_import_tables': '创建飞驼Excel导入表（船公司/码头维度）',
  'add_feituo_raw_data_by_group': '飞驼导入表增加按分组存储的原始数据字段',
  'add_inspection_records': '创建查验记录表和查验事件履历表',
  'add_last_free_date_mode': '港口操作表增加 last_free_date_mode 字段',
  'add_savannah_port': '添加萨凡纳港口到字典表',
  'add_schedule_status': '货柜表添加排产状态字段',
  'add_sys_data_change_log': '创建数据变更审计日志表',
  'add_trucking_port_mapping': '创建车队-港口映射表（含费用信息）',

  // 数据回填/修复类
  'backfill_customer_code_from_sell_to_country': '根据销往国家回填客户代码',
  'backfill_last_free_date': '【已废弃】最后免费日计算说明（历史参考）',
  'backfill_last_return_date': '【已废弃】最晚还箱日计算说明（历史参考）',
  'batch-update-all-statuses': '批量更新所有货柜物流状态',
  'convert_date_to_timestamp': '数据类型迁移：date 转为 timestamp',
  'create_resource_occupancy_tables': '创建智能排产资源占用表（仓库/车队/堆场）',
  'create_universal_dict_mapping': '创建通用字典映射表与查询函数',
  'fix-at-port-status': '修复 at_port 状态，排除中转港货柜',
  'fix_port_field_length': '修复港口字段长度（VARCHAR(10) 扩展为 50）',
  'insert_empty_return_data': '导入还箱数据到 process_empty_returns 表',
  'normalize_country_uk_to_gb': '国家代码规范化：UK→GB，子公司名称→国家代码',
  'rollback_timestamp_to_date': '【回滚】数据类型回滚：timestamp 转为 date',
  'update-container-statuses': '根据还箱记录批量更新货柜状态为 returned_empty',
};

export class MigrationService {
  private migrationsPath: string;

  constructor() {
    // migrations 目录相对于项目根目录 (backend的上级目录)
    // process.cwd() 返回 backend/ 目录，所以需要往上一级
    const projectRoot = path.resolve(process.cwd(), '..');
    this.migrationsPath = path.resolve(projectRoot, 'migrations');
  }

  /**
   * 获取 migrations 目录路径
   */
  getMigrationsPath(): string {
    return this.migrationsPath;
  }

  /**
   * 获取所有迁移脚本
   */
  async getAllMigrations(): Promise<MigrationScript[]> {
    try {
      // 确保目录存在
      if (!fs.existsSync(this.migrationsPath)) {
        logger.warn(`[MigrationService] Migrations directory not found: ${this.migrationsPath}`);
        return [];
      }

      // 读取目录下所有 .sql 文件
      const files = fs.readdirSync(this.migrationsPath)
        .filter(f => f.endsWith('.sql'))
        .sort(); // 按文件名排序（确保执行顺序）

      // 获取已执行的迁移记录
      const executedMigrations = await this.getExecutedMigrations();

      return files.map(filename => {
        const filePath = path.join(this.migrationsPath, filename);
        const executed = executedMigrations.find(m => m.filename === filename);

        return {
          filename,
          path: filePath,
          description: this.parseDescription(filePath),
          executedAt: executed?.executed_at,
          status: executed ? 'success' : 'pending'
        };
      });
    } catch (error: any) {
      logger.error('[MigrationService] Error getting migrations:', error);
      throw error;
    }
  }

  /**
   * 获取单个迁移脚本内容
   */
  async getMigrationContent(filename: string): Promise<string> {
    const filePath = path.join(this.migrationsPath, filename);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Migration script not found: ${filename}`);
    }

    return fs.readFileSync(filePath, 'utf-8');
  }

  /**
   * 执行单个迁移脚本
   */
  async executeMigration(filename: string): Promise<MigrationExecutionResult> {
    const startTime = Date.now();

    try {
      // 读取脚本内容
      const content = await this.getMigrationContent(filename);

      // 执行 SQL
      await AppDataSource.query(content);

      // 记录执行结果
      await this.logMigration(filename, 'success');

      const duration = Date.now() - startTime;
      logger.info(`[MigrationService] Executed migration: ${filename} (${duration}ms)`);

      return {
        success: true,
        filename,
        message: '迁移执行成功',
        duration
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // 记录失败
      await this.logMigration(filename, 'failed', error.message);

      logger.error(`[MigrationService] Failed to execute migration ${filename}:`, error);

      return {
        success: false,
        filename,
        message: error.message || '迁移执行失败',
        duration,
        error: error.message
      };
    }
  }

  /**
   * 批量执行多个迁移脚本
   */
  async executeMigrations(filenames: string[]): Promise<MigrationExecutionResult[]> {
    const results: MigrationExecutionResult[] = [];

    for (const filename of filenames) {
      const result = await this.executeMigration(filename);
      results.push(result);

      // 如果失败，停止执行后续脚本
      if (!result.success) {
        logger.warn(`[MigrationService] Migration failed, stopping batch execution: ${filename}`);
        break;
      }
    }

    return results;
  }

  /**
   * 执行所有待执行的迁移
   */
  async executeAllPending(): Promise<MigrationExecutionResult[]> {
    const migrations = await this.getAllMigrations();
    const pending = migrations.filter(m => m.status === 'pending');

    return this.executeMigrations(pending.map(m => m.filename));
  }

  /**
   * 解析脚本描述（优先使用预定义映射表，其次从注释提取）
   */
  private parseDescription(filePath: string): string {
    try {
      const filename = path.basename(filePath, '.sql');

      // 1. 首先检查预定义描述映射表
      if (MIGRATION_DESCRIPTIONS[filename]) {
        return MIGRATION_DESCRIPTIONS[filename];
      }

      // 2. 从文件注释中提取描述
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // 查找第一行有意义的注释作为描述
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('--')) {
          const desc = trimmed.replace(/^--\s*/, '').trim();
          // 跳过空注释和特殊标记注释
          if (desc && desc !== '' && !desc.startsWith('=') && !desc.startsWith('*')) {
            return desc;
          }
        }
        // 跳过空注释行
        if (trimmed === '--') continue;
        // 遇到非注释行，停止
        if (trimmed && !trimmed.startsWith('--')) break;
      }

      // 3. 如果都没有，使用文件名（转换为可读格式）
      return filename
        .replace(/_/g, ' ')
        .replace(/^./, c => c.toUpperCase());
    } catch {
      return path.basename(filePath, '.sql');
    }
  }

  /**
   * 获取已执行的迁移记录
   */
  private async getExecutedMigrations(): Promise<{ filename: string; executed_at: Date }[]> {
    try {
      // 检查迁移记录表是否存在
      const tableExists = await this.checkMigrationLogTableExists();

      if (!tableExists) {
        return [];
      }

      const result = await AppDataSource.query(
        `SELECT filename, executed_at FROM ${MIGRATION_LOG_TABLE} ORDER BY executed_at DESC`
      );

      return result || [];
    } catch {
      return [];
    }
  }

  /**
   * 检查迁移记录表是否存在
   */
  private async checkMigrationLogTableExists(): Promise<boolean> {
    try {
      const result = await AppDataSource.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '${MIGRATION_LOG_TABLE}'
        ) as exists`
      );

      return result[0]?.exists || false;
    } catch {
      return false;
    }
  }

  /**
   * 创建迁移记录表
   */
  async ensureMigrationLogTable(): Promise<void> {
    const exists = await this.checkMigrationLogTableExists();

    if (!exists) {
      await AppDataSource.query(`
        CREATE TABLE ${MIGRATION_LOG_TABLE} (
          id SERIAL PRIMARY KEY,
          filename VARCHAR(255) NOT NULL UNIQUE,
          executed_at TIMESTAMP NOT NULL DEFAULT NOW(),
          status VARCHAR(20) NOT NULL DEFAULT 'success',
          error TEXT,
          duration_ms INTEGER
        )
      `);

      // 创建索引
      await AppDataSource.query(`
        CREATE INDEX idx_migration_logs_filename ON ${MIGRATION_LOG_TABLE}(filename)
      `);

      logger.info(`[MigrationService] Created migration log table: ${MIGRATION_LOG_TABLE}`);
    }
  }

  /**
   * 记录迁移执行结果
   */
  private async logMigration(
    filename: string,
    status: 'success' | 'failed',
    error?: string
  ): Promise<void> {
    // 确保表存在
    await this.ensureMigrationLogTable();

    try {
      // 使用 INSERT ... ON CONFLICT 实现 upsert
      await AppDataSource.query(`
        INSERT INTO ${MIGRATION_LOG_TABLE} (filename, status, error, duration_ms, executed_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (filename) DO UPDATE SET
          status = EXCLUDED.status,
          error = EXCLUDED.error,
          executed_at = NOW()
      `, [filename, status, error || null, 0]);
    } catch (err) {
      logger.error('[MigrationService] Error logging migration:', err);
    }
  }

  /**
   * 获取迁移统计信息
   */
  async getMigrationStats(): Promise<{
    total: number;
    executed: number;
    pending: number;
    lastExecuted?: Date;
  }> {
    const migrations = await this.getAllMigrations();

    return {
      total: migrations.length,
      executed: migrations.filter(m => m.status === 'success').length,
      pending: migrations.filter(m => m.status === 'pending').length,
      lastExecuted: migrations.find(m => m.status === 'success')?.executedAt
    };
  }
}

export const migrationService = new MigrationService();
