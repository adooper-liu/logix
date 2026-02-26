/**
 * 货柜导入路由
 * Container Import Routes
 */

import { Router } from 'express';
import { ImportController } from '../controllers/import.controller';

const router = Router();
const importController = new ImportController();

/**
 * Excel数据导入路由
 * 前缀: /api/v1/import
 */

/**
 * @route   POST /api/v1/import/excel
 * @desc    导入Excel数据到数据库（单条记录）
 * @access  Public
 */
router.post('/excel', importController.importExcelData.bind(importController));

/**
 * @route   POST /api/v1/import/excel/batch
 * @desc    批量导入Excel数据到数据库
 * @access  Public
 */
router.post('/excel/batch', importController.importBatchExcelData.bind(importController));

export default router;
