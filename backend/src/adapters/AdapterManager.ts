/**
 * 适配器管理器
 * Adapter Manager
 *
 * 管理所有外部数据适配器，提供统一的访问接口
 * 支持适配器的注册、切换、健康检查和负载均衡
 */

import { log } from '../utils/logger.js';
import { config } from '../config/index.js';
import {
  IExternalDataAdapter,
  AdapterResponse,
  ExternalDataSource,
  ContainerStatusNode,
  ContainerLoadingData,
  ContainerHoldData,
  ContainerChargeData,
} from './ExternalDataAdapter.interface.js';
import { feituoAdapter } from './FeiTuoAdapter.js';
import { logisticsPathAdapter } from './LogisticsPathAdapter.js';

/**
 * 适配器优先级
 */
enum AdapterPriority {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  FALLBACK = 'fallback',
}

/**
 * 适配器注册信息
 */
interface AdapterRegistration {
  adapter: IExternalDataAdapter;
  priority: AdapterPriority;
  enabled: boolean;
  lastHealthCheck?: Date;
  healthy: boolean;
}

/**
 * 适配器管理器类
 */
export class AdapterManager {
  private adapters: Map<ExternalDataSource, AdapterRegistration> = new Map();
  private defaultAdapter: ExternalDataSource = ExternalDataSource.LOGISTICS_PATH;
  private healthCheckInterval?: NodeJS.Timeout;
  private healthCheckIntervalMs = 60000; // 默认1分钟

  constructor() {
    this.initializeAdapters();
    this.startHealthCheck();
  }

  /**
   * 初始化适配器
   */
  private initializeAdapters() {
    // 注册飞驼适配器（主适配器）
    this.registerAdapter(feituoAdapter, AdapterPriority.PRIMARY);

    // 注册物流路径适配器（备用适配器）
    this.registerAdapter(logisticsPathAdapter, AdapterPriority.SECONDARY);

    // 设置默认适配器
    const defaultSource = config.adapters?.defaultSource as ExternalDataSource;
    if (defaultSource && this.adapters.has(defaultSource)) {
      this.defaultAdapter = defaultSource;
    }

    log.info('AdapterManager Initialized:', {
      adapterCount: this.adapters.size,
      defaultAdapter: this.defaultAdapter,
    });
  }

  /**
   * 注册适配器
   */
  registerAdapter(adapter: IExternalDataAdapter, priority: AdapterPriority = AdapterPriority.FALLBACK) {
    this.adapters.set(adapter.sourceType, {
      adapter,
      priority,
      enabled: adapter.enabled,
      healthy: true,
    });
    log.info('Adapter Registered:', {
      name: adapter.name,
      sourceType: adapter.sourceType,
      priority,
    });
  }

  /**
   * 获取适配器
   */
  getAdapter(sourceType: ExternalDataSource): IExternalDataAdapter | undefined {
    const registration = this.adapters.get(sourceType);
    return registration?.enabled ? registration.adapter : undefined;
  }

  /**
   * 获取默认适配器
   */
  getDefaultAdapter(): IExternalDataAdapter | undefined {
    return this.getAdapter(this.defaultAdapter);
  }

  /**
   * 设置默认适配器
   */
  setDefaultAdapter(sourceType: ExternalDataSource) {
    if (this.adapters.has(sourceType)) {
      this.defaultAdapter = sourceType;
      log.info('Default Adapter Changed:', { sourceType });
    } else {
      throw new Error(`Adapter not found: ${sourceType}`);
    }
  }

  /**
   * 获取健康的适配器列表（按优先级排序）
   */
  getHealthyAdapters(): IExternalDataAdapter[] {
    const priorityOrder = [AdapterPriority.PRIMARY, AdapterPriority.SECONDARY, AdapterPriority.FALLBACK];

    return Array.from(this.adapters.values())
      .filter((reg) => reg.enabled && reg.healthy)
      .sort((a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority))
      .map((reg) => reg.adapter);
  }

  /**
   * 获取最佳适配器
   */
  getBestAdapter(): IExternalDataAdapter | undefined {
    const healthyAdapters = this.getHealthyAdapters();
    return healthyAdapters[0] || this.getDefaultAdapter();
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<void> {
    for (const [sourceType, registration] of this.adapters) {
      try {
        const isHealthy = await registration.adapter.healthCheck();
        registration.healthy = isHealthy;
        registration.lastHealthCheck = new Date();

        if (!isHealthy && registration.healthy !== false) {
          log.warn('Adapter Health Check Failed:', {
            sourceType,
            name: registration.adapter.name,
          });
        }
      } catch (error) {
        registration.healthy = false;
        registration.lastHealthCheck = new Date();
        log.error('Adapter Health Check Error:', {
          sourceType,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  /**
   * 启动定期健康检查
   */
  startHealthCheck(intervalMs?: number) {
    if (intervalMs) {
      this.healthCheckIntervalMs = intervalMs;
    }

    // 清除现有定时器
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // 启动新的定时器
    this.healthCheckInterval = setInterval(() => {
      this.healthCheck();
    }, this.healthCheckIntervalMs);

    log.info('Health Check Started:', { interval: this.healthCheckIntervalMs });
  }

  /**
   * 停止健康检查
   */
  stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
      log.info('Health Check Stopped');
    }
  }

  /**
   * 启用/禁用适配器
   */
  setAdapterEnabled(sourceType: ExternalDataSource, enabled: boolean) {
    const registration = this.adapters.get(sourceType);
    if (registration) {
      registration.enabled = enabled;
      log.info('Adapter Enabled/Disabled:', { sourceType, enabled });
    }
  }

  /**
   * 获取所有适配器状态
   */
  getAdapterStatus() {
    return Array.from(this.adapters.entries()).map(([sourceType, registration]) => ({
      sourceType,
      name: registration.adapter.name,
      priority: registration.priority,
      enabled: registration.enabled,
      healthy: registration.healthy,
      lastHealthCheck: registration.lastHealthCheck,
    }));
  }

  /**
   * 使用指定适配器获取状态节点
   */
  async getContainerStatusEvents(
    containerNumber: string,
    sourceType?: ExternalDataSource
  ): Promise<AdapterResponse<ContainerStatusNode[]>> {
    const adapter = sourceType
      ? this.getAdapter(sourceType)
      : this.getBestAdapter();

    if (!adapter) {
      return {
        success: false,
        error: 'No available adapter',
        source: this.defaultAdapter,
        timestamp: new Date(),
      };
    }

    try {
      return await adapter.getContainerStatusEvents(containerNumber);
    } catch (error) {
      // 失败时尝试下一个适配器
      log.warn(`Adapter ${adapter.name} failed, trying fallback...`);
      const fallbackAdapter = this.getBestAdapter();
      if (fallbackAdapter && fallbackAdapter !== adapter) {
        return await fallbackAdapter.getContainerStatusEvents(containerNumber);
      }
      throw error;
    }
  }

  /**
   * 使用指定适配器获取装载记录
   */
  async getContainerLoadingRecords(
    containerNumber: string,
    sourceType?: ExternalDataSource
  ): Promise<AdapterResponse<ContainerLoadingData[]>> {
    const adapter = sourceType
      ? this.getAdapter(sourceType)
      : this.getBestAdapter();

    if (!adapter) {
      return {
        success: false,
        error: 'No available adapter',
        source: this.defaultAdapter,
        timestamp: new Date(),
      };
    }

    return await adapter.getContainerLoadingRecords(containerNumber);
  }

  /**
   * 使用指定适配器获取HOLD记录
   */
  async getContainerHoldRecords(
    containerNumber: string,
    sourceType?: ExternalDataSource
  ): Promise<AdapterResponse<ContainerHoldData[]>> {
    const adapter = sourceType
      ? this.getAdapter(sourceType)
      : this.getBestAdapter();

    if (!adapter) {
      return {
        success: false,
        error: 'No available adapter',
        source: this.defaultAdapter,
        timestamp: new Date(),
      };
    }

    return await adapter.getContainerHoldRecords(containerNumber);
  }

  /**
   * 使用指定适配器获取费用记录
   */
  async getContainerCharges(
    containerNumber: string,
    sourceType?: ExternalDataSource
  ): Promise<AdapterResponse<ContainerChargeData[]>> {
    const adapter = sourceType
      ? this.getAdapter(sourceType)
      : this.getBestAdapter();

    if (!adapter) {
      return {
        success: false,
        error: 'No available adapter',
        source: this.defaultAdapter,
        timestamp: new Date(),
      };
    }

    return await adapter.getContainerCharges(containerNumber);
  }

  /**
   * 同步数据（使用默认适配器或指定适配器）
   */
  async syncContainerData(
    containerNumber: string,
    sourceType?: ExternalDataSource
  ): Promise<AdapterResponse<boolean>> {
    const adapter = sourceType
      ? this.getAdapter(sourceType)
      : this.getBestAdapter();

    if (!adapter) {
      return {
        success: false,
        error: 'No available adapter',
        source: this.defaultAdapter,
        timestamp: new Date(),
      };
    }

    return await adapter.syncContainerData(containerNumber);
  }

  /**
   * 处理Webhook
   */
  async handleWebhook(
    payload: any,
    sourceType: ExternalDataSource
  ): Promise<AdapterResponse<boolean>> {
    const adapter = this.getAdapter(sourceType);

    if (!adapter) {
      return {
        success: false,
        error: `Adapter not found: ${sourceType}`,
        source: sourceType,
        timestamp: new Date(),
      };
    }

    return await adapter.handleWebhook(payload);
  }

  /**
   * 销毁管理器
   */
  destroy() {
    this.stopHealthCheck();
    log.info('AdapterManager Destroyed');
  }
}

// 导出单例实例
export const adapterManager = new AdapterManager();
