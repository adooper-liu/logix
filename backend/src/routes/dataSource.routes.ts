/**
 * 数据来源管理路由
 * 用于注册数据来源管理的API路由
 */

import express from 'express';
import { dataSourceController } from '../controllers/dataSource.controller';

const router = express.Router();

/**
 * 数据来源管理路由
 */
router.get('/stats', dataSourceController.getDataSourceStats);
router.get('/container/:containerNumber', dataSourceController.getContainerDataSourceInfo);
router.delete('/clean-expired', dataSourceController.cleanExpiredEstimatedData);
router.get('/priority', dataSourceController.getDataSourcePriority);

export default router;