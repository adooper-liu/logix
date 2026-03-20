/**
 * 外部数据服务
 * 用于接入飞驼等外部数据源的状态事件数据
 */

import axios, { AxiosInstance } from 'axios';
import { AppDataSource } from '../database';
import { ContainerStatusEvent } from '../entities/ContainerStatusEvent';
import { PortOperation } from '../entities/PortOperation';
import { Container } from '../entities/Container';
import { SeaFreight } from '../entities/SeaFreight';
import { TruckingTransport } from '../entities/TruckingTransport';
import { EmptyReturn } from '../entities/EmptyReturn';
import { WarehouseOperation } from '../entities/WarehouseOperation';
import { InspectionRecord } from '../entities/InspectionRecord';
import { InspectionEvent } from '../entities/InspectionEvent';
import { ExtDemurrageStandard } from '../entities/ExtDemurrageStandard';
import { ExtDemurrageRecord } from '../entities/ExtDemurrageRecord';
import { ExtFeituoPlace } from '../entities/ExtFeituoPlace';
import { ExtFeituoStatusEvent } from '../entities/ExtFeituoStatusEvent';
import { ReplenishmentOrder } from '../entities/ReplenishmentOrder';
import { logger } from '../utils/logger';
import {
  shouldUpdateCoreField,
  getCoreFieldName,
  getPortTypeForStatusCode,
} from '../constants/FeiTuoStatusMapping';
import { auditLogService } from './auditLog.service';
import { DemurrageService } from './demurrage.service';
import { feituoPlacesProcessor } from './feituoPlaces.processor';
import { feituoSmartDateUpdater } from './feituo/FeituoSmartDateUpdater';

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
  places?: any[];  // 【增强】飞驼API返回的地点信息（优先于trackingEvents使用）
  billNo?: string;  // 提单号
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
  private requestQueue: Promise<any>[] = [];
  private readonly MAX_CONCURRENT_REQUESTS = 5;
  private readonly REQUEST_DELAY_MS = 200;

  // 【监控指标】同步统计
  private syncStats = {
    totalSyncCount: 0,        // 总同步次数
    successCount: 0,          // 成功次数
    failedCount: 0,           // 失败次数
    totalContainers: 0,       // 总同步货柜数
    successContainers: 0,     // 成功货柜数
    failedContainers: 0,      // 失败货柜数
    lastSyncTime: null as Date | null,  // 最后同步时间
  };

  // 数据仓库
  private portOperationRepository = AppDataSource.getRepository(PortOperation);
  private containerRepository = AppDataSource.getRepository(Container);
  private seaFreightRepository = AppDataSource.getRepository(SeaFreight);
  private truckingTransportRepository = AppDataSource.getRepository(TruckingTransport);
  private warehouseOperationRepository = AppDataSource.getRepository(WarehouseOperation);
  private emptyReturnRepository = AppDataSource.getRepository(EmptyReturn);
  private inspectionRecordRepository = AppDataSource.getRepository(InspectionRecord);
  private inspectionEventRepository = AppDataSource.getRepository(InspectionEvent);
  private demurrageService = new DemurrageService(
    AppDataSource.getRepository(ExtDemurrageStandard),
    AppDataSource.getRepository(Container),
    AppDataSource.getRepository(PortOperation),
    AppDataSource.getRepository(SeaFreight),
    AppDataSource.getRepository(TruckingTransport),
    AppDataSource.getRepository(EmptyReturn),
    AppDataSource.getRepository(ReplenishmentOrder),
    AppDataSource.getRepository(ExtDemurrageRecord)
  );

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
   * @param retries 重试次数
   */
  async fetchFromFeituo(containerNumbers: string[], retries: number = 3): Promise<any[]> {
    let lastError: any = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        logger.info(`[ExternalDataService] 从飞驼获取 ${containerNumbers.length} 个货柜的数据 (尝试 ${attempt + 1}/${retries + 1})`);

        const response = await this.apiClient.post<FeituoTrackingResponse>('/tracking/batch', {
          containerNumbers,
          includeHistory: true,
        });

        if (response.data.code !== 200) {
          const errorMsg = response.data.message || '未知错误';

          // 如果是速率限制错误，等待后重试
          if (errorMsg.includes('Too many requests') || response.status === 429) {
            logger.warn(`[ExternalDataService] 触发速率限制，等待后重试 (尝试 ${attempt + 1}/${retries + 1})`);
            await this.sleep(Math.pow(2, attempt) * 1000); // 指数退避: 1s, 2s, 4s
            lastError = new Error(errorMsg);
            continue;
          }

          throw new Error(`飞驼API错误: ${errorMsg}`);
        }

        logger.info(`[ExternalDataService] 成功获取 ${response.data.data.length} 个货柜的追踪数据`);
        return response.data.data;

      } catch (error: any) {
        lastError = error;

        // 如果是网络错误或速率限制错误，继续重试
        if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.response?.status === 429) {
          if (attempt < retries) {
            const delay = Math.pow(2, attempt) * 1000;
            logger.warn(`[ExternalDataService] 请求失败，${delay}ms后重试 (尝试 ${attempt + 1}/${retries + 1}): ${error.message}`);
            await this.sleep(delay);
            continue;
          }
        }

        // 其他错误直接抛出
        if (attempt === retries) {
          logger.error('[ExternalDataService] 从飞驼获取数据失败，已达到最大重试次数:', error);
          throw error;
        }
      }
    }

    throw lastError || new Error('从飞驼获取数据失败');
  }

  /**
   * 休眠函数
   * @param ms 毫秒数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 【优化】批量重算滞港费
   * 使用并发控制避免数据库连接耗尽
   *
   * @param containerNumbers 货柜号数组
   */
  private async batchRecalculateDemurrage(containerNumbers: string[]): Promise<void> {
    const CONCURRENCY_LIMIT = 3; // 限制并发数量

    logger.info(`[ExternalDataService] 开始批量重算滞港费: ${containerNumbers.length} 个货柜`);

    // 分批并发处理
    const batches = this.chunkArray(containerNumbers, CONCURRENCY_LIMIT);

    for (const batch of batches) {
      const promises = batch.map(containerNumber =>
        this.demurrageService.calculateForContainer(containerNumber).catch((e) => {
          logger.warn(`[ExternalDataService] 滞港费重算失败: ${containerNumber}`, e);
        })
      );

      await Promise.all(promises);

      // 批次之间短暂延迟，避免数据库压力
      if (batches.indexOf(batch) < batches.length - 1) {
        await this.sleep(100);
      }
    }

    logger.info(`[ExternalDataService] 批量重算滞港费完成: ${containerNumbers.length} 个货柜`);
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

      const feituoData = externalData[0];
      let savedEvents: ContainerStatusEvent[] = [];
      let updatedAtaFields: string[] = [];

      // 【增强功能】优先处理 places 数据（如果存在）
      // places 数据结构更完整，优先于 trackingEvents 使用
      if (feituoData.places && feituoData.places.length > 0) {
        logger.info(`[ExternalDataService] 检测到 places 数据，优先处理 ${feituoData.places.length} 个地点`);
        
        // 【新增】先保存 places 原始数据到 ext_feituo_places
        const syncRequestId = `API_${containerNumber}_${Date.now()}`;
        await this.savePlacesRawData(
          containerNumber,
          feituoData.billNo,
          feituoData.places,
          syncRequestId
        );
        
        // 动态导入 places 处理器（避免循环依赖）
        const { feituoPlacesProcessor } = await import('./feituoPlaces.processor');
        
        // 处理 places 数据
        const placesResult = await feituoPlacesProcessor.processPlaces(
          containerNumber,
          feituoData.places,
          feituoData.billNo
        );

        // 从 places 生成状态事件
        const placeEvents = await this.convertPlacesToStatusEvents(
          containerNumber,
          feituoData.places,
          dataSource
        );
        
        // 保存 places 生成的事件
        if (placeEvents.length > 0) {
          savedEvents = await this.saveStatusEvents(placeEvents);
        }

        // 更新ATA相关字段（用于触发滞港费重算）
        updatedAtaFields = await this.updatePortOperationFromPlaces(
          containerNumber,
          feituoData.places
        );

        logger.info(`[ExternalDataService] places 数据处理完成`, {
          containerNumber,
          placesProcessed: placesResult.successCount,
          eventsGenerated: placeEvents.length
        });
      } else {
        // 回退到传统的 trackingEvents 处理
        logger.info(`[ExternalDataService] 未检测到 places 数据，使用 trackingEvents`);
        
        // 转换为状态事件
        const events = this.convertFeituoToStatusEvents(feituoData, dataSource);

        // 【监控】检测非标准可提货状态码
        const nonStandardCodes = events.filter(e => e.statusCode === 'AVLE' || e.statusCode === 'AVAIL');
        if (nonStandardCodes.length > 0) {
          logger.warn(`[ExternalDataService] 检测到非标准可提货状态码`, {
            containerNumber,
            nonStandardEvents: nonStandardCodes.map(e => ({
              statusCode: e.statusCode,
              occurredAt: e.occurredAt,
              location: e.locationNameEn
            })),
            message: 'PCAB是飞驼官方标准码，AVLE/AVAIL为兼容码'
          });
        }

        // 保存到数据库
        savedEvents = await this.saveStatusEvents(events);

        // 更新PortOperation表的核心时间字段
        updatedAtaFields = await this.updatePortOperationCoreFields(
          containerNumber,
          feituoData.trackingEvents
        );
      }

      // 更新特殊核心字段（return_time、shipment_date）
      await this.updateSpecialCoreFields(containerNumber, feituoData.trackingEvents || []);

      // 关键: 重新计算货柜的物流状态
      await this.recalculateLogisticsStatus(containerNumber);

      // ATA 到港后触发滞港费重算，actual 模式覆盖 forecast 写入的 last_free_date
      if (updatedAtaFields.length > 0) {
        this.demurrageService.calculateForContainer(containerNumber).catch((e) =>
          logger.warn('[ExternalDataService] demurrage recalc on ATA update failed:', e)
        );
      }

      // 根据飞驼状态码自动标记查验状态
      // 查验状态码: CUIP(海关滞留)、CPI(出口报关查验)、CPI_I(进口报关查验)
      await this.updateInspectionStatus(containerNumber, feituoData.trackingEvents || []);

      logger.info(`[ExternalDataService] 成功同步货柜 ${containerNumber} 的 ${savedEvents.length} 个状态事件`);
      return savedEvents;

    } catch (error) {
      logger.error(`[ExternalDataService] 同步货柜 ${containerNumber} 失败:`, error);
      throw error;
    }
  }

  /**
   * 保存 places 原始数据到 ext_feituo_places 表
   * 实现完整审计：先落库原始数据，再解析
   */
  private async savePlacesRawData(
    containerNumber: string,
    billOfLadingNumber: string | undefined,
    places: any[],
    syncRequestId: string
  ): Promise<void> {
    try {
      const placeRepo = AppDataSource.getRepository(ExtFeituoPlace);
      
      for (let i = 0; i < places.length; i++) {
        const place = places[i];
        
        const extPlace = placeRepo.create({
          containerNumber,
          billOfLadingNumber: billOfLadingNumber || null,
          placeIndex: i,
          placeType: place.type || 0,
          portCode: place.code || place.locationCode || null,
          portName: place.name || null,
          portNameEn: place.nameEn || null,
          portNameCn: place.nameCn || null,
          nameOrigin: place.nameOrigin || null,
          sta: place.sta ? new Date(place.sta) : null,
          eta: place.eta ? new Date(place.eta) : null,
          ata: place.ata ? new Date(place.ata) : null,
          ataAis: place.ata_ais ? new Date(place.ata_ais) : null,
          atbAis: place.atb_ais ? new Date(place.atb_ais) : null,
          disc: place.disc ? new Date(place.disc) : null,
          std: place.std ? new Date(place.std) : null,
          etd: place.etd ? new Date(place.etd) : null,
          atd: place.atd ? new Date(place.atd) : null,
          atdAis: place.atd_ais ? new Date(place.atd_ais) : null,
          atbdAis: place.atbd_ais ? new Date(place.atbd_ais) : null,
          load: place.load ? new Date(place.load) : null,
          vesselName: place.vessel || null,
          voyageNumber: place.voyage || null,
          transportModeIn: place.transportMode_in || null,
          transportModeOut: place.transportMode_out || null,
          terminalName: place.terminalName || null,
          containerCountIn: place.containerCount_in || null,
          containerCountOut: place.containerCount_out || null,
          latitude: place.lat ? parseFloat(place.lat) : null,
          longitude: place.lon ? parseFloat(place.lon) : null,
          portTimezone: place.portTimezone || null,
          firmsCode: place.firmsCode || null,
          syncRequestId,
          dataSource: 'API',
          rawJson: place,
        });
        
        await placeRepo.save(extPlace);
      }
      
      logger.info(`[ExternalDataService] 保存 places 原始数据完成: ${containerNumber}, ${places.length} 条`);
    } catch (error) {
      logger.error(`[ExternalDataService] 保存 places 原始数据失败:`, error);
      // 原始数据保存失败不影响主流程，继续处理
    }
  }

  /**
   * 保存 status 原始数据到 ext_feituo_status_events 表
   * 实现完整审计：先落库原始数据，再解析
   */
  private async saveStatusRawData(
    containerNumber: string,
    billOfLadingNumber: string | undefined,
    statuses: any[],
    syncRequestId: string
  ): Promise<void> {
    try {
      const statusRepo = AppDataSource.getRepository(ExtFeituoStatusEvent);
      
      for (let i = 0; i < statuses.length; i++) {
        const s = statuses[i];
        
        const extStatus = statusRepo.create({
          containerNumber,
          billOfLadingNumber: billOfLadingNumber || null,
          statusIndex: i,
          eventCode: s.eventCode || 'UNKNOWN',
          descriptionCn: s.descriptionCn || null,
          descriptionEn: s.descriptionEn || null,
          eventDescriptionOrigin: s.descriptionEn || s.descriptionCn || null,
          eventTime: s.eventTime ? new Date(s.eventTime) : new Date(),
          isEstimated: s.isEsti === 'Y',
          portTimezone: s.portTimezone || null,
          eventPlace: s.eventPlace || null,
          eventPlaceOrigin: s.eventPlace || null,
          portCode: s.portCode || null,
          terminalName: s.terminalName || null,
          transportMode: s.transportMode || null,
          vesselName: s.vslName || s.vesselName || null,
          voyageNumber: s.voy || s.voyageNumber || null,
          relatedPlaceIndex: s.relatedPlaceIndex || null,
          source: s.source || null,
          firmsCode: s.firmsCode || null,
          billNo: s.billNo || null,
          declarationNo: s.declarationNo || null,
          syncRequestId,
          dataSource: 'API',
          rawJson: s,
        });
        
        await statusRepo.save(extStatus);
      }
      
      logger.info(`[ExternalDataService] 保存 status 原始数据完成: ${containerNumber}, ${statuses.length} 条`);
    } catch (error) {
      logger.error(`[ExternalDataService] 保存 status 原始数据失败:`, error);
      // 原始数据保存失败不影响主流程，继续处理
    }
  }

  /**
   * 从 places 生成状态事件
   * @param containerNumber 集装箱号
   * @param places places数组
   * @param dataSource 数据源
   */
  private async convertPlacesToStatusEvents(
    containerNumber: string,
    places: any[],
    dataSource: DataSource
  ): Promise<ContainerStatusEvent[]> {
    const events: ContainerStatusEvent[] = [];

    places.forEach((place, index) => {
      // 到达事件
      if (place.ata && place.type !== 'PRE' && place.type !== 'PDE') {
        const arrivalEvent = new ContainerStatusEvent();
        arrivalEvent.id = `${containerNumber}-${dataSource}-place-arrival-${index}-${Date.now()}`;
        arrivalEvent.containerNumber = containerNumber;
        arrivalEvent.statusCode = 'ARRI';
        arrivalEvent.eventCode = 'ARRI';
        arrivalEvent.eventName = `到达 ${place.locationCode}`;
        arrivalEvent.occurredAt = new Date(place.ata);
        arrivalEvent.isEstimated = false;
        arrivalEvent.locationCode = place.locationCode;
        arrivalEvent.locationNameEn = place.locationNameEn;
        arrivalEvent.locationNameCn = place.locationNameCn;
        arrivalEvent.dataSource = dataSource;
        arrivalEvent.rawData = place.rawData || place;
        events.push(arrivalEvent);
      }

      // 离港事件
      if (place.atd && place.type !== 'PRE' && place.type !== 'PDE') {
        const departureEvent = new ContainerStatusEvent();
        departureEvent.id = `${containerNumber}-${dataSource}-place-departure-${index}-${Date.now()}`;
        departureEvent.containerNumber = containerNumber;
        departureEvent.statusCode = 'DEPA';
        departureEvent.eventCode = 'DEPA';
        departureEvent.eventName = `离开 ${place.locationCode}`;
        departureEvent.occurredAt = new Date(place.atd);
        departureEvent.isEstimated = false;
        departureEvent.locationCode = place.locationCode;
        departureEvent.locationNameEn = place.locationNameEn;
        departureEvent.locationNameCn = place.locationNameCn;
        departureEvent.dataSource = dataSource;
        departureEvent.rawData = place.rawData || place;
        events.push(departureEvent);
      }
    });

    return events;
  }

  /**
   * 从 places 更新港口操作的核心字段
   * @param containerNumber 集装箱号
   * @param places places数组
   * @returns 更新的ATA相关字段列表
   */
  private async updatePortOperationFromPlaces(
    containerNumber: string,
    places: any[]
  ): Promise<string[]> {
    const updatedFields: string[] = [];

    for (const place of places) {
      if (!place.locationCode || (place.type !== 'POL' && place.type !== 'POD')) {
        continue;
      }

      const portOperation = await this.portOperationRepository.findOne({
        where: {
          containerNumber,
          portCode: place.locationCode,
          portType: place.type === 'POL' ? 'origin' : 'destination'
        }
      });

      if (!portOperation) {
        continue;
      }

      let hasUpdates = false;

      // 更新 ETA
      if (place.eta && shouldUpdateCoreField('eta', portOperation.eta)) {
        if (place.type === 'POD') {
          portOperation.eta = new Date(place.eta);
          updatedFields.push('eta');
        } else if (place.type === 'POL') {
          portOperation.eta = new Date(place.eta);
          updatedFields.push('eta_origin_port');
        }
        hasUpdates = true;
      }

      // 更新 ATA
      if (place.ata && shouldUpdateCoreField('ata', portOperation.ata)) {
        if (place.type === 'POD') {
          portOperation.ata = new Date(place.ata);
          updatedFields.push('ata');
        } else if (place.type === 'POL') {
          portOperation.ata = new Date(place.ata);
          updatedFields.push('ata_origin_port');
        }
        hasUpdates = true;
      }

      // 更新 ETD
      if (place.etd && shouldUpdateCoreField('etd', portOperation.etd)) {
        portOperation.etd = new Date(place.etd);
        updatedFields.push('etd');
        hasUpdates = true;
      }

      // 更新 ATD
      if (place.atd && shouldUpdateCoreField('atd', portOperation.atd)) {
        portOperation.atd = new Date(place.atd);
        updatedFields.push('atd');
        hasUpdates = true;
      }

      if (hasUpdates) {
        portOperation.dataSource = 'Feituo';
        await this.portOperationRepository.save(portOperation);
      }
    }

    return [...new Set(updatedFields)]; // 去重
  }

  private static readonly ATA_RELATED_FIELDS = [
    'ata',                    // 目的港实际到港 - 核心状态机字段
    'dest_port_unload_date',  // 目的港卸柜日期 - 状态机使用
    'discharged_time',        // 卸船时间 - 状态机使用
    'transit_arrival_date',   // 中转港到港 - 状态机使用
    'gate_in_time',           // 进港时间 - 状态机使用
    'shipment_date',          // 出运日期 - 状态机使用
    'return_time',            // 还箱时间 - 状态机使用
    'available_time',         // 可提货时间 - 状态机使用
  ];

  /**
   * 更新PortOperation表的核心时间字段
   * 根据飞驼状态代码更新对应的字段
   *
   * @param containerNumber 集装箱号
   * @param feituoEvents 飞驼事件数组
   * @returns 更新的目的港 ATA 相关字段（用于触发滞港费重算）
   */
  private async updatePortOperationCoreFields(
    containerNumber: string,
    feituoEvents: FeituoEvent[]
  ): Promise<string[]> {
    try {
      if (!feituoEvents || feituoEvents.length === 0) {
        return [];
      }

      // 查找所有港口操作记录
      const portOperations = await this.portOperationRepository
        .createQueryBuilder('po')
        .where('po.containerNumber = :containerNumber', { containerNumber })
        .getMany();

      if (portOperations.length === 0) {
        logger.warn(`[ExternalDataService] 货柜 ${containerNumber} 没有港口操作记录`);
        return [];
      }

      // 【新增】查询货柜、拖卡运输、仓库操作信息，用于智能验证
      const [container, truckingTransport, warehouseOperation] = await Promise.all([
        this.containerRepository.findOne({ where: { containerNumber } }),
        this.truckingTransportRepository.findOne({ where: { containerNumber } }),
        this.warehouseOperationRepository.findOne({ where: { containerNumber } }),
      ]);

      // 构建港口操作链信息（用于内部一致性校验）
      const portOperationsChain = portOperations.map(po => ({
        portSequence: po.portSequence ?? 0,
        portType: po.portType as 'origin' | 'transit' | 'destination',
        ata: po.ata,
        atd: po.atd,
        eta: po.eta,
        etd: po.etd,
      }));

      // 找到上一港信息
      const destinationPort = portOperations.find(po => po.portType === 'destination');
      const previousPort = destinationPort
        ? portOperations
            .filter(po => po.portSequence !== undefined && destinationPort.portSequence !== undefined)
            .filter(po => (po.portSequence ?? 0) < (destinationPort.portSequence ?? 0))
            .sort((a, b) => (b.portSequence ?? 0) - (a.portSequence ?? 0))[0]
        : undefined;

      let updatedCount = 0;
      const changedFields: Record<string, { old?: unknown; new?: unknown }> = {};
      const updatedAtaFields: string[] = [];

      // 遍历飞驼事件,更新对应的核心时间字段
      for (const event of feituoEvents) {
        // 检查是否应该更新核心字段
        if (!shouldUpdateCoreField(event.statusCode, event.hasOccurred !== false)) {
          continue;
        }

        // 获取核心字段名
        const coreFieldName = getCoreFieldName(event.statusCode);
        if (!coreFieldName) {
          continue;
        }

        // 【新增】ATA更新前智能验证
        if (coreFieldName === 'ata' && event.statusCode !== 'ETA') {
          const validationResult = feituoSmartDateUpdater.validateATA({
            ata: new Date(event.eventTime),
            eta: destinationPort?.eta ?? null,
            shipDate: null,
            logisticsStatus: container?.logisticsStatus ?? 'unknown',
            portType: destinationPort?.portType as 'origin' | 'transit' | 'destination' | null ?? null,
            portOperations: portOperationsChain,
            previousPort: previousPort ? {
              portSequence: previousPort.portSequence ?? 0,
              portType: previousPort.portType as 'origin' | 'transit' | 'destination',
              atd: previousPort.atd,
              ata: previousPort.ata,
            } : undefined,
            truckingTransport: truckingTransport ? {
              pickupDate: truckingTransport.pickupDate ?? null,
              deliveryDate: truckingTransport.deliveryDate ?? null,
              gateInTime: truckingTransport.gateInTime ?? null,
            } : undefined,
            warehouseOperation: warehouseOperation ? {
              wmsConfirmDate: warehouseOperation.wmsConfirmDate ?? null,
              inboundDate: warehouseOperation.inboundDate ?? null,
            } : undefined,
          });

          if (!validationResult.valid) {
            logger.warn(`[ExternalDataService] ATA智能验证失败: ${validationResult.reason}, 跳过更新`, {
              containerNumber,
              newAta: event.eventTime,
            });
            continue; // 验证不通过，跳过更新
          }

          if (validationResult.warnings && validationResult.warnings.length > 0) {
            logger.warn(`[ExternalDataService] ATA智能验证警告:`, {
              containerNumber,
              warnings: validationResult.warnings,
            });
          }
        }

        // 获取港口类型
        const portType = getPortTypeForStatusCode(event.statusCode);

        // 查找对应的港口操作记录
        let targetPortOperation: PortOperation | null = null;

        if (portType) {
          // 根据港口类型和地点代码查找匹配的记录
          const matchedByLocation = portOperations.filter(po =>
            po.portType === portType &&
            (po.portCode === event.locationCode || po.portName === event.locationName || po.portName === event.locationNameEn || po.portName === event.locationNameCn)
          );

          if (matchedByLocation.length > 0) {
            // 如果有多个匹配，选择 port_sequence 最大的（最新的）
            targetPortOperation = matchedByLocation.reduce((latest, current) =>
              (current.portSequence ?? 0) > (latest.portSequence ?? 0) ? current : latest
            );
          } else {
            // 如果没有匹配的港口，按港口类型选择 port_sequence 最大的记录
            const sameTypePorts = portOperations.filter(po => po.portType === portType);
            if (sameTypePorts.length > 0) {
              targetPortOperation = sameTypePorts.reduce((latest, current) =>
                (current.portSequence ?? 0) > (latest.portSequence ?? 0) ? current : latest
              );
            }
          }
        }

        if (!targetPortOperation) {
          // 如果仍然找不到，使用第一个记录（兜底）
          targetPortOperation = portOperations[0];
        }

        if (!targetPortOperation) {
          logger.warn(`[ExternalDataService] 无法找到货柜 ${containerNumber} 的港口操作记录`);
          continue;
        }

        // 更新核心时间字段
        const eventTime = new Date(event.eventTime);
        const currentValue = (targetPortOperation as any)[coreFieldName];

        // 只有当飞驼数据更新时才更新字段
        if (!currentValue || eventTime > currentValue) {
          changedFields[coreFieldName] = {
            old: currentValue ? (currentValue instanceof Date ? currentValue.toISOString() : currentValue) : null,
            new: eventTime.toISOString()
          };
          (targetPortOperation as any)[coreFieldName] = eventTime;
          if (
            targetPortOperation.portType === 'destination' &&
            ExternalDataService.ATA_RELATED_FIELDS.includes(coreFieldName)
          ) {
            updatedAtaFields.push(coreFieldName);
          }

          // 标记数据源
          if (!targetPortOperation.dataSource) {
            targetPortOperation.dataSource = 'Feituo';
          }

          logger.info(`[ExternalDataService] 更新核心字段: ${containerNumber} - ${coreFieldName} = ${eventTime}`);
          updatedCount++;
        }
      }

      // 保存所有更新的港口操作记录
      if (updatedCount > 0) {
        await this.portOperationRepository.save(portOperations);
        logger.info(`[ExternalDataService] 成功更新货柜 ${containerNumber} 的 ${updatedCount} 个核心字段`);

        // 记录数据变更日志
        await auditLogService.logChange({
          sourceType: 'feituo_api',
          entityType: 'process_port_operations',
          entityId: containerNumber,
          action: 'UPDATE',
          changedFields: Object.keys(changedFields).length > 0 ? changedFields : null,
          remark: `飞驼API同步，更新 ${updatedCount} 个核心字段`
        });
      }

      return updatedAtaFields;
    } catch (error) {
      logger.error(`[ExternalDataService] 更新核心字段失败:`, error);
      throw error;
    }
  }

  /**
   * 重新计算货柜的物流状态
   * 基于更新后的核心时间字段重新计算状态
   *
   * @param containerNumber 集装箱号
   */
  private async recalculateLogisticsStatus(containerNumber: string): Promise<void> {
    try {
      // 动态导入状态机模块,避免循环依赖
      const { calculateLogisticsStatus } = await import('../utils/logisticsStatusMachine');

      // 获取货柜
      const container = await this.containerRepository.findOne({
        where: { containerNumber },
        relations: []
      });

      if (!container) {
        logger.warn(`[ExternalDataService] 货柜 ${containerNumber} 不存在`);
        return;
      }

      // 获取港口操作记录
      const portOperations = await this.portOperationRepository
        .createQueryBuilder('po')
        .where('po.containerNumber = :containerNumber', { containerNumber })
        .orderBy('po.portSequence', 'DESC')
        .getMany();

      // 获取其他相关数据 (用于状态机计算)
      // 必须完整查询这些关联数据，否则 picked_up / unloaded / returned_empty 状态无法正确计算
      const [seaFreight, truckingTransport, warehouseOperation, emptyReturn] = await Promise.all([
        this.seaFreightRepository.findOne({ where: { containerNumber } }),
        this.truckingTransportRepository.findOne({ where: { containerNumber } }),
        this.warehouseOperationRepository.findOne({ where: { containerNumber } }),
        this.emptyReturnRepository.findOne({ where: { containerNumber } }),
      ]);

      // 计算新的物流状态
      const result = calculateLogisticsStatus(
        container,
        portOperations,
        seaFreight ?? undefined,
        truckingTransport ?? undefined,
        warehouseOperation ?? undefined,
        emptyReturn ?? undefined
      );

      // 更新货柜的物流状态
      if (result.status !== container.logisticsStatus) {
        const oldStatus = container.logisticsStatus;
        const newStatus = result.status;

        container.logisticsStatus = newStatus;
        await this.containerRepository.save(container);

        logger.info(`[ExternalDataService] 货柜 ${containerNumber} 物流状态更新: ${oldStatus} -> ${newStatus}`);

        // 【增强审计】记录详细的状态变更日志
        await auditLogService.logChange({
          sourceType: 'feituo_sync',
          entityType: 'biz_containers',
          entityId: containerNumber,
          action: 'UPDATE',
          changedFields: {
            logistics_status: {
              old: oldStatus,
              new: newStatus
            },
            // 添加触发字段信息
            _triggerFields: {
              old: null,
              new: result.triggerFields || null
            },
            // 添加状态计算详情
            _statusCalculation: {
              old: null,
              new: {
                reason: result.reason || null,
                hasReturnTime: !!emptyReturn?.returnTime,
                hasWmsConfirm: !!warehouseOperation?.wmsConfirmDate,
                hasPickupDate: !!truckingTransport?.pickupDate,
                hasDestAta: portOperations.some(po => po.portType === 'destination' && po.ata),
                hasTransitAta: portOperations.some(po => po.portType === 'transit' && po.ata),
                hasShipmentDate: !!seaFreight?.shipmentDate,
              }
            }
          },
          remark: `飞驼同步触发状态机重算: ${oldStatus} → ${newStatus}`
        });
      }

    } catch (error) {
      logger.error(`[ExternalDataService] 重新计算物流状态失败:`, error);
      // 不抛出错误,避免影响主流程
    }
  }

  /**
   * 批量同步货柜状态事件
   * 优化为批量请求+并发控制，避免触发API速率限制
   * @param containerNumbers 集装箱号数组
   * @param dataSource 数据源类型
   */
  async syncBatchContainerEvents(containerNumbers: string[], dataSource: DataSource = DataSource.FEITUO): Promise<{ success: string[]; failed: { containerNumber: string; error: string }[] }> {
    logger.info(`[ExternalDataService] 开始批量同步 ${containerNumbers.length} 个货柜的状态事件`);

    // 【监控】记录同步开始
    this.recordSyncStart(containerNumbers.length);

    const result = {
      success: [] as string[],
      failed: [] as { containerNumber: string; error: string }[],
    };

    try {
      // 【优化】收集需要重算滞港费的货柜，批次处理完成后统一重算
      const containersNeedingDemurrageRecalc: string[] = [];

      // 策略1: 使用飞驼批量API一次性获取所有数据
      if (containerNumbers.length <= 50) {
        // 分批处理，每批最多50个货柜
        const batches = this.chunkArray(containerNumbers, 50);

        for (const batch of batches) {
          try {
            logger.info(`[ExternalDataService] 处理批次: ${batch.length} 个货柜`);

            // 批量获取数据
            const externalData = await this.fetchFromFeituo(batch);

            // 并发处理每个货柜
            const processPromises = externalData.map(async (data) => {
              try {
                const events = this.convertFeituoToStatusEvents(data, dataSource);

                // 【监控】检测非标准可提货状态码
                const nonStandardCodes = events.filter(e => e.statusCode === 'AVLE' || e.statusCode === 'AVAIL');
                if (nonStandardCodes.length > 0) {
                  logger.warn(`[ExternalDataService] 检测到非标准可提货状态码`, {
                    containerNumber: data.containerNumber,
                    nonStandardEvents: nonStandardCodes.map(e => ({
                      statusCode: e.statusCode,
                      occurredAt: e.occurredAt,
                      location: e.locationNameEn
                    })),
                    message: 'PCAB是飞驼官方标准码，AVLE/AVAIL为兼容码'
                  });
                }

                await this.saveStatusEvents(events);
                const updatedAtaFields = await this.updatePortOperationCoreFields(
                  data.containerNumber,
                  data.trackingEvents
                );
                await this.recalculateLogisticsStatus(data.containerNumber);

                // 【优化】收集需要重算滞港费的货柜，而不是立即触发
                if (updatedAtaFields.length > 0) {
                  containersNeedingDemurrageRecalc.push(data.containerNumber);
                }
                return data.containerNumber;
              } catch (error: any) {
                logger.error(`[ExternalDataService] 处理货柜 ${data.containerNumber} 失败:`, error);
                throw error;
              }
            });

            // 控制并发数量
            const processed = await this.processWithConcurrencyLimit(processPromises, this.MAX_CONCURRENT_REQUESTS);
            result.success.push(...processed);

          } catch (error: any) {
            // 整批失败，标记所有货柜为失败
            batch.forEach(containerNumber => {
              result.failed.push({
                containerNumber,
                error: error.message || '批次处理失败',
              });
            });
            logger.error(`[ExternalDataService] 批次处理失败:`, error);
          }

          // 批次之间延迟，避免触发速率限制
          if (batches.indexOf(batch) < batches.length - 1) {
            await this.sleep(this.REQUEST_DELAY_MS);
          }
        }

        // 【优化】批次处理完成后，统一触发滞港费重算
        if (containersNeedingDemurrageRecalc.length > 0) {
          logger.info(`[ExternalDataService] 批次处理完成，统一重算 ${containersNeedingDemurrageRecalc.length} 个货柜的滞港费`);
          await this.batchRecalculateDemurrage(containersNeedingDemurrageRecalc);
        }

      } else {
        // 超过50个货柜，使用逐个请求的方式(避免单次请求过大)
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

          // 请求之间延迟
          await this.sleep(this.REQUEST_DELAY_MS);
        }
      }

    } catch (error: any) {
      logger.error('[ExternalDataService] 批量同步失败:', error);
      // 【监控】记录同步失败
      this.recordSyncFailed(containerNumbers.length);
    }

    // 【监控】根据结果记录成功/失败
    if (result.success.length > 0 && result.failed.length === 0) {
      this.recordSyncSuccess(result.success.length);
    } else if (result.failed.length > 0) {
      this.recordSyncFailed(result.failed.length);
    }

    logger.info(`[ExternalDataService] 批量同步完成: 成功 ${result.success.length}, 失败 ${result.failed.length}`);
    return result;
  }

  /**
   * 数组分块
   * @param array 原数组
   * @param size 每块大小
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 并发控制处理Promise数组
   * @param promises Promise数组
   * @param concurrencyLimit 并发限制
   */
  private async processWithConcurrencyLimit<T>(promises: (() => Promise<T>)[], concurrencyLimit: number): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const promiseFunc of promises) {
      const promise = promiseFunc();

      results.push(
        promise.then((value) => value).catch((error) => {
          // 忽略错误，让调用方处理
          throw error;
        })
      );

      const executingPromise = promise.finally(() => {
        executing.splice(executing.indexOf(executingPromise), 1);
      });

      executing.push(executingPromise);

      if (executing.length >= concurrencyLimit) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);
    return results.filter((result): result is T => result !== undefined);
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

  /**
   * 更新特殊核心字段
   * 处理 return_time（写 process_empty_return 表）和 shipment_date（写 process_sea_freight 表）
   * 这些字段不在 PortOperation 表中，需要单独处理
   *
   * @param containerNumber 集装箱号
   * @param feituoEvents 飞驼事件数组
   */
  private async updateSpecialCoreFields(containerNumber: string, feituoEvents: FeituoEvent[]): Promise<void> {
    if (!feituoEvents || feituoEvents.length === 0) {
      return;
    }

    for (const event of feituoEvents) {
      // 检查是否应该更新核心字段
      if (!shouldUpdateCoreField(event.statusCode, event.hasOccurred !== false)) {
        continue;
      }

      const coreFieldName = getCoreFieldName(event.statusCode);
      if (!coreFieldName) {
        continue;
      }

      const eventTime = new Date(event.eventTime);

      // 处理 return_time（还箱时间）- 写 process_empty_return 表
      if (coreFieldName === 'return_time') {
        try {
          let emptyReturn = await this.emptyReturnRepository.findOne({ where: { containerNumber } });
          if (!emptyReturn) {
            emptyReturn = this.emptyReturnRepository.create({ containerNumber });
          }
          emptyReturn.returnTime = eventTime;
          await this.emptyReturnRepository.save(emptyReturn);
          logger.info(`[ExternalDataService] 写回 return_time: ${containerNumber} = ${eventTime}`);
        } catch (err) {
          logger.warn(`[ExternalDataService] 写回 return_time 失败:`, err);
        }
        continue;
      }

      // 处理 shipment_date（出运日期）- 写 process_sea_freight 表
      if (coreFieldName === 'shipment_date') {
        try {
          // 先从 Container 获取关联的 SeaFreight
          const container = await this.containerRepository.findOne({
            where: { containerNumber },
            relations: ['seaFreight'],
          });
          const bl = container?.seaFreight?.billOfLadingNumber;
          if (bl) {
            const seaFreight = await this.seaFreightRepository.findOne({ where: { billOfLadingNumber: bl } });
            if (seaFreight) {
              seaFreight.shipmentDate = eventTime;
              await this.seaFreightRepository.save(seaFreight);
              logger.info(`[ExternalDataService] 写回 shipment_date: ${containerNumber} = ${eventTime}`);
            }
          }
        } catch (err) {
          logger.warn(`[ExternalDataService] 写回 shipment_date 失败:`, err);
        }
        continue;
      }
    }
  }

  /**
   * 根据飞驼状态码自动标记查验状态
   * 当检测到查验相关状态码时：
   * 1. 设置 Container.inspectionRequired = true
   * 2. 创建/更新 ext_inspection_records 记录
   * 3. 添加初始查验事件
   *
   * 查验状态码:
   * - CUIP: 海关滞留( Customs on hold)
   * - CPI: 出口报关查验 (Export Customs Inspection)
   * - CPI_I: 进口报关查验 (Import Customs Inspection)
   *
   * @param containerNumber 集装箱号
   * @param feituoEvents 飞驼事件数组
   */
  private async updateInspectionStatus(containerNumber: string, feituoEvents: FeituoEvent[]): Promise<void> {
    if (!feituoEvents || feituoEvents.length === 0) {
      return;
    }

    // 查验状态码列表
    const INSPECTION_STATUS_CODES = ['CUIP', 'CPI', 'CPI_I'];

    // 获取查验相关的事件
    const inspectionEvents = feituoEvents.filter(event =>
      INSPECTION_STATUS_CODES.includes(event.statusCode)
    );

    if (inspectionEvents.length === 0) {
      return;
    }

    // 按时间排序，取最早的事件时间
    const sortedEvents = inspectionEvents.sort(
      (a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime()
    );
    const firstInspectionEvent = sortedEvents[0];

    try {
      // 获取货柜
      const container = await this.containerRepository.findOne({
        where: { containerNumber },
      });

      if (!container) {
        logger.warn(`[ExternalDataService] 货柜不存在: ${containerNumber}`);
        return;
      }

      // 如果已经是查验状态，只更新记录，不重复设置
      const isNewInspection = !container.inspectionRequired;

      // 设置查验标记
      container.inspectionRequired = true;
      await this.containerRepository.save(container);

      // 查找或创建查验记录
      let inspectionRecord = await this.inspectionRecordRepository.findOne({
        where: { containerNumber },
      });

      if (!inspectionRecord) {
        // 创建新的查验记录
        inspectionRecord = this.inspectionRecordRepository.create({
          containerNumber,
          inspectionNoticeDate: new Date(firstInspectionEvent.eventTime),
          latestStatus: '查验中',
          customsClearanceStatus: '查验中',
          dataSource: 'FeituoAPI',
          remarks: `飞驼自动触发查验，状态码: ${inspectionEvents.map(e => e.statusCode).join(',')}`,
        });
        await this.inspectionRecordRepository.save(inspectionRecord);
        logger.info(`[ExternalDataService] 创建查验记录: ${containerNumber}`);
      } else {
        // 更新已有记录
        if (!inspectionRecord.inspectionNoticeDate) {
          inspectionRecord.inspectionNoticeDate = new Date(firstInspectionEvent.eventTime);
        }
        if (!inspectionRecord.latestStatus || inspectionRecord.latestStatus !== '已放行') {
          inspectionRecord.latestStatus = '查验中';
          inspectionRecord.customsClearanceStatus = '查验中';
        }
        inspectionRecord.dataSource = 'FeituoAPI';
        inspectionRecord.remarks = `飞驼自动触发更新，状态码: ${inspectionEvents.map(e => e.statusCode).join(',')}`;
        await this.inspectionRecordRepository.save(inspectionRecord);
        logger.info(`[ExternalDataService] 更新查验记录: ${containerNumber}`);
      }

      // 添加查验事件（只有新触发时才添加）
      if (isNewInspection) {
        const eventStatusMap: Record<string, string> = {
          CUIP: '海关滞留 - 待清关检查',
          CPI: '出口报关查验',
          CPI_I: '进口报关查验',
        };

        const event = this.inspectionEventRepository.create({
          inspectionRecordId: inspectionRecord.id,
          eventDate: new Date(firstInspectionEvent.eventTime),
          eventStatus: eventStatusMap[firstInspectionEvent.statusCode] || `飞驼状态码: ${firstInspectionEvent.statusCode}`,
        });
        await this.inspectionEventRepository.save(event);
        logger.info(`[ExternalDataService] 添加查验事件: ${containerNumber}, 状态: ${event.eventStatus}`);
      }

      logger.info(`[ExternalDataService] 自动标记货柜为查验状态: ${containerNumber}, 状态码: ${inspectionEvents.map(e => e.statusCode).join(',')}`);
    } catch (err) {
      logger.warn(`[ExternalDataService] 自动标记查验状态失败:`, err);
    }
  }

  // ==================== 监控指标方法 ====================

  /**
   * 获取同步统计信息
   * @returns 同步统计对象
   */
  getSyncStats() {
    return {
      ...this.syncStats,
      successRate: this.syncStats.totalSyncCount > 0
        ? ((this.syncStats.successCount / this.syncStats.totalSyncCount) * 100).toFixed(2) + '%'
        : '0%',
      containerSuccessRate: this.syncStats.totalContainers > 0
        ? ((this.syncStats.successContainers / this.syncStats.totalContainers) * 100).toFixed(2) + '%'
        : '0%',
    };
  }

  /**
   * 记录同步开始
   * @param containerCount 货柜数量
   */
  private recordSyncStart(containerCount: number): void {
    this.syncStats.totalSyncCount++;
    this.syncStats.totalContainers += containerCount;
    this.syncStats.lastSyncTime = new Date();
  }

  /**
   * 记录同步成功
   * @param containerCount 成功货柜数量
   */
  private recordSyncSuccess(containerCount: number): void {
    this.syncStats.successCount++;
    this.syncStats.successContainers += containerCount;
  }

  /**
   * 记录同步失败
   * @param containerCount 失败货柜数量
   */
  private recordSyncFailed(containerCount: number): void {
    this.syncStats.failedCount++;
    this.syncStats.failedContainers += containerCount;
  }

  /**
   * 重置统计信息
   */
  resetSyncStats(): void {
    this.syncStats = {
      totalSyncCount: 0,
      successCount: 0,
      failedCount: 0,
      totalContainers: 0,
      successContainers: 0,
      failedContainers: 0,
      lastSyncTime: null,
    };
  }
}

// 导出默认实例
export const externalDataService = new ExternalDataService();
