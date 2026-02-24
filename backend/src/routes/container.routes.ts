/**
 * 货柜路由
 * Container Routes
 */

import { Router } from 'express';
import { ContainerController } from '../controllers/container.controller';

const router = Router();
const containerController = new ContainerController();

/**
 * @route   GET /
 * @desc    获取货柜列表
 * @access  Public
 */
router.get('/', containerController.getContainers);

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
 * @route   GET /statistics
 * @desc    获取货柜统计数据
 * @access  Public
 */
router.get('/statistics', containerController.getStatistics);

export default router;
