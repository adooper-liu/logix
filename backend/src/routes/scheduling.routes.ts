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

export default router;
