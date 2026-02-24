/**
 * 主路由聚合
 * Main Routes Aggregator
 */

import { Router } from 'express';
import logisticsPathRoutes from './logisticsPath.routes.js';
import adapterRoutes from './adapter.routes.js';
import containerRoutes from './container.routes.js';
import countryRoutes from './country.routes.js';
import customerRoutes from './customer.routes.js';
import customerTypeRoutes from './customerType.routes.js';
import importRoutes from './import.routes.js';

const router = Router();

// 根路径
router.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'LogiX Main Service API v1.0',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      logisticsPath: '物流路径可视化微服务',
      adapters: '外部数据适配器',
      containers: '货柜管理',
      countries: '国别字典',
      customers: '客户管理',
      customerTypes: '客户类型字典',
      import: 'Excel数据导入'
    }
  });
});

// 子路由
router.use('/logistics-path', logisticsPathRoutes);
router.use('/adapters', adapterRoutes);
router.use('/containers', containerRoutes);
router.use('/countries', countryRoutes);
router.use('/customers', customerRoutes);
router.use('/customer-types', customerTypeRoutes);
router.use('/import', importRoutes);

export default router;
