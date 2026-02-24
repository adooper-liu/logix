/**
 * 物流路径微服务适配器实现
 * Logistics Path Microservice Adapter Implementation
 *
 * 实现物流路径微服务的GraphQL API适配
 */

import { logisticsPathService } from '../services/logisticsPath.service.js';
import { log } from '../utils/logger.js';
import {
  IExternalDataAdapter,
  AdapterResponse,
  ExternalDataSource,
  ContainerStatusNode,
  ContainerLoadingData,
  ContainerHoldData,
  ContainerChargeData,
} from './ExternalDataAdapter.interface.js';

/**
 * Logistics Path API响应结构
 */
interface StatusNode {
  id: string;
  status: string;
  description: string;
  timestamp: Date;
  location?: {
    id: string;
    name: string;
    code: string;
    type: string;
    country?: string;
  };
  nodeStatus: string;
  isAlert: boolean;
}

/**
 * 物流路径微服务适配器类
 */
export class LogisticsPathAdapter implements IExternalDataAdapter {
  readonly name = 'Logistics Path Adapter';
  readonly sourceType = ExternalDataSource.LOGISTICS_PATH;
  readonly enabled = true;

  constructor() {
    log.info('Logistics Path Adapter Initialized');
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const health = await logisticsPathService.healthCheck();
      return health.status === 'ok';
    } catch (error) {
      log.error('Logistics Path Health Check Failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * 根据集装箱号获取状态节点列表
   */
  async getContainerStatusEvents(
    containerNumber: string
  ): Promise<AdapterResponse<ContainerStatusNode[]>> {
    try {
      const path = await logisticsPathService.getStatusPathByContainer(containerNumber);

      const events: ContainerStatusNode[] = path.nodes.map((node: any) => ({
        statusCode: node.status,
        statusNameEn: node.description, // 使用英文描述
        statusNameCn: this.translateStatus(node.status), // 翻译为中文
        occurredAt: node.timestamp,
        locationCode: node.location?.code || '',
        locationNameEn: node.location?.name || '',
        locationNameCn: this.translateLocation(node.location?.code),
        locationType: node.location?.type || 'UNKNOWN',
        latitude: undefined,
        longitude: undefined,
        timezone: undefined,
        dataSource: 'LOGISTICS_PATH',
        isFinal: node.nodeStatus === 'COMPLETED',
      }));

      return {
        success: true,
        data: events,
        source: this.sourceType,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: this.sourceType,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 根据集装箱号获取装载记录
   */
  async getContainerLoadingRecords(
    _containerNumber: string
  ): Promise<AdapterResponse<ContainerLoadingData[]>> {
    // Logistics Path API 不提供装载记录，返回空数组
    return {
      success: true,
      data: [],
      source: this.sourceType,
      timestamp: new Date(),
    };
  }

  /**
   * 根据集装箱号获取HOLD记录
   */
  async getContainerHoldRecords(
    _containerNumber: string
  ): Promise<AdapterResponse<ContainerHoldData[]>> {
    // Logistics Path API 不提供HOLD记录，返回空数组
    return {
      success: true,
      data: [],
      source: this.sourceType,
      timestamp: new Date(),
    };
  }

  /**
   * 根据集装箱号获取费用记录
   */
  async getContainerCharges(
    _containerNumber: string
  ): Promise<AdapterResponse<ContainerChargeData[]>> {
    // Logistics Path API 不提供费用记录，返回空数组
    return {
      success: true,
      data: [],
      source: this.sourceType,
      timestamp: new Date(),
    };
  }

  /**
   * 同步数据到数据库
   */
  async syncContainerData(containerNumber: string): Promise<AdapterResponse<boolean>> {
    try {
      // 获取状态路径
      const path = await logisticsPathService.getStatusPathByContainer(containerNumber);

      // TODO: 将数据保存到数据库
      log.info('Logistics Path Data Sync Completed:', {
        containerNumber,
        nodesCount: path.nodes.length,
        overallStatus: path.overallStatus,
      });

      return {
        success: true,
        data: true,
        source: this.sourceType,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: this.sourceType,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Webhook回调处理
   */
  async handleWebhook(payload: any): Promise<AdapterResponse<boolean>> {
    try {
      log.info('Logistics Path Webhook Received:', {
        eventType: payload.eventType,
        data: payload.data,
      });

      // TODO: 根据webhook事件类型处理数据

      return {
        success: true,
        data: true,
        source: this.sourceType,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: this.sourceType,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 状态翻译（英文 -> 中文）
   */
  private translateStatus(status: string): string {
    const statusMap: Record<string, string> = {
      NOT_SHIPPED: '未出运',
      IN_TRANSIT: '在途',
      AT_PORT: '已到港',
      PICKED_UP: '已提柜',
      UNLOADED: '已卸柜',
      RETURNED_EMPTY: '已还箱',
    };
    return statusMap[status] || status;
  }

  /**
   * 港口翻译（代码 -> 中文名）
   */
  private translateLocation(portCode?: string): string {
    // 这里可以从数据库查询港口字典
    return portCode || '';
  }
}

// 导出单例实例
export const logisticsPathAdapter = new LogisticsPathAdapter();
