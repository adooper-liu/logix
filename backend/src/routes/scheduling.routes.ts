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

// 资源概览（返回仓库和车队列表）
router.get('/resources/overview', controller.getResourcesOverview);

// 映射资源概览（返回映射表中有记录的仓库和车队，排产配置页面专用）
router.get('/resources/mapped', controller.getMappedResources);

// 仓库CRUD
router.get('/resources/warehouse/:code', controller.getWarehouse);
router.post('/resources/warehouse', controller.createWarehouse);
router.put('/resources/warehouse/:code', controller.updateWarehouse);
router.delete('/resources/warehouse/:code', controller.deleteWarehouse);

// 车队CRUD
router.get('/resources/trucking/:code', controller.getTrucking);
router.post('/resources/trucking', controller.createTrucking);
router.put('/resources/trucking/:code', controller.updateTrucking);
router.delete('/resources/trucking/:code', controller.deleteTrucking);

// 更新仓库日卸柜能力（兼容旧端点）
router.put('/resources/warehouse/:code/capacity', controller.updateWarehouseCapacity);

// 更新车队日容量（兼容旧端点）
router.put('/resources/trucking/:code/capacity', controller.updateTruckingCapacity);

// 堆场管理
router.get('/resources/yards', controller.getYards);
router.post('/resources/yards', controller.createYard);
router.put('/resources/yards/:code', controller.updateYard);
router.delete('/resources/yards/:code', controller.deleteYard);

// 占用情况
router.get('/resources/occupancy/warehouse', controller.getWarehouseOccupancy);
router.get('/resources/occupancy/trucking', controller.getTruckingOccupancy);

// 能力数据
router.get('/resources/capacity/range', controller.getCapacityRange);

// 成本评估
router.post('/evaluate-cost', controller.evaluateCost);
router.post('/compare-options', controller.compareOptions);
router.get('/recommend-option/:id', controller.getRecommendOption);

export default router;
