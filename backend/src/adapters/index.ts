/**
 * 适配器模块导出
 * Adapter Module Exports
 */

// 接口
export {
  IExternalDataAdapter,
  ExternalDataSource,
  AdapterResponse,
  ContainerStatusNode,
  ContainerLoadingData,
  ContainerHoldData,
  ContainerChargeData,
} from './ExternalDataAdapter.interface.js';

// 适配器实现
export { feituoAdapter, FeiTuoAdapter } from './FeiTuoAdapter.js';
export { logisticsPathAdapter, LogisticsPathAdapter } from './LogisticsPathAdapter.js';

// 管理器
export { adapterManager, AdapterManager } from './AdapterManager.js';
