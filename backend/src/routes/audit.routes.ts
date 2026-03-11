/**
 * 数据变更日志路由
 * Audit Log Routes
 */

import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller.js';

const router = Router();
const controller = new AuditController();

router.get('/changes', controller.getChanges);
router.get('/changes/container/:containerNumber', controller.getChangesByContainer);

export default router;
