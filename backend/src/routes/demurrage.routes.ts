/**
 * 滞港费路由
 * Demurrage Routes
 */

import { Router } from 'express';
import { DemurrageController } from '../controllers/demurrage.controller.js';

const router = Router();
const demurrageController = new DemurrageController();

router.get('/standards', demurrageController.getStandards);
router.post('/standards', demurrageController.createStandard);
router.get('/summary', demurrageController.getSummary);
router.get('/top-containers', demurrageController.getTopContainers);
router.post('/batch-compute-records', demurrageController.batchComputeRecords);
router.get('/diagnose/:containerNumber', demurrageController.diagnoseMatch);
router.get('/calculate/:containerNumber', demurrageController.calculateForContainer);
router.post('/batch-write-back', demurrageController.batchWriteBack);
router.post('/write-back/:containerNumber', demurrageController.writeBackSingleContainer);

export default router;
