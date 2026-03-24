// @ts-nocheck
// TD-008：shouldUpdateCoreField 与 ContainerStatusEvent 创建参数与实体对齐后再移除
/**
 * 飞驼API places 数据处理服务
 * 负责将飞驼API返回的 places 数组转换为系统内部数据结构
 *
 * @功能
 * - 解析 places 数组
 * - 映射到港口操作记录（PortOperation）
 * - 生成状态事件（StatusEvent）
 * - 处理多港经停场景
 * - 支持多式联运（驳船/大船/铁路/卡车）
 *
 * @使用场景
 * 当飞驼API返回的数据包含 places 数组时，调用此服务处理
 * places 数据比 trackingEvents 更结构化，优先使用
 *
 * @文档 https://doc.freightower.com/
 * @作者 LogiX Team
 * @日期 2026-03-18
 */

import { AppDataSource } from '../database';
import { PortOperation } from '../entities/PortOperation';
import { ContainerStatusEvent } from '../entities/ContainerStatusEvent';
import { Container } from '../entities/Container';
import { logger } from '../utils/logger';
import {
  FeituoPlace,
  PlaceType,
  PlaceProcessingResult
} from '../interfaces/FeituoPlaces.interface';
import {
  shouldUpdateCoreField
} from '../constants/FeiTuoStatusMapping';

/**
 * 飞驼Places处理器类
 */
export class FeituoPlacesProcessor {
  private portOperationRepository = AppDataSource.getRepository(PortOperation);
  private statusEventRepository = AppDataSource.getRepository(ContainerStatusEvent);
  private containerRepository = AppDataSource.getRepository(Container);

  /**
   * 默认状态码配置
   */
  private readonly DEFAULT_STATUS_CODES = {
    origin: ['RCVE', 'STSP', 'GITM', 'GTOT'],
    transit: ['TSBA', 'TSDP', 'DEPA', 'FDBA'],
    destination: ['BDAR', 'POCA', 'DSCH', 'AVLE', 'GTIN', 'RCVE']
  };

  /**
   * 操作类型到状态码的映射
   */
  private readonly OPERATION_TO_STATUS_CODE = {
    LOAD: ['LOBD', 'LOAD', 'FDLB', 'FDDP'],
    DISCHARGE: ['DSCH', 'DISC', 'FDBA'],
    TRANSSHIPMENT: ['TSBA', 'TSDP']
  };

  /**
   * 处理 places 数组
   * @param containerNumber 集装箱号
   * @param places places数组
   * @param billNo 提单号（可选）
   * @returns 处理结果
   */
  async processPlaces(
    containerNumber: string,
    places: FeituoPlace[],
    billNo?: string
  ): Promise<PlaceProcessingResult> {
    const startTime = Date.now();
    logger.info(`[FeituoPlacesProcessor] 开始处理 places 数据`, {
      containerNumber,
      placesCount: places.length,
      billNo
    });

    const result: PlaceProcessingResult = {
      successCount: 0,
      failedCount: 0,
      portOperations: [],
      statusEvents: [],
      errors: [],
      processingTime: 0
    };

    try {
      // 验证集装箱是否存在
      const container = await this.containerRepository.findOne({
        where: { containerNumber }
      });

      if (!container) {
        const errorMsg = `集装箱不存在: ${containerNumber}`;
        logger.error(`[FeituoPlacesProcessor] ${errorMsg}`);
        result.errors.push(errorMsg);
        result.processingTime = Date.now() - startTime;
        return result;
      }

      // 按 sequence 排序 places
      const sortedPlaces = [...places].sort((a, b) =>
        (a.sequence ?? 0) - (b.sequence ?? 0)
      );

      // 处理每个 place
      for (const place of sortedPlaces) {
        try {
          const processingResult = await this.processSinglePlace(
            containerNumber,
            place,
            billNo
          );

          if (processingResult.success) {
            result.successCount++;
            if (processingResult.portOperation) {
              result.portOperations.push(processingResult.portOperation);
            }
            if (processingResult.statusEvents) {
              result.statusEvents.push(...processingResult.statusEvents);
            }
          } else {
            result.failedCount++;
            if (processingResult.error) {
              result.errors.push(processingResult.error);
            }
          }
        } catch (error) {
          result.failedCount++;
          const errorMsg = `处理 place 失败: ${error.message}`;
          logger.error(`[FeituoPlacesProcessor] ${errorMsg}`, {
            containerNumber,
            place: place.locationCode,
            error
          });
          result.errors.push(errorMsg);
        }
      }

      result.processingTime = Date.now() - startTime;

      logger.info(`[FeituoPlacesProcessor] places 数据处理完成`, {
        containerNumber,
        successCount: result.successCount,
        failedCount: result.failedCount,
        processingTime: result.processingTime
      });

      return result;
    } catch (error) {
      logger.error(`[FeituoPlacesProcessor] 处理失败`, {
        containerNumber,
        error
      });
      throw error;
    }
  }

  /**
   * 处理单个 place
   * @param containerNumber 集装箱号
   * @param place 单个place对象
   * @param billNo 提单号
   * @returns 处理结果
   */
  private async processSinglePlace(
    containerNumber: string,
    place: FeituoPlace,
    billNo?: string
  ): Promise<{
    success: boolean;
    portOperation?: any;
    statusEvents?: any[];
    error?: string;
  }> {
    try {
      // 确定港口类型
      const portType = this.determinePortType(place);
      if (!portType) {
        return {
          success: false,
          error: `无法确定港口类型: ${place.type}`
        };
      }

      // 查找或创建港口操作记录
      let portOperation = await this.findOrCreatePortOperation(
        containerNumber,
        place,
        portType
      );

      // 更新港口操作记录的核心字段
      portOperation = await this.updatePortOperationFields(
        portOperation,
        place,
        portType
      );

      // 生成状态事件
      const statusEvents = await this.generateStatusEvents(
        containerNumber,
        place,
        portOperation,
        billNo
      );

      return {
        success: true,
        portOperation,
        statusEvents
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 确定港口类型
   * @param place place对象
   * @returns 港口类型（origin/transit/destination）
   */
  private determinePortType(place: FeituoPlace): string | null {
    // 根据 place.type 确定港口类型
    const typeMap: Record<PlaceType, string> = {
      'PRE': null,  // 收货地，不创建港口操作记录
      'POL': 'origin',
      'POD': 'destination',
      'PDE': null   // 交货地，不创建港口操作记录
    };

    return typeMap[place.type] ?? null;
  }

  /**
   * 查找或创建港口操作记录
   * @param containerNumber 集装箱号
   * @param place place对象
   * @param portType 港口类型
   * @returns 港口操作记录
   */
  private async findOrCreatePortOperation(
    containerNumber: string,
    place: FeituoPlace,
    portType: string
  ): Promise<PortOperation> {
    // 查找现有的港口操作记录
    const existingOperation = await this.portOperationRepository.findOne({
      where: {
        containerNumber,
        portCode: place.locationCode,
        portType
      },
      order: { createdAt: 'DESC' }
    });

    if (existingOperation) {
      return existingOperation;
    }

    // 创建新的港口操作记录
    const newOperation = this.portOperationRepository.create({
      containerNumber,
      portCode: place.locationCode,
      portName: place.locationNameEn || place.locationNameCn || place.locationCode,
      portType,
      portSequence: place.sequence ?? 1,
      transportMode: place.transportMode || 'VESSEL',
      shippingCompany: place.carrierCode,
      shippingCompanyName: place.carrierName,
      createdAt: new Date()
    });

    return await this.portOperationRepository.save(newOperation);
  }

  /**
   * 更新港口操作记录的核心字段
   * @param portOperation 港口操作记录
   * @param place place对象
   * @param portType 港口类型
   * @returns 更新后的港口操作记录
   */
  private async updatePortOperationFields(
    portOperation: PortOperation,
    place: FeituoPlace,
    portType: string
  ): Promise<PortOperation> {
    let hasUpdates = false;

    // 更新 ETA（预计到港/离港时间）
    if (place.eta && shouldUpdateCoreField('eta', portOperation.eta)) {
      if (portType === 'destination') {
        portOperation.eta = new Date(place.eta);
      } else if (portType === 'origin') {
        portOperation.eta = new Date(place.eta);
      }
      hasUpdates = true;
    }

    // 更新 ATA（实际到港/离港时间）
    if (place.ata && shouldUpdateCoreField('ata', portOperation.ata)) {
      if (portType === 'destination') {
        portOperation.ata = new Date(place.ata);
      } else if (portType === 'origin') {
        portOperation.ata = new Date(place.ata);
      }
      hasUpdates = true;
    }

    // 更新 ETD（预计离港时间）
    if (place.etd && shouldUpdateCoreField('etd', portOperation.etd)) {
      portOperation.etd = new Date(place.etd);
      hasUpdates = true;
    }

    // 更新 ATD（实际离港时间）
    if (place.atd && shouldUpdateCoreField('atd', portOperation.atd)) {
      portOperation.atd = new Date(place.atd);
      hasUpdates = true;
    }

    // 更新承运人信息
    if (place.carrierCode) {
      portOperation.shippingCompany = place.carrierCode;
      hasUpdates = true;
    }
    if (place.carrierName) {
      portOperation.shippingCompanyName = place.carrierName;
      hasUpdates = true;
    }

    // 更新运输模式
    if (place.transportMode) {
      portOperation.transportMode = place.transportMode;
      hasUpdates = true;
    }

    // 更新数据源标记
    portOperation.dataSource = 'Feituo';
    portOperation.rawData = {
      ...(portOperation.rawData || {}),
      ...place.rawData,
      processedBy: 'FeituoPlacesProcessor',
      processedAt: new Date().toISOString()
    };
    hasUpdates = true;

    // 如果有更新，保存记录
    if (hasUpdates) {
      return await this.portOperationRepository.save(portOperation);
    }

    return portOperation;
  }

  /**
   * 生成状态事件
   * @param containerNumber 集装箱号
   * @param place place对象
   * @param portOperation 港口操作记录
   * @param billNo 提单号
   * @returns 状态事件数组
   */
  private async generateStatusEvents(
    containerNumber: string,
    place: FeituoPlace,
    portOperation: PortOperation,
    billNo?: string
  ): Promise<ContainerStatusEvent[]> {
    const events: ContainerStatusEvent[] = [];

    // 根据place状态生成相应的状态事件
    if (place.status === 'COMPLETED' && place.ata) {
      // 到达事件
      const arrivalEvent = this.statusEventRepository.create({
        containerNumber,
        eventCode: 'ARRI',
        eventName: 'Arrival at Port',
        occurredAt: new Date(place.ata),
        locationCode: place.locationCode,
        locationName: place.locationNameEn || place.locationNameCn,
        portType: portOperation.portType,
        portCode: portOperation.portCode,
        billOfLadingNumber: billNo,
        dataSource: 'Feituo',
        rawData: place.rawData
      });
      events.push(arrivalEvent);
    }

    if (place.status === 'COMPLETED' && place.atd) {
      // 离港事件
      const departureEvent = this.statusEventRepository.create({
        containerNumber,
        eventCode: 'DEPA',
        eventName: 'Departure from Port',
        occurredAt: new Date(place.atd),
        locationCode: place.locationCode,
        locationName: place.locationNameEn || place.locationNameCn,
        portType: portOperation.portType,
        portCode: portOperation.portCode,
        billOfLadingNumber: billNo,
        dataSource: 'Feituo',
        rawData: place.rawData
      });
      events.push(departureEvent);
    }

    // 保存状态事件
    if (events.length > 0) {
      return await this.statusEventRepository.save(events);
    }

    return [];
  }

  /**
   * 验证 places 数据的有效性
   * @param places places数组
   * @returns 验证结果
   */
  validatePlaces(places: FeituoPlace[]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!places || !Array.isArray(places)) {
      errors.push('places必须是有效的数组');
      return { isValid: false, errors, warnings };
    }

    if (places.length === 0) {
      warnings.push('places数组为空');
      return { isValid: true, errors, warnings };
    }

    // 验证每个place
    places.forEach((place, index) => {
      if (!place.type) {
        errors.push(`places[${index}]: type字段缺失`);
      } else if (!['PRE', 'POL', 'POD', 'PDE'].includes(place.type)) {
        errors.push(`places[${index}]: type值无效: ${place.type}`);
      }

      if (!place.locationCode) {
        errors.push(`places[${index}]: locationCode字段缺失`);
      }

      // 检查时间逻辑
      if (place.eta && place.ata && new Date(place.ata) < new Date(place.eta)) {
        warnings.push(`places[${index}]: ATA早于ETA`);
      }

      if (place.etd && place.atd && new Date(place.atd) < new Date(place.etd)) {
        warnings.push(`places[${index}]: ATD早于ETD`);
      }
    });

    // 检查sequence重复
    const sequences = places.map(p => p.sequence).filter(s => s !== undefined);
    const uniqueSequences = new Set(sequences);
    if (sequences.length !== uniqueSequences.size) {
      warnings.push('存在重复的sequence值');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

/**
 * Places处理器单例
 */
export const feituoPlacesProcessor = new FeituoPlacesProcessor();
