/**
 * 通用字典管理路由
 */

import { Router } from 'express';
import { DictManageController } from '../controllers/dict-manage.controller';

const router = Router();
const controller = new DictManageController();

router.get('/types', controller.getTypes);
router.get('/:type/fields', controller.getFields);
router.get('/:type', controller.getList);
router.get('/:type/:id', controller.getOne);
router.post('/:type', controller.create);
router.put('/:type/:id', controller.update);
router.delete('/:type/:id', controller.delete);

export default router;
