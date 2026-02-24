/**
 * 客户路由
 * Customer Routes
 */

import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller';

const router = Router();
const customerController = new CustomerController();

// 获取客户列表
router.get('/', customerController.getCustomers);

// 根据代码获取客户详情
router.get('/:code', customerController.getCustomerByCode);

// 创建客户
router.post('/', customerController.createCustomer);

// 更新客户
router.put('/:code', customerController.updateCustomer);

// 删除客户
router.delete('/:code', customerController.deleteCustomer);

export default router;
