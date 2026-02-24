/**
 * 飞驼API适配器实现
 * FeiTuo API Adapter Implementation
 *
 * 实现飞驼API的数据适配，将飞驼数据转换为标准格式
 */

import axios, { AxiosInstance } from 'axios';
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

/**
 * 飞驼API响应结构
 */
interface FeiTuoResponse<T> {
  code: number;
  message: string;
  data?: T;
}

interface FeiTuoStatusEvent {
  eventId: string;
  statusCode: string;
  statusNameEn: string;
  statusNameCn: string;
  occurredAt: string;
  location: {
    code: string;
    nameEn: string;
    nameCn: string;
    type: string;
    latitude?: number;
    longitude?: number;
    timezone?: number;
  };
  isFinal: boolean;
}

interface FeiTuoLoadingRecord {
  recordId: string;
  vesselName: string;
  voyageNumber: string;
  billOfLadingNumber: string;
  bookingNumber: string;
  originPortCode: string;
  destPortCode: string;
  etaOrigin: string;
  ataOrigin: string;
  etaDest: string;
  ataDest: string;
  loadingDate: string;
  dischargeDate: string;
  routeCode: string;
  carrier: {
    code: string;
    name: string;
  };
  operator: string;
}

/**
 * 飞驼API适配器类
 */
export class FeiTuoAdapter implements IExternalDataAdapter {
  readonly name = 'FeiTuo Adapter';
  readonly sourceType = ExternalDataSource.FEITUO;
  readonly enabled = true;

  private axiosInstance: AxiosInstance;
  private apiEndpoint: string;
  private apiKey: string;

  constructor() {
    this.apiEndpoint = config.feituo?.apiEndpoint || 'https://api.feituo.com/v1';
    this.apiKey = config.feituo?.apiKey || '';

    this.axiosInstance = axios.create({
      baseURL: this.apiEndpoint,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
    });

    // 请求拦截器
    this.axiosInstance.interceptors.request.use(
      (requestConfig) => {
        log.debug('FeiTuo API Request:', {
          method: requestConfig.method,
          url: requestConfig.url,
        });
        return requestConfig;
      },
      (error) => {
        log.error('FeiTuo API Request Error:', { error: error.message });
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        log.error('FeiTuo API Response Error:', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/health');
      return response.status === 200;
    } catch (error) {
      log.error('FeiTuo API Health Check Failed:', {
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
      const response = await this.axiosInstance.get<FeiTuoResponse<FeiTuoStatusEvent[]>>(
        `/containers/${containerNumber}/events`
      );

      if (response.data.code !== 0 || !response.data.data) {
        return {
          success: false,
          error: response.data.message || 'Failed to fetch status events',
          source: this.sourceType,
          timestamp: new Date(),
        };
      }

      const events: ContainerStatusNode[] = response.data.data.map((event) => ({
        statusCode: event.statusCode,
        statusNameEn: event.statusNameEn,
        statusNameCn: event.statusNameCn,
        occurredAt: new Date(event.occurredAt),
        locationCode: event.location.code,
        locationNameEn: event.location.nameEn,
        locationNameCn: event.location.nameCn,
        locationType: event.location.type,
        latitude: event.location.latitude,
        longitude: event.location.longitude,
        timezone: event.location.timezone,
        dataSource: 'FEITUO',
        isFinal: event.isFinal,
        isEstimated: event.isFinal ? false : true, // 非最终状态视为预计时间
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
    containerNumber: string
  ): Promise<AdapterResponse<ContainerLoadingData[]>> {
    try {
      const response = await this.axiosInstance.get<FeiTuoResponse<FeiTuoLoadingRecord[]>>(
        `/containers/${containerNumber}/loading-records`
      );

      if (response.data.code !== 0 || !response.data.data) {
        return {
          success: false,
          error: response.data.message || 'Failed to fetch loading records',
          source: this.sourceType,
          timestamp: new Date(),
        };
      }

      const records: ContainerLoadingData[] = response.data.data.map((record) => ({
        vesselName: record.vesselName,
        voyageNumber: record.voyageNumber,
        billOfLadingNumber: record.billOfLadingNumber,
        bookingNumber: record.bookingNumber,
        originPortCode: record.originPortCode,
        destPortCode: record.destPortCode,
        etaOrigin: new Date(record.etaOrigin),
        ataOrigin: new Date(record.ataOrigin),
        etaDest: new Date(record.etaDest),
        ataDest: new Date(record.ataDest),
        loadingDate: new Date(record.loadingDate),
        dischargeDate: new Date(record.dischargeDate),
        routeCode: record.routeCode,
        carrierCode: record.carrier.code,
        carrierName: record.carrier.name,
        operator: record.operator,
      }));

      return {
        success: true,
        data: records,
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
   * 根据集装箱号获取HOLD记录
   */
  async getContainerHoldRecords(
    containerNumber: string
  ): Promise<AdapterResponse<ContainerHoldData[]>> {
    try {
      const response = await this.axiosInstance.get<FeiTuoResponse<ContainerHoldData[]>>(
        `/containers/${containerNumber}/holds`
      );

      if (response.data.code !== 0 || !response.data.data) {
        return {
          success: false,
          error: response.data.message || 'Failed to fetch hold records',
          source: this.sourceType,
          timestamp: new Date(),
        };
      }

      return {
        success: true,
        data: response.data.data,
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
   * 根据集装箱号获取费用记录
   */
  async getContainerCharges(
    containerNumber: string
  ): Promise<AdapterResponse<ContainerChargeData[]>> {
    try {
      const response = await this.axiosInstance.get<FeiTuoResponse<ContainerChargeData[]>>(
        `/containers/${containerNumber}/charges`
      );

      if (response.data.code !== 0 || !response.data.data) {
        return {
          success: false,
          error: response.data.message || 'Failed to fetch charges',
          source: this.sourceType,
          timestamp: new Date(),
        };
      }

      return {
        success: true,
        data: response.data.data,
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
   * 同步数据到数据库
   */
  async syncContainerData(containerNumber: string): Promise<AdapterResponse<boolean>> {
    try {
      // 并行获取所有数据
      const [statusEvents, loadingRecords, holdRecords, charges] = await Promise.all([
        this.getContainerStatusEvents(containerNumber),
        this.getContainerLoadingRecords(containerNumber),
        this.getContainerHoldRecords(containerNumber),
        this.getContainerCharges(containerNumber),
      ]);

      // TODO: 将数据保存到数据库
      // 这里需要注入 Repository 来保存数据
      log.info('FeiTuo Data Sync Completed:', {
        containerNumber,
        statusEventsCount: statusEvents.data?.length || 0,
        loadingRecordsCount: loadingRecords.data?.length || 0,
        holdRecordsCount: holdRecords.data?.length || 0,
        chargesCount: charges.data?.length || 0,
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
      log.info('FeiTuo Webhook Received:', {
        eventType: payload.eventType,
        containerNumber: payload.containerNumber,
      });

      // TODO: 根据webhook事件类型处理数据
      switch (payload.eventType) {
        case 'STATUS_UPDATE':
          // 处理状态更新
          break;
        case 'LOADING_UPDATE':
          // 处理装载更新
          break;
        default:
          log.warn('Unknown FeiTuo Webhook Event:', { eventType: payload.eventType });
      }

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
}

// 导出单例实例
export const feituoAdapter = new FeiTuoAdapter();
