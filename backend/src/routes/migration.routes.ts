/**
 * 数据库迁移管理路由
 */

import { NextFunction, Request, Response, Router } from 'express';
import {
  getMigrations,
  getMigrationContent,
  executeMigration,
  executeMigrations,
  executeAllPending,
  getMigrationStats
} from '../controllers/migration.controller';

const router = Router();
const MIGRATION_EXECUTION_ENABLED_ENV = 'ENABLE_MIGRATION_EXECUTION_API';

export function isMigrationExecutionEnabled(): boolean {
  return process.env[MIGRATION_EXECUTION_ENABLED_ENV] === 'true';
}

export function requireMigrationExecutionEnabled(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (isMigrationExecutionEnabled()) {
    next();
    return;
  }

  res.status(403).json({
    success: false,
    message: `迁移执行接口默认关闭。仅在受控环境设置 ${MIGRATION_EXECUTION_ENABLED_ENV}=true 后才允许执行。`
  });
}

/**
 * @route   GET /api/v1/migrations
 * @desc    获取所有迁移脚本列表
 * @access  Public
 */
router.get('/', getMigrations);

/**
 * @route   GET /api/v1/migrations/stats
 * @desc    获取迁移统计信息
 * @access  Public
 */
router.get('/stats', getMigrationStats);

/**
 * @route   GET /api/v1/migrations/:filename
 * @desc    获取单个迁移脚本内容
 * @access  Public
 */
router.get('/:filename', getMigrationContent);

/**
 * @route   POST /api/v1/migrations/execute
 * @desc    执行单个迁移脚本
 * @access  Disabled by default
 */
router.post('/execute', requireMigrationExecutionEnabled, executeMigration);

/**
 * @route   POST /api/v1/migrations/execute-batch
 * @desc    批量执行迁移脚本
 * @access  Disabled by default
 */
router.post('/execute-batch', requireMigrationExecutionEnabled, executeMigrations);

/**
 * @route   POST /api/v1/migrations/execute-all
 * @desc    执行所有待执行的迁移
 * @access  Disabled by default
 */
router.post('/execute-all', requireMigrationExecutionEnabled, executeAllPending);

export default router;
