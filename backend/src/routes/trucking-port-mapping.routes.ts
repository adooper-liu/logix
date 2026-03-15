/**
 * 车队-港口映射路由
 * Trucking-Port Mapping Routes
 */

import { Router } from 'express';
import TruckingPortMappingController from '../controllers/trucking-port-mapping.controller';

const router = Router();
const controller = TruckingPortMappingController;

// CRUD 路由
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);
router.post('/batch', controller.batchCreate);

export default router;
