/**
 * 字典路由
 * 口径统一：港口、船公司、货代、海外公司下拉与名称解析
 */

import { Router } from 'express';
import { DictController } from '../controllers/dict.controller.js';

const router = Router();
const controller = new DictController();

router.get('/ports', controller.getPorts);
router.get('/shipping-companies', controller.getShippingCompanies);
router.get('/freight-forwarders', controller.getFreightForwarders);
router.get('/overseas-companies', controller.getOverseasCompanies);
router.post('/resolve-demurrage-codes', controller.resolveDemurrageCodes);

export default router;
