/**
 * 货柜路由
 * Container Routes
 */

import { Router } from 'express';
import { ContainerController } from '../controllers/container.controller';

const router = Router();
const containerController = new ContainerController();

/**
 * @route   GET /statistics
 * @desc    获取货柜统计数据
 * @access  Public
 */
router.get('/statistics', containerController.getStatistics);

/**
 * @route   GET /test-statistics
 * @desc    测试统计服务
 * @access  Public
 */
router.get('/test-statistics', containerController.testStatisticsService);

/**
 * @route   GET /statistics-detailed
 * @desc    获取货柜详细统计数据（用于倒计时卡片）
 * @access  Public
 */
router.get('/statistics-detailed', containerController.getStatisticsDetailed);

/**
 * @route   GET /statistics-verify
 * @desc    获取统计数据验证信息
 * @access  Public
 */
router.get('/statistics-verify', containerController.getStatisticsVerify);

/**
 * @route   GET /statistics-yearly-volume
 * @desc    获取年度出运量数据（近三年）
 * @access  Public
 */
router.get('/statistics-yearly-volume', containerController.getYearlyVolume);

/**
 * @route   GET /statistics-abnormal
 * @desc    获取异常集装箱统计
 * @access  Public
 */
router.get('/statistics-abnormal', containerController.getAbnormalStatistics);

/**
 * @route   GET /by-filter
 * @desc    根据统计条件获取货柜列表（与统计查询使用相同逻辑）
 * @access  Public
 */
router.get('/by-filter', containerController.getContainersByFilterCondition);

/**
 * @route   GET /
 * @desc    获取货柜列表
 * @access  Public
 */
router.get('/', containerController.getContainers);

/**
 * @route   GET /:id/list-row
 * @desc    获取该货柜在列表中的单行数据（与列表 enrich 一致，用于核对前端与数据库）
 * @access  Public
 */
router.get('/:id/list-row', containerController.getContainerListRow);

/**
 * @route   GET /:id
 * @desc    获取货柜详情
 * @access  Public
 */
router.get('/:id', containerController.getContainerById);

/**
 * @route   POST /
 * @desc    创建货柜
 * @access  Public
 */
router.post('/', containerController.createContainer);

/**
 * @route   PUT /:id
 * @desc    更新货柜
 * @access  Public
 */
router.put('/:id', containerController.updateContainer);

/**
 * @route   DELETE /:id
 * @desc    删除货柜
 * @access  Public
 */
router.delete('/:id', containerController.deleteContainer);

/**
 * @route   POST /:containerNumber/update-status
 * @desc    更新单个货柜状态
 * @access  Public
 */
router.post('/:containerNumber/update-status', containerController.updateContainerStatus);

/**
 * @route   POST /update-statuses/batch
 * @desc    批量更新货柜状态
 * @access  Public
 * @body     containerNumbers? - 货柜号数组（可选）
 * @body     limit? - 批量更新数量限制（可选，默认1000）
 */
router.post('/update-statuses/batch', containerController.batchUpdateContainerStatuses);

/**
 * @route   POST /rebuild-gantt-derived
 * @desc    手工重算全表或前 N 条 gantt_derived（与 logistics_status）
 * @body    maxContainers 可选，不传则全表
 */
router.post('/rebuild-gantt-derived', containerController.rebuildGanttDerivedSnapshot);

/**
 * @route   PATCH /:id/schedule
 * @desc    更新货柜计划（手工排柜）
 * @access  Public
 * @body    plannedCustomsDate, plannedPickupDate, plannedDeliveryDate, plannedUnloadDate, plannedReturnDate, truckingCompanyId, customsBrokerCode, warehouseId, unloadModePlan
 */
router.patch('/:id/schedule', containerController.updateSchedule);

/**
 * @route   PATCH /:containerNumber/manual-lfd
 * @desc    设置手工最晚提柜日（LFD），设置后不会被自动计算覆盖
 * @access  Public
 * @body    lastFreeDate (必填), remark (可选)
 */
router.patch('/:containerNumber/manual-lfd', containerController.setManualLastFreeDate);

/**
 * @route   DELETE /:containerNumber/manual-lfd
 * @desc    恢复为自动计算LFD（删除手工维护标记）
 * @access  Public
 */
router.delete('/:containerNumber/manual-lfd', containerController.resetLastFreeDateToComputed);

export default router;
