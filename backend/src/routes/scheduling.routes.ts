/**
 * 智能排柜路由
 * Intelligent Scheduling Routes
 */

import { Router } from 'express';
import { SchedulingController } from '../controllers/scheduling.controller';
import { SchedulingRuleController } from '../controllers/SchedulingRule.controller';

const router = Router();
const controller = new SchedulingController();
const ruleController = new SchedulingRuleController();

// 批量排产
router.post('/batch-schedule', controller.batchSchedule);

// 确认保存排产结果（重新计算并保存）
router.post('/confirm', controller.confirmSchedule);

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

// 成本优化
router.post('/optimize-cost', controller.optimizeCost);
router.post('/optimize-container/:containerNumber', controller.optimizeContainer); // ✅ 新增：单柜优化
console.log('[Scheduling Routes] ✅ optimize-container route registered');
router.post('/batch-optimize', controller.batchOptimizeContainers); // ✅ 新增：批量优化
console.log('[Scheduling Routes] ✅ batch-optimize route registered');
router.get('/cost-comparison/:containerNumber', controller.getCostComparison);

// 排产历史记录查询
router.get('/history/:containerNumber', controller.getSchedulingHistory);
router.get('/history/latest', controller.getLatestSchedulingHistory);

// 排产预览（不写库）- 放在最后，避免匹配其他具体路由
router.post('/:id/schedule-preview', controller.schedulePreview);

// ✅ Phase 3: 拖拽调度相关
router.post('/cost/recalculate', controller.recalculateCost); // 重新计算成本
router.post('/save', controller.saveSchedule); // 保存修改
router.get('/optimizations', controller.getOptimizations); // 获取优化建议
router.post('/optimization/apply', controller.applyOptimization); // 应用优化建议

// ========== 规则引擎管理 ==========
// 规则 CRUD
router.post('/rules', ruleController.createRule);
router.put('/rules/:ruleId', ruleController.updateRule);
router.delete('/rules/:ruleId', ruleController.deleteRule);
router.get('/rules', ruleController.queryRules);
router.get('/rules/active', ruleController.getActiveRules);
router.get('/rules/:ruleId', ruleController.getRuleById);
router.get('/rules/:ruleId/history', ruleController.getRuleHistory);
router.post('/rules/:ruleId/activate', ruleController.activateRule);
router.post('/rules/:ruleId/deactivate', ruleController.deactivateRule);
router.post('/rules/reload', ruleController.reloadRules);
router.post('/rules/test-execute', ruleController.testExecuteRule);

export default router;
