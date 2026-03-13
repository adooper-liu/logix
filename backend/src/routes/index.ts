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
import externalDataRoutes from './externalData.routes.js';
import dictMappingRoutes from './dict-mapping.routes.js';
import universalDictMappingRoutes from './universal-dict-mapping.routes.js';
import monitoringRoutes from './monitoring.routes.js';
import demurrageRoutes from './demurrage.routes.js';
import dictRoutes from './dict.routes.js';
import auditRoutes from './audit.routes.js';
import inspectionRoutes from './inspection.routes.js';
// import fiveNodeRoutes from './fiveNode.routes.js';  // 暂时注释，缺少 BizContainer 实体
import alertRoutes from './alert.routes.js';
import costRoutes from './cost.routes.js';
import dataSourceRoutes from './dataSource.routes.js';

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
      import: 'Excel数据导入',
      external: '外部数据同步',
      inspection: '查验记录管理',
      fiveNode: '五节点调度与可视化服务',
      alerts: '预警规则服务',
      costs: '费用计算服务',
      dataSource: '数据来源管理服务'
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
router.use('/external', externalDataRoutes);
router.use('/dict-mapping', dictMappingRoutes);
router.use('/dict-mapping/universal', universalDictMappingRoutes);
router.use('', monitoringRoutes);
router.use('/demurrage', demurrageRoutes);
router.use('/dict', dictRoutes);
router.use('/audit', auditRoutes);
router.use('/inspection', inspectionRoutes);
// router.use('/five-node', fiveNodeRoutes); // 暂时注释，缺少 BizContainer 实体
router.use('/alerts', alertRoutes);
router.use('/costs', costRoutes);
router.use('/data-source', dataSourceRoutes);

export default router;
