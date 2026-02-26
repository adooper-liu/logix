/**
 * 外部数据服务
 * 用于接入飞驼等外部数据源的状态事件数据
 */

import axios, { AxiosInstance } from 'axios';
import { AppDataSource } from '../database';
import { ContainerStatusEvent } from '../entities/ContainerStatusEvent';
import { logger } from '../utils/logger';

/**
 * 飞驼API响应数据结构
 */
interface FeituoTrackingResponse {
  code: number;
  message: string;
  data: FeituoTrackingData[];
}

interface FeituoTrackingData {
  containerNumber: string;
  trackingEvents: FeituoEvent[];
}

interface FeituoEvent {
  eventCode: string;
  eventName?: string;
  eventNameEn?: string;
  eventNameCn?: string;
  eventTime: string;
  locationCode?: string;
  locationName?: string;
  locationNameEn?: string;
  locationNameCn?: string;
  isEstimated?: boolean;
  statusCode?: string;
  latitude?: number;
  longitude?: number;
  timezone?: number;
  terminalName?: string;
  cargoLocation?: string;
  description?: string;
}

/**
 * 状态代码映射配置
 */
const STATUS_CODE_MAPPING: Record<string, string> = {
  // 飞驼状态代码映射到系统内部状态代码
  'BO': 'shipped',           // 已装船
  'DLPT': 'in_transit',      // 在途
  'ARRIVE': 'at_port',       // 到港
  'ATA': 'at_port',          // 实际到港
  'ETA': 'in_transit',       // 预计到港
  'GATE_IN': 'picked_up',    // 入闸
  'GATE_OUT': 'unloaded',    // 出闸
  'DISCHARGED': 'unloaded', // 卸货
  'AVAIL': 'picked_up',     // 可提货
  'EMPTY_RETURN': 'returned_empty', // 还空箱
};

/**
 * 数据源类型
 */
export enum DataSource {
  FEITUO = 'Feituo',
  AIS = 'AIS',
  SHIP_COMPANY = 'ShipCompany',
  TERMINAL = 'Terminal',
  USER = 'User',
  EXCEL = 'Excel',
}

/**
 * 外部数据服务类
 */
export class ExternalDataService {
  private apiClient: AxiosInstance;
  private apiConfig: any;

  constructor(config?: { apiKey?: string; apiUrl?: string }) {
    this.apiConfig = config || {
      apiKey: process.env.FEITUO_API_KEY || '',
      apiUrl: process.env.FEITUO_API_URL || 'https://api.feituo.com/v1',
    };

    this.apiClient = axios.create({
      baseURL: this.apiConfig.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiConfig.apiKey}`,
      },
    });

    // 请求拦截器 - 添加日志
    this.apiClient.interceptors.request.use((config) => {
      logger.info(`[ExternalDataService] API请求: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    // 响应拦截器 - 添加日志
    this.apiClient.interceptors.response.use(
      (response) => {
        logger.info(`[ExternalDataService] API响应: ${response.config.url} - ${response.status}`);
        return response;
      },
      (error) => {
        logger.error(`[ExternalDataService] API错误: ${error.message}`, error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * 从飞驼获取货柜追踪数据
   * @param containerNumbers 集装箱号数组
   */
  async fetchFromFeituo(containerNumbers: string[]): Promise<any[]> {
    try {
      logger.info(`[ExternalDataService] 从飞驼获取 ${containerNumbers.length} 个货柜的数据`);

      const response = await this.apiClient.post<FeituoTrackingResponse>('/tracking/batch', {
        containerNumbers,
        includeHistory: true,
      });

      if (response.data.code !== 200) {
        throw new Error(`飞驼API错误: ${response.data.message}`);
      }

      logger.info(`[ExternalDataService] 成功获取 ${response.data.data.length} 个货柜的追踪数据`);
      return response.data.data;

    } catch (error: any) {
      logger.error('[ExternalDataService] 从飞驼获取数据失败:', error);
      throw error;
    }
  }

  /**
   * 转换飞驼数据为状态事件
   * @param feituoData 飞驼API返回的数据
   * @param dataSource 数据源类型
   */
  private convertFeituoToStatusEvents(feituoData: FeituoTrackingData, dataSource: DataSource = DataSource.FEITUO): ContainerStatusEvent[] {
    const events: ContainerStatusEvent[] = [];

    feituoData.trackingEvents.forEach((event, index) => {
      const statusEvent = new ContainerStatusEvent();
      statusEvent.id = `${feituoData.containerNumber}-${dataSource}-${index}-${Date.now()}`;
      statusEvent.containerNumber = feituoData.containerNumber;

      // 状态代码转换
      statusEvent.statusCode = event.statusCode || event.eventCode;
      statusEvent.occurredAt = new Date(event.eventTime);
      statusEvent.isEstimated = event.isEstimated || false;

      // 地点信息
      statusEvent.locationCode = event.locationCode;
      statusEvent.locationNameEn = event.locationNameEn || event.locationName;
      statusEvent.locationNameCn = event.locationNameCn;
      statusEvent.locationNameOriginal = event.locationName;

      // 坐标信息
      statusEvent.latitude = event.latitude;
      statusEvent.longitude = event.longitude;
      statusEvent.timezone = event.timezone;

      // 码头信息
      statusEvent.terminalName = event.terminalName;
      statusEvent.cargoLocation = event.cargoLocation;

      // 状态类型
      statusEvent.statusType = this.detectStatusType(event.eventCode);

      // 数据源
      statusEvent.dataSource = dataSource;

      // 描述信息
      statusEvent.descriptionEn = event.description || event.eventNameEn;
      statusEvent.descriptionCn = event.description || event.eventNameCn;
      statusEvent.descriptionOriginal = event.description || event.eventName;

      events.push(statusEvent);
    });

    return events;
  }

  /**
   * 检测状态类型
   * @param eventCode 事件代码
   */
  private detectStatusType(eventCode: string): string {
    const code = eventCode.toUpperCase();

    if (code.includes('ETA') || code.includes('EST')) {
      return 'ETA';
    }
    if (code.includes('ATA') || code.includes('ARR')) {
      return 'ATA';
    }
    if (code.includes('ETD')) {
      return 'ETD';
    }
    if (code.includes('ATD')) {
      return 'ATD';
    }
    if (code.includes('GATE') && code.includes('IN')) {
      return 'GATE_IN';
    }
    if (code.includes('GATE') && code.includes('OUT')) {
      return 'GATE_OUT';
    }
    if (code.includes('DISCHARGE') || code.includes('UNLOAD')) {
      return 'DISCHARGED';
    }
    if (code.includes('PICKUP') || code.includes('RETRIEVE')) {
      return 'PICKUP';
    }

    return 'STATUS';
  }

  /**
   * 保存状态事件到数据库
   * @param events 状态事件数组
   */
  async saveStatusEvents(events: ContainerStatusEvent[]): Promise<ContainerStatusEvent[]> {
    try {
      const eventRepository = AppDataSource.getRepository(ContainerStatusEvent);

      // 使用upsert操作，先删除旧事件再插入新事件
      // 或者使用唯一键冲突忽略
      const savedEvents: ContainerStatusEvent[] = [];

      for (const event of events) {
        // 检查是否已存在相同的事件（基于容器号、状态代码、发生时间）
        const existingEvent = await eventRepository.findOne({
          where: {
            containerNumber: event.containerNumber,
            statusCode: event.statusCode,
            occurredAt: event.occurredAt,
          },
        });

        if (existingEvent) {
          // 更新现有事件
          Object.assign(existingEvent, event);
          const updated = await eventRepository.save(existingEvent);
          savedEvents.push(updated);
          logger.info(`[ExternalDataService] 更新状态事件: ${event.containerNumber} - ${event.statusCode}`);
        } else {
          // 创建新事件
          const saved = await eventRepository.save(event);
          savedEvents.push(saved);
          logger.info(`[ExternalDataService] 创建状态事件: ${event.containerNumber} - ${event.statusCode}`);
        }
      }

      logger.info(`[ExternalDataService] 保存了 ${savedEvents.length} 个状态事件`);
      return savedEvents;

    } catch (error) {
      logger.error('[ExternalDataService] 保存状态事件失败:', error);
      throw error;
    }
  }

  /**
   * 同步单个货柜的状态事件
   * @param containerNumber 集装箱号
   * @param dataSource 数据源类型
   */
  async syncContainerEvents(containerNumber: string, dataSource: DataSource = DataSource.FEITUO): Promise<ContainerStatusEvent[]> {
    try {
      logger.info(`[ExternalDataService] 开始同步货柜 ${containerNumber} 的状态事件`);

      // 从外部数据源获取数据
      const externalData = await this.fetchFromFeituo([containerNumber]);

      if (!externalData || externalData.length === 0) {
        logger.warn(`[ExternalDataService] 货柜 ${containerNumber} 没有外部数据`);
        return [];
      }

      // 转换为状态事件
      const events = this.convertFeituoToStatusEvents(externalData[0], dataSource);

      // 保存到数据库
      const savedEvents = await this.saveStatusEvents(events);

      logger.info(`[ExternalDataService] 成功同步货柜 ${containerNumber} 的 ${savedEvents.length} 个状态事件`);
      return savedEvents;

    } catch (error) {
      logger.error(`[ExternalDataService] 同步货柜 ${containerNumber} 失败:`, error);
      throw error;
    }
  }

  /**
   * 批量同步货柜状态事件
   * @param containerNumbers 集装箱号数组
   * @param dataSource 数据源类型
   */
  async syncBatchContainerEvents(containerNumbers: string[], dataSource: DataSource = DataSource.FEITUO): Promise<{ success: string[]; failed: { containerNumber: string; error: string }[] }> {
    logger.info(`[ExternalDataService] 开始批量同步 ${containerNumbers.length} 个货柜的状态事件`);

    const result = {
      success: [] as string[],
      failed: [] as { containerNumber: string; error: string }[],
    };

    for (const containerNumber of containerNumbers) {
      try {
        await this.syncContainerEvents(containerNumber, dataSource);
        result.success.push(containerNumber);
      } catch (error: any) {
        result.failed.push({
          containerNumber,
          error: error.message || '未知错误',
        });
        logger.error(`[ExternalDataService] 同步货柜 ${containerNumber} 失败:`, error);
      }
    }

    logger.info(`[ExternalDataService] 批量同步完成: 成功 ${result.success.length}, 失败 ${result.failed.length}`);
    return result;
  }

  /**
   * 按时间段同步状态事件
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param dataSource 数据源类型
   */
  async syncEventsByDateRange(startDate: Date, endDate: Date, dataSource: DataSource = DataSource.FEITUO): Promise<number> {
    logger.info(`[ExternalDataService] 按时间段同步状态事件: ${startDate.toISOString()} - ${endDate.toISOString()}`);

    // 获取该时间段内有物流活动的货柜列表
    const containerRepository = AppDataSource.getRepository(ContainerStatusEvent);
    const eventRepository = AppDataSource.getRepository(ContainerStatusEvent);

    // 获取在时间段内活跃的货柜
    // 这里可以结合 Container 表或其他业务表查询

    // TODO: 实现具体的按时间段同步逻辑
    return 0;
  }

  /**
   * 清理过期的预计状态事件
   * @param days 保留天数
   */
  async cleanExpiredEstimatedEvents(days: number = 7): Promise<number> {
    try {
      const eventRepository = AppDataSource.getRepository(ContainerStatusEvent);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await eventRepository
        .createQueryBuilder('event')
        .where('event.isEstimated = :isEstimated', { isEstimated: true })
        .andWhere('event.occurredAt < :cutoffDate', { cutoffDate })
        .andWhere('event.dataSource IN (:...dataSources)', {
          dataSources: [DataSource.FEITUO, DataSource.AIS],
        })
        .delete()
        .execute();

      logger.info(`[ExternalDataService] 清理了 ${result.affected || 0} 个过期的预计状态事件`);
      return result.affected || 0;

    } catch (error) {
      logger.error('[ExternalDataService] 清理过期状态事件失败:', error);
      throw error;
    }
  }
}

// 导出默认实例
export const externalDataService = new ExternalDataService();
