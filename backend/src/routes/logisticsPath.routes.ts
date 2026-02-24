/**
 * 物流路径路由
 * Logistics Path Routes
 */

import express from 'express';
import {
  getPathByContainer,
  getPathByBL,
  getPathByBooking,
  getPaths,
  validatePath,
  syncExternalData,
  batchSyncExternalData,
  healthCheck
} from '../controllers/logisticsPath.controller.js';

const router = express.Router();

/**
 * @route   GET /api/v1/logistics-path/health
 * @desc    物流路径服务健康检查
 * @access   Public
 */
router.get('/health', healthCheck);

/**
 * @route   GET /api/v1/logistics-path/container/:containerNumber
 * @desc    根据集装箱号获取物流路径
 * @access   Public
 */
router.get('/container/:containerNumber', getPathByContainer);

/**
 * @route   GET /api/v1/logistics-path/bl/:billOfLadingNumber
 * @desc    根据提单号获取物流路径
 * @access   Public
 */
router.get('/bl/:billOfLadingNumber', getPathByBL);

/**
 * @route   GET /api/v1/logistics-path/booking/:bookingNumber
 * @desc    根据订舱号获取物流路径
 * @access   Public
 */
router.get('/booking/:bookingNumber', getPathByBooking);

/**
 * @route   GET /api/v1/logistics-paths
 * @desc    获取物流路径列表（支持分页和过滤）
 * @access   Public
 */
router.get('/', getPaths);

/**
 * @route   POST /api/v1/logistics-path/validate/:pathId
 * @desc    验证物流路径
 * @access   Public
 */
router.post('/validate/:pathId', validatePath);

/**
 * @route   POST /api/v1/logistics-path/sync
 * @desc    同步外部数据（如飞驼API）
 * @access   Private (需要认证)
 */
router.post('/sync', syncExternalData);

/**
 * @route   POST /api/v1/logistics-path/batch-sync
 * @desc    批量同步外部数据
 * @access   Private (需要认证)
 */
router.post('/batch-sync', batchSyncExternalData);

export default router;
