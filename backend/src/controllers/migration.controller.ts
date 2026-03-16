/**
 * 数据库迁移管理控制器
 */

import { Request, Response } from 'express';
import { migrationService, MigrationScript, MigrationExecutionResult } from '../services/migration.service';
import { logger } from '../utils/logger';

/**
 * 获取所有迁移脚本列表
 */
export async function getMigrations(req: Request, res: Response) {
  try {
    const migrations = await migrationService.getAllMigrations();
    const stats = await migrationService.getMigrationStats();
    
    res.json({
      success: true,
      data: {
        migrations,
        stats
      }
    });
  } catch (error: any) {
    logger.error('[MigrationController] Error getting migrations:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取迁移列表失败'
    });
  }
}

/**
 * 获取单个迁移脚本内容
 */
export async function getMigrationContent(req: Request, res: Response) {
  try {
    const { filename } = req.params;
    
    if (!filename) {
      return res.status(400).json({
        success: false,
        message: '缺少文件名参数'
      });
    }
    
    const content = await migrationService.getMigrationContent(filename);
    
    res.json({
      success: true,
      data: { filename, content }
    });
  } catch (error: any) {
    logger.error('[MigrationController] Error getting migration content:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取脚本内容失败'
    });
  }
}

/**
 * 执行单个迁移脚本
 */
export async function executeMigration(req: Request, res: Response) {
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({
        success: false,
        message: '缺少文件名参数'
      });
    }
    
    logger.info(`[MigrationController] Executing migration: ${filename}`);
    
    const result = await migrationService.executeMigration(filename);
    
    res.json({
      success: result.success,
      data: result,
      message: result.success ? '迁移执行成功' : '迁移执行失败'
    });
  } catch (error: any) {
    logger.error('[MigrationController] Error executing migration:', error);
    res.status(500).json({
      success: false,
      message: error.message || '执行迁移失败'
    });
  }
}

/**
 * 批量执行迁移脚本
 */
export async function executeMigrations(req: Request, res: Response) {
  try {
    const { filenames } = req.body;
    
    if (!filenames || !Array.isArray(filenames) || filenames.length === 0) {
      return res.status(400).json({
        success: false,
        message: '缺少文件名列表参数'
      });
    }
    
    logger.info(`[MigrationController] Executing batch migrations: ${filenames.join(', ')}`);
    
    const results = await migrationService.executeMigrations(filenames);
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    res.json({
      success: failCount === 0,
      data: {
        results,
        summary: {
          total: results.length,
          success: successCount,
          failed: failCount
        }
      },
      message: `执行完成：成功 ${successCount} 个，失败 ${failCount} 个`
    });
  } catch (error: any) {
    logger.error('[MigrationController] Error executing migrations:', error);
    res.status(500).json({
      success: false,
      message: error.message || '批量执行迁移失败'
    });
  }
}

/**
 * 执行所有待执行的迁移
 */
export async function executeAllPending(req: Request, res: Response) {
  try {
    logger.info('[MigrationController] Executing all pending migrations');
    
    const results = await migrationService.executeAllPending();
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    res.json({
      success: failCount === 0,
      data: {
        results,
        summary: {
          total: results.length,
          success: successCount,
          failed: failCount
        }
      },
      message: `执行完成：成功 ${successCount} 个，失败 ${failCount} 个`
    });
  } catch (error: any) {
    logger.error('[MigrationController] Error executing all pending:', error);
    res.status(500).json({
      success: false,
      message: error.message || '执行所有待执行迁移失败'
    });
  }
}

/**
 * 获取迁移统计信息
 */
export async function getMigrationStats(req: Request, res: Response) {
  try {
    const stats = await migrationService.getMigrationStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    logger.error('[MigrationController] Error getting stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取统计信息失败'
    });
  }
}
