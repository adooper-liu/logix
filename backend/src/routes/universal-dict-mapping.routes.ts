/**
 * 通用字典映射路由
 * Universal Dictionary Mapping Routes
 * 支持所有字典类型的名称到代码映射
 */

import { Router } from 'express';
import UniversalDictMappingController from '../controllers/universal-dict-mapping.controller';

const router = Router();
const controller = UniversalDictMappingController;

/**
 * @route   GET /api/dict-mapping/universal/code
 * @desc    获取标准代码(通用)
 * @query   dictType - 字典类型 (PORT, COUNTRY, SHIPPING_COMPANY, etc.)
 * @query   name - 输入名称(中文名/英文名/旧代码等)
 * @access  Public
 *
 * @example
 * GET /api/dict-mapping/universal/code?dictType=PORT&name=青岛
 * GET /api/dict-mapping/universal/code?dictType=COUNTRY&name=美国
 * GET /api/dict-mapping/universal/code?dictType=SHIPPING_COMPANY&name=MSC
 */
router.get('/code', controller.getStandardCode);

/**
 * @route   POST /api/dict-mapping/universal/batch
 * @desc    批量获取标准代码
 * @body    dictType - 字典类型
 * @body    names - 名称数组
 * @access  Public
 *
 * @example
 * POST /api/dict-mapping/universal/batch
 * {
 *   "dictType": "PORT",
 *   "names": ["青岛", "宁波", "洛杉矶"]
 * }
 */
router.post('/batch', controller.getStandardCodesBatch);

/**
 * @route   GET /api/dict-mapping/universal/types
 * @desc    获取所有字典类型
 * @access  Public
 */
router.get('/types', controller.getAllDictTypes);

/**
 * @route   GET /api/dict-mapping/universal/type/:dictType
 * @desc    获取指定类型的所有映射
 * @access  Public
 *
 * @example
 * GET /api/dict-mapping/universal/type/PORT
 * GET /api/dict-mapping/universal/type/COUNTRY
 */
router.get('/type/:dictType', controller.getMappingsByType);

/**
 * @route   GET /api/dict-mapping/universal/search/:dictType
 * @desc    模糊搜索映射
 * @query   keyword - 搜索关键词
 * @access  Public
 *
 * @example
 * GET /api/dict-mapping/universal/search/PORT?keyword=青岛
 */
router.get('/search/:dictType', controller.searchMappings);

/**
 * @route   POST /api/dict-mapping/universal
 * @desc    添加新的映射
 * @body    dict_type - 字典类型
 * @body    target_table - 目标表名
 * @body    target_field - 目标字段名
 * @body    standard_code - 标准代码
 * @body    name_cn - 中文名称
 * @body    name_en - 英文名称(可选)
 * @body    old_code - 旧代码(可选)
 * @body    is_primary - 是否主名称(可选)
 * @access  Public
 *
 * @example
 * POST /api/dict-mapping/universal
 * {
 *   "dict_type": "PORT",
 *   "target_table": "dict_ports",
 *   "target_field": "port_code",
 *   "standard_code": "CNTEST",
 *   "name_cn": "测试港",
 *   "name_en": "Test Port"
 * }
 */
router.post('/', controller.addMapping);

/**
 * @route   POST /api/dict-mapping/universal/batch-add
 * @desc    批量添加映射
 * @body    mappings - 映射数组
 * @access  Public
 */
router.post('/batch-add', controller.addMappingsBatch);

/**
 * @route   PUT /api/dict-mapping/universal/:id
 * @desc    更新映射
 * @access  Public
 */
router.put('/:id', controller.updateMapping);

/**
 * @route   DELETE /api/dict-mapping/universal/:id
 * @desc    删除映射
 * @access  Public
 */
router.delete('/:id', controller.deleteMapping);

/**
 * @route   GET /api/dict-mapping/universal/stats
 * @desc    获取映射统计信息
 * @access  Public
 */
router.get('/stats/summary', controller.getMappingStats);

export default router;
