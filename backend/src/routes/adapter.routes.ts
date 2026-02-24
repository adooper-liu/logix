/**
 * 适配器路由
 * Adapter Routes
 */

import { Router } from 'express';
import { adapterController } from '../controllers/adapter.controller.js';

const router = Router();

/**
 * @route   GET /api/v1/adapters/status
 * @desc    获取所有适配器状态
 * @access  Private
 */
router.get('/status', adapterController.getAdapterStatus.bind(adapterController));

/**
 * @route   POST /api/v1/adapters/health-check
 * @desc    健康检查所有适配器
 * @access  Private
 */
router.post('/health-check', adapterController.healthCheck.bind(adapterController));

/**
 * @route   PUT /api/v1/adapters/default/:sourceType
 * @desc    设置默认适配器
 * @access  Private
 */
router.put('/default/:sourceType', adapterController.setDefaultAdapter.bind(adapterController));

/**
 * @route   PUT /api/v1/adapters/:sourceType/enabled
 * @desc    启用/禁用适配器
 * @access  Private
 */
router.put('/:sourceType/enabled', adapterController.setAdapterEnabled.bind(adapterController));

/**
 * @route   GET /api/v1/adapters/container/:containerNumber/status-events
 * @desc    根据集装箱号获取状态节点
 * @access  Public
 */
router.get('/container/:containerNumber/status-events', adapterController.getContainerStatusEvents.bind(adapterController));

/**
 * @route   POST /api/v1/adapters/container/:containerNumber/sync
 * @desc    同步集装箱数据
 * @access  Private
 */
router.post('/container/:containerNumber/sync', adapterController.syncContainerData.bind(adapterController));

/**
 * @route   POST /api/v1/adapters/:sourceType/webhook
 * @desc    处理Webhook
 * @access  Public
 */
router.post('/:sourceType/webhook', adapterController.handleWebhook.bind(adapterController));

export default router;
