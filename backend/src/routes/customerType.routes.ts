/**
 * 客户类型字典路由
 * Customer Type Routes
 */

import { Router } from 'express';
import { CustomerTypeController } from '../controllers/customerType.controller';

const router = Router();
const customerTypeController = new CustomerTypeController();

// 获取所有客户类型
router.get('/', customerTypeController.getAllCustomerTypes);

// 根据代码获取客户类型
router.get('/:code', customerTypeController.getCustomerTypeByCode);

// 创建客户类型
router.post('/', customerTypeController.createCustomerType);

// 更新客户类型
router.put('/:code', customerTypeController.updateCustomerType);

// 删除客户类型
router.delete('/:code', customerTypeController.deleteCustomerType);

export default router;
