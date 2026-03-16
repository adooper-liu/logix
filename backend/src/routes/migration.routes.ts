/**
 * 数据库迁移管理路由
 */

import { Router } from 'express';
import {
  getMigrations,
  getMigrationContent,
  executeMigration,
  executeMigrations,
  executeAllPending,
  getMigrationStats
} from '../controllers/migration.controller';

const router = Router();

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
 * @access  Public
 */
router.post('/execute', executeMigration);

/**
 * @route   POST /api/v1/migrations/execute-batch
 * @desc    批量执行迁移脚本
 * @access  Public
 */
router.post('/execute-batch', executeMigrations);

/**
 * @route   POST /api/v1/migrations/execute-all
 * @desc    执行所有待执行的迁移
 * @access  Public
 */
router.post('/execute-all', executeAllPending);

export default router;
