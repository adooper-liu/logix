import express from 'express';
import { operationController } from '../controllers/operation.controller';

const router = express.Router();

/**
 * 操作管理路由
 * Operation Management Routes
 */

// 港口操作
router.post('/port', operationController.createPortOperation);
router.put('/port/:id', operationController.updatePortOperation);

// 拖卡运输
router.post('/trucking', operationController.createTruckingTransport);
router.put('/trucking/:containerNumber', operationController.updateTruckingTransport);

// 仓库操作
router.post('/warehouse', operationController.createWarehouseOperation);
router.put('/warehouse/:containerNumber', operationController.updateWarehouseOperation);

// 还空箱
router.post('/empty-return', operationController.createEmptyReturn);
router.put('/empty-return/:containerNumber', operationController.updateEmptyReturn);

export default router;
