/**
 * 字典映射路由
 * Dictionary Mapping Routes
 */

import { Router } from 'express';
import DictMappingController from '../controllers/dict-mapping.controller';

const router = Router();
const controller = DictMappingController;

/**
 * @route   GET /api/dict-mapping/port/:portName
 * @desc    根据中文港口名称获取标准 port_code
 * @access  Public
 */
router.get('/port/:portName', controller.getPortCodeByChineseName);

/**
 * @route   POST /api/dict-mapping/port/batch
 * @desc    批量获取港口代码映射
 * @access  Public
 */
router.post('/port/batch', controller.getPortCodeMappings);

/**
 * @route   GET /api/dict-mapping/port/all
 * @desc    获取所有港口名称映射
 * @access  Public
 */
router.get('/port/all', controller.getAllPortMappings);

/**
 * @route   POST /api/dict-mapping/port
 * @desc    添加新的港口名称映射
 * @access  Public
 */
router.post('/port', controller.addPortMapping);

/**
 * @route   DELETE /api/dict-mapping/port/:id
 * @desc    删除港口名称映射
 * @access  Public
 */
router.delete('/port/:id', controller.deletePortMapping);

export default router;
