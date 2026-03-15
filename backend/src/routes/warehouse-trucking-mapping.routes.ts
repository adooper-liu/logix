/**
 * 仓库-车队映射路由
 * Warehouse-Trucking Mapping Routes
 */

import { Router } from 'express';
import WarehouseTruckingMappingController from '../controllers/warehouse-trucking-mapping.controller';

const router = Router();
const controller = WarehouseTruckingMappingController;

// CRUD 路由
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);
router.post('/batch', controller.batchCreate);

export default router;
