/**
 * 外部数据路由
 * 用于管理外部数据源（如飞驼）的数据同步
 */

import { Router } from 'express';
import { externalDataController } from '../controllers/externalData.controller';

const router = Router();

/**
 * 同步单个货柜的状态事件
 * POST /api/external/sync/:containerNumber
 * Body: { dataSource?: 'Feituo' | 'AIS' | 'ShipCompany' | 'Terminal' | 'User' | 'Excel' }
 */
router.post('/sync/:containerNumber', externalDataController.syncContainer);

/**
 * 批量同步货柜状态事件
 * POST /api/external/sync/batch
 * Body: { containerNumbers: string[], dataSource?: 'Feituo' }
 */
router.post('/sync/batch', externalDataController.syncBatch);

/**
 * 获取货柜的状态事件列表
 * GET /api/external/events/:containerNumber?limit=50
 */
router.get('/events/:containerNumber', externalDataController.getContainerEvents);

/**
 * 删除货柜的状态事件
 * DELETE /api/external/events/:containerNumber
 */
router.delete('/events/:containerNumber', externalDataController.deleteContainerEvents);

/**
 * 清理过期的预计状态事件
 * POST /api/external/cleanup
 * Body: { days?: 7 }
 */
router.post('/cleanup', externalDataController.cleanupExpiredEvents);

/**
 * 获取数据源统计信息
 * GET /api/external/stats
 */
router.get('/stats', externalDataController.getStats);

export default router;
