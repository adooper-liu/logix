/**
 * 智能排柜路由
 * Intelligent Scheduling Routes
 */

import { Router } from 'express';
import { SchedulingController } from '../controllers/scheduling.controller';

const router = Router();
const controller = new SchedulingController();

// 批量排产
router.post('/batch-schedule', controller.batchSchedule);

// 排产预览（不写库）
router.post('/:id/schedule-preview', controller.schedulePreview);

// 排产概览
router.get('/overview', controller.getSchedulingOverview);

// 资源管理
router.put('/resources/warehouse/:code', controller.updateWarehouseCapacity);
router.put('/resources/trucking/:code', controller.updateTruckingCapacity);

// 堆场管理
router.get('/resources/yards', controller.getYards);
router.post('/resources/yards', controller.createYard);
router.put('/resources/yards/:code', controller.updateYard);
router.delete('/resources/yards/:code', controller.deleteYard);

// 占用情况
router.get('/resources/occupancy/warehouse', controller.getWarehouseOccupancy);
router.get('/resources/occupancy/trucking', controller.getTruckingOccupancy);

export default router;
