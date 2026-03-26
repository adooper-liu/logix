/**
 * 智能排柜服务
 * Intelligent Scheduling Service
 *
 * 实现规则引擎（阶段一）：先到先得 + 约束校验
 */

import { In } from 'typeorm';
import { AppDataSource } from '../database';
import { Container } from '../entities/Container';
import { Customer } from '../entities/Customer';
import { CustomsBroker } from '../entities/CustomsBroker';
import { DictSchedulingConfig } from '../entities/DictSchedulingConfig';
import { EmptyReturn } from '../entities/EmptyReturn';
import { ExtDemurrageRecord } from '../entities/ExtDemurrageRecord';
import { ExtDemurrageStandard } from '../entities/ExtDemurrageStandard';
import { ExtTruckingReturnSlotOccupancy } from '../entities/ExtTruckingReturnSlotOccupancy';
import { ExtTruckingSlotOccupancy } from '../entities/ExtTruckingSlotOccupancy';
import { ExtWarehouseDailyOccupancy } from '../entities/ExtWarehouseDailyOccupancy';
import { PortOperation } from '../entities/PortOperation';
import { ReplenishmentOrder } from '../entities/ReplenishmentOrder';
import { SeaFreight } from '../entities/SeaFreight';
import { TruckingCompany } from '../entities/TruckingCompany';
import { TruckingPortMapping } from '../entities/TruckingPortMapping';
import { TruckingTransport } from '../entities/TruckingTransport';
import { Warehouse } from '../entities/Warehouse';
import { WarehouseOperation } from '../entities/WarehouseOperation';
import { WarehouseTruckingMapping } from '../entities/WarehouseTruckingMapping';
import { normalizeCountryCode } from '../utils/countryCode';
import * as dateTimeUtils from '../utils/dateTimeUtils';
import { logger } from '../utils/logger';
import { ContainerStatusService } from './containerStatus.service';
import { DemurrageService } from './demurrage.service';

/**
 * 未指定的清关公司编码
 */
const UNSPECIFIED_CUSTOMS_BROKER = 'UNSPECIFIED';

export interface ScheduleRequest {
  country?: string; // 国家过滤
  startDate?: string; // 开始日期
  endDate?: string; // 结束日期
  forceSchedule?: boolean; // 是否强制重排（忽略 schedule_status）
  containerNumbers?: string[]; // 指定柜号列表，仅排这些柜（用于单柜模拟）
  limit?: number; // 每批处理数量，用于分步排产
  skip?: number; // 跳过数量，用于分步排产
  dryRun?: boolean; // 是否为预览模式（true=只计算不保存）
  etaBufferDays?: number; // ETA 顺延天数（可选，前端传入，默认 0）
}

export interface ScheduleResult {
  containerNumber: string;
  success: boolean;
  message?: string;
  // 货柜基本信息（用于前端展示）
  destinationPort?: string;
  destinationPortName?: string;
  warehouseName?: string;
  etaDestPort?: string;
  ataDestPort?: string;
  plannedData?: {
    plannedCustomsDate?: string;
    plannedPickupDate?: string;
    plannedDeliveryDate?: string;
    plannedUnloadDate?: string;
    plannedReturnDate?: string;
    truckingCompanyId?: string;
    truckingCompany?: string;
    warehouseId?: string;
    warehouseName?: string;
    warehouseCountry?: string; // ✅ 仓库国家代码，用于前端货币格式化
    unloadMode?: 'Drop off' | 'Live load';
    customsBrokerCode?: string;
  };
  // 预估费用（dryRun 模式下计算）
  estimatedCosts?: {
    demurrageCost?: number;
    detentionCost?: number;
    storageCost?: number;
    transportationCost?: number;
    yardStorageCost?: number; // 外部堆场堆存费（Drop off 模式专属）
    totalCost?: number;
    currency?: string;
  };
}

export interface BatchScheduleResponse {
  success: boolean;
  total: number;
  successCount: number;
  failedCount: number;
  results: ScheduleResult[];
  hasMore?: boolean; // 是否还有待排产货柜（分步排产时使用）
}

/**
 * 智能排柜服务
 */
export class IntelligentSchedulingService {
  private containerRepo = AppDataSource.getRepository(Container);
  private portOperationRepo = AppDataSource.getRepository(PortOperation);
  private truckingTransportRepo = AppDataSource.getRepository(TruckingTransport);
  private warehouseOperationRepo = AppDataSource.getRepository(WarehouseOperation);
  private emptyReturnRepo = AppDataSource.getRepository(EmptyReturn);
  private warehouseOccupancyRepo = AppDataSource.getRepository(ExtWarehouseDailyOccupancy);
  private truckingOccupancyRepo = AppDataSource.getRepository(ExtTruckingSlotOccupancy);
  private truckingPortMappingRepo = AppDataSource.getRepository(TruckingPortMapping);
  private warehouseTruckingMappingRepo = AppDataSource.getRepository(WarehouseTruckingMapping);
  private customerRepo = AppDataSource.getRepository(Customer);
  private customsBrokerRepo = AppDataSource.getRepository(CustomsBroker);
  private schedulingConfigRepo = AppDataSource.getRepository(DictSchedulingConfig);
  private containerStatusService = new ContainerStatusService();
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

  /**
   * 批量排产
   * 对 schedule_status = initial 的货柜进行智能排产
   */
  async batchSchedule(request: ScheduleRequest): Promise<BatchScheduleResponse> {
    const results: ScheduleResult[] = [];

    try {
      // 1. 查询待排产的货柜
      const containers = await this.getContainersToSchedule(request);
      logger.info(`[IntelligentScheduling] Found ${containers.length} containers to schedule`);

      // 2. 按清关可放行日排序（先到先得，使用 DB 已有 lastFreeDate）
      const sortedContainers = this.sortByClearanceDate(containers);

      // 分步排产：limit/skip
      const skip = Math.max(0, request.skip ?? 0);
      const limit =
        request.limit != null && request.limit > 0 ? request.limit : sortedContainers.length;
      const toProcess = sortedContainers.slice(skip, skip + limit);
      const hasMore = skip + limit < sortedContainers.length;

      // 3. 仅对本批货柜做滞港费写回（避免全量写回导致首批迟迟不返回）
      const CONCURRENCY = 5;
      const lastFreeByCn: Record<string, Date> = {};
      try {
        const numbers = toProcess.map((c) => c.containerNumber);
        for (let i = 0; i < numbers.length; i += CONCURRENCY) {
          const batch = numbers.slice(i, i + CONCURRENCY);
          const settled = await Promise.allSettled(
            batch.map((cn) => this.demurrageService.calculateForContainer(cn))
          );
          for (let j = 0; j < batch.length; j++) {
            const s = settled[j];
            const computed =
              s.status === 'fulfilled'
                ? s.value?.result?.calculationDates?.lastPickupDateComputed
                : null;
            if (computed) lastFreeByCn[batch[j]] = new Date(computed);
          }
        }
        for (const c of toProcess) {
          const destPo = c.portOperations?.find((po: any) => po.portType === 'destination');
          if (destPo && lastFreeByCn[c.containerNumber]) {
            (destPo as any).lastFreeDate = lastFreeByCn[c.containerNumber];
          }
        }
      } catch (e) {
        logger.warn('[IntelligentScheduling] Pre-schedule write-back failed (continuing):', e);
      }

      // 4. 对每个货柜进行排产（dryRun 模式下只计算不保存）
      for (const container of toProcess) {
        const result = await this.scheduleSingleContainer(container, request);
        results.push(result);
      }

      const successCount = results.filter((r) => r.success).length;
      return {
        success: true,
        total: containers.length,
        successCount,
        failedCount: results.length - successCount,
        results,
        hasMore
      };
    } catch (error: any) {
      logger.error('[IntelligentScheduling] batchSchedule error:', error);
      return {
        success: false,
        total: results.length,
        successCount: results.filter((r) => r.success).length,
        failedCount: results.length - results.filter((r) => r.success).length,
        results
      };
    }
  }

  /**
   * 获取待排产的货柜
   * 过滤条件：schedule_status = initial，且有 ATA 或 ETA
   * 加载 customer 以便取 country（国家代码），见 12-国家概念统一约定.md
   */
  private async getContainersToSchedule(request: ScheduleRequest): Promise<Container[]> {
    const query = this.containerRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.portOperations', 'po')
      .leftJoinAndSelect('c.seaFreight', 'sf')
      .leftJoinAndSelect('c.replenishmentOrders', 'o')
      .leftJoinAndSelect('o.customer', 'cust')
      .where('c.scheduleStatus IN (:...statuses)', { statuses: ['initial', 'issued'] });

    if (request.startDate) {
      query.andWhere('(po.ata >= :startDate OR po.eta >= :startDate)', {
        startDate: request.startDate
      });
    }
    if (request.endDate) {
      query.andWhere('(po.ata <= :endDate OR po.eta <= :endDate)', {
        endDate: request.endDate
      });
    }
    if (request.containerNumbers && request.containerNumbers.length > 0) {
      query.andWhere('c.containerNumber IN (:...containerNumbers)', {
        containerNumbers: request.containerNumbers
      });
    }
    if (request.country?.trim()) {
      query.andWhere('cust.country = :country', { country: request.country.trim() });
    }

    return query.getMany();
  }

  /**
   * 按清关可放行日排序（先到先得）
   * 优先：ATA > ETA，同日内按 last_free_date 升序
   */
  private sortByClearanceDate(containers: Container[]): Container[] {
    return containers.sort((a, b) => {
      // 获取目的港操作记录
      const aDestPo = a.portOperations?.find((po: any) => po.portType === 'destination');
      const bDestPo = b.portOperations?.find((po: any) => po.portType === 'destination');

      const aDate = aDestPo?.ata || aDestPo?.eta || a.seaFreight?.eta;
      const bDate = bDestPo?.ata || bDestPo?.eta || b.seaFreight?.eta;

      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;

      // 按日期升序
      const dateCompare = new Date(aDate).getTime() - new Date(bDate).getTime();
      if (dateCompare !== 0) return dateCompare;

      // 同日内按 last_free_date 升序
      const aLastFree = aDestPo?.lastFreeDate ? new Date(aDestPo.lastFreeDate).getTime() : 0;
      const bLastFree = bDestPo?.lastFreeDate ? new Date(bDestPo.lastFreeDate).getTime() : 0;
      return aLastFree - bLastFree;
    });
  }

  /**
   * 对单个货柜进行排产
   * 规则引擎（阶段一）：先到先得 + 约束校验
   */
  private async scheduleSingleContainer(
    container: Container,
    _request: ScheduleRequest
  ): Promise<ScheduleResult> {
    try {
      // 获取目的港操作记录
      const destPo = container.portOperations?.find((po: any) => po.portType === 'destination');

      // 提取货柜基本信息用于前端展示
      const containerInfo = {
        destinationPort: destPo?.portCode || '',
        destinationPortName: destPo?.portName || '',
        etaDestPort: destPo?.eta ? new Date(destPo.eta).toISOString().split('T')[0] : '',
        ataDestPort: destPo?.ata ? new Date(destPo.ata).toISOString().split('T')[0] : ''
      };

      if (!destPo) {
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: '无目的港操作记录',
          ...containerInfo
        };
      }

      // 1. 清关计划日默认等于 ETA（无 ETA 时回退 ATA）
      const clearanceDate = destPo.eta || destPo.ata;
      if (!clearanceDate) {
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: '无到港日期（ATA/ETA），无法排产',
          ...containerInfo
        };
      }

      // 2. 计算计划清关日、提柜日（若 ATA/ETA 已过，提柜日至少为今天）
      // ✅ 修复：确保 clearanceDate 是 Date 对象，然后格式化为 YYYY-MM-DD 字符串
      let plannedCustomsDate: Date;

      if (clearanceDate instanceof Date) {
        // 如果已经是 Date 对象，直接使用（避免字符串拼接导致的格式错误）
        plannedCustomsDate = new Date(clearanceDate);
        logger.debug(
          `[IntelligentScheduling] ETA/ATA is Date object for ${container.containerNumber}`
        );
      } else if (typeof clearanceDate === 'string') {
        // 如果是字符串，添加时间部分并解析
        plannedCustomsDate = new Date(clearanceDate + 'T00:00:00');
        logger.debug(`[IntelligentScheduling] ETA/ATA is string for ${container.containerNumber}`);
      } else {
        logger.error(
          `[IntelligentScheduling] Invalid clearanceDate type: ${typeof clearanceDate} for ${container.containerNumber}`
        );
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: '到港日期类型错误',
          ...containerInfo
        };
      }

      // ✅ 立即验证 plannedCustomsDate 有效性
      if (!plannedCustomsDate || isNaN(plannedCustomsDate.getTime())) {
        logger.error(
          `[IntelligentScheduling] Failed to parse clearanceDate to valid Date for ${container.containerNumber}`
        );
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: '清关日期解析失败',
          ...containerInfo
        };
      }

      // ✅ 新增：ETA 顺延天数（从请求参数读取，前端传入，不保存）
      // 业务场景：给清关预留足够时间，避免排产计划从一开始就过期
      const etaBufferDays = _request.etaBufferDays || 0;
      if (etaBufferDays > 0) {
        plannedCustomsDate.setDate(plannedCustomsDate.getDate() + etaBufferDays);
        logger.debug(
          `[IntelligentScheduling] ETA buffer applied: +${etaBufferDays} days for ${container.containerNumber}`
        );
      }

      let plannedPickupDate = await this.calculatePlannedPickupDate(
        plannedCustomsDate,
        destPo.lastFreeDate
      );

      // ✅ 验证日期有效性
      if (!plannedPickupDate || isNaN(plannedPickupDate.getTime())) {
        logger.warn(
          `[IntelligentScheduling] Invalid pickup date calculated for ${container.containerNumber}`
        );
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: '计算提柜日失败',
          ...containerInfo
        };
      }

      // ✅ 修复：使用纯日期比较（忽略时区），避免跨国业务场景下的日期混乱
      // 业务场景：英国货柜的 ETA 是英国本地日期，应该用英国日期判断，而不是服务器所在时区
      const today = new Date();
      // ✅ 使用 UTC 日期字符串，忽略时区差异（只比较日期部分）
      const todayStr =
        today.getUTCFullYear() +
        '-' +
        String(today.getUTCMonth() + 1).padStart(2, '0') +
        '-' +
        String(today.getUTCDate()).padStart(2, '0'); // "2026-03-26"

      const pickupDateStr =
        plannedPickupDate.getUTCFullYear() +
        '-' +
        String(plannedPickupDate.getUTCMonth() + 1).padStart(2, '0') +
        '-' +
        String(plannedPickupDate.getUTCDate()).padStart(2, '0'); // "2026-03-26"

      if (pickupDateStr <= todayStr) {
        // 提柜日是过去日期或今天，调整为明天（UTC 日期）
        const tomorrow = new Date(todayStr + 'T00:00:00Z'); // 强制使用 UTC 时间
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        plannedPickupDate = tomorrow;
        plannedCustomsDate.setTime(plannedPickupDate.getTime());
        // ✅ 修复：使用 UTC 方法计算清关日期，避免时区问题
        plannedCustomsDate.setUTCDate(plannedCustomsDate.getUTCDate() - 1); // 保持 提=清关 +1

        const tomorrowStr =
          tomorrow.getUTCFullYear() +
          '-' +
          String(tomorrow.getUTCMonth() + 1).padStart(2, '0') +
          '-' +
          String(tomorrow.getUTCDate()).padStart(2, '0');
        logger.debug(
          `[IntelligentScheduling] Pickup date adjusted from ${pickupDateStr} to tomorrow (${tomorrowStr}) for ${container.containerNumber}`
        );
      }

      // 4. 确定候选仓库（根据该国分公司 → 国家代码，见 12-国家概念统一约定.md）
      const countryCode = await this.resolveCountryCode(container.replenishmentOrders?.[0] as any);
      const warehouses = await this.getCandidateWarehouses(countryCode, destPo.portCode);
      if (warehouses.length === 0) {
        return {
          containerNumber: container.containerNumber,
          success: false,
          message:
            '无映射关系中的仓库（请配置 dict_trucking_port_mapping、dict_warehouse_trucking_mapping）',
          ...containerInfo
        };
      }

      // 5. 找最早可用的仓库和卸柜日（从提柜日起查，按仓库日产能）
      const { warehouse, plannedUnloadDate } = await this.findEarliestAvailableWarehouse(
        warehouses,
        plannedPickupDate
      );

      if (!warehouse || !plannedUnloadDate) {
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: '仓库产能不足，无法排产',
          ...containerInfo
        };
      }

      // 6. 先选择车队（以便根据 has_yard 决定卸柜方式）
      const truckingCompany = await this.selectTruckingCompany(
        warehouse.warehouseCode,
        destPo.portCode,
        plannedPickupDate,
        warehouse.country
      );

      if (!truckingCompany) {
        return {
          containerNumber: container.containerNumber,
          success: false,
          message:
            '无映射关系中的车队（请配置 dict_warehouse_trucking_mapping 中该仓库对应的车队）',
          ...containerInfo
        };
      }

      // 7. 根据车队是否有堆场决定卸柜方式（见 04-五节点调度 2.3.1）
      // has_yard = true → 支持 Drop off（提<送=卸）
      // has_yard = false → 必须 Live load（提=送=卸）
      const unloadMode = truckingCompany.hasYard ? 'Drop off' : 'Live load';

      // ✅ 验证 plannedUnloadDate 有效性
      if (!plannedUnloadDate || isNaN(plannedUnloadDate.getTime())) {
        logger.warn(`[IntelligentScheduling] Invalid unload date for ${container.containerNumber}`);
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: '计算卸柜日失败',
          ...containerInfo
        };
      }

      // 验证并调整：如果无堆场但提≠卸，需要调整为 Live load
      // ✅ 使用 UTC 纯日期字符串，避免时区转换
      const pickupDayStr =
        plannedPickupDate.getUTCFullYear() +
        '-' +
        String(plannedPickupDate.getUTCMonth() + 1).padStart(2, '0') +
        '-' +
        String(plannedPickupDate.getUTCDate()).padStart(2, '0');
      let unloadDate = plannedUnloadDate;
      const unloadDayStr =
        unloadDate.getUTCFullYear() +
        '-' +
        String(unloadDate.getUTCMonth() + 1).padStart(2, '0') +
        '-' +
        String(unloadDate.getUTCDate()).padStart(2, '0');

      if (!truckingCompany.hasYard && pickupDayStr !== unloadDayStr) {
        // 无堆场只能 Live load，需要找卸柜日 = 提柜日
        const availableDate = await this.findEarliestAvailableDay(
          warehouse.warehouseCode,
          plannedPickupDate
        );
        if (availableDate) {
          unloadDate = availableDate;
        } else {
          // 如果提柜日当天仓库已满，尝试往后找最近可用日
          const futureDate = await this.findEarliestAvailableDay(
            warehouse.warehouseCode,
            new Date(plannedPickupDate)
          );
          if (futureDate) {
            unloadDate = futureDate;
            // 同时调整提柜日以匹配卸柜日（保持 Live load）
            // ✅ 修复：使用 UTC 方法复制日期
            plannedPickupDate = new Date(
              futureDate.getUTCFullYear(),
              futureDate.getUTCMonth(),
              futureDate.getUTCDate(),
              0,
              0,
              0,
              0
            );
          }
        }
      }

      let plannedDeliveryDate = this.calculatePlannedDeliveryDate(
        plannedPickupDate,
        unloadMode,
        unloadDate
      );

      // ✅ 验证 plannedDeliveryDate 有效性
      if (!plannedDeliveryDate || isNaN(plannedDeliveryDate.getTime())) {
        logger.warn(
          `[IntelligentScheduling] Invalid delivery date for ${container.containerNumber}`
        );
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: '计算送仓日失败',
          ...containerInfo
        };
      }

      // 8. 计算计划还箱日（从 EmptyReturn 表获取最晚还箱日）
      let lastReturnDate: Date | undefined;
      const emptyReturn = await this.emptyReturnRepo.findOne({
        where: { containerNumber: container.containerNumber }
      });
      if (emptyReturn?.lastReturnDate) {
        lastReturnDate = new Date(emptyReturn.lastReturnDate);
      } else if (destPo.lastFreeDate) {
        //  fallback: 从 lastFreeDate + 免费用箱天数计算（默认 7 天）
        lastReturnDate = new Date(destPo.lastFreeDate);
        lastReturnDate.setDate(lastReturnDate.getDate() + 7);
      }

      // ✅ 新的还箱日计算逻辑：考虑车队还箱能力
      const returnDateResult = await this.calculatePlannedReturnDate(
        unloadDate,
        unloadMode,
        truckingCompany.companyCode,
        lastReturnDate,
        plannedPickupDate
      );

      const plannedReturnDate = returnDateResult.returnDate;

      // 如果卸柜日需要调整（Live load 模式下还箱能力不足）
      if (returnDateResult.adjustedUnloadDate) {
        unloadDate = returnDateResult.adjustedUnloadDate;
        // 同时调整送仓日（送 = 卸）
        plannedDeliveryDate = new Date(unloadDate);
        logger.info(
          `[IntelligentScheduling] Adjusted unload date from ${unloadDate.toISOString()} to ${returnDateResult.adjustedUnloadDate.toISOString()} for ${container.containerNumber} due to return capacity`
        );
      }

      // ✅ 验证 plannedReturnDate 有效性
      if (!plannedReturnDate || isNaN(plannedReturnDate.getTime())) {
        logger.warn(`[IntelligentScheduling] Invalid return date for ${container.containerNumber}`);
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: '计算还箱日失败',
          ...containerInfo
        };
      }

      // 9. 选择清关公司（根据国家匹配，无匹配时使用"未指定"）
      const customsBrokerCode = await this.selectCustomsBroker(countryCode, destPo.portCode);

      // 10. 计算预估费用（dryRun 模式）
      const estimatedCosts = _request.dryRun
        ? await this.calculateEstimatedCosts(
            container.containerNumber,
            plannedPickupDate,
            unloadDate,
            plannedReturnDate,
            unloadMode,
            warehouse,
            truckingCompany
          )
        : undefined;

      // ✅ 11. 最终验证：所有日期字段必须有效
      const allDates = {
        plannedCustomsDate,
        plannedPickupDate,
        plannedDeliveryDate,
        unloadDate,
        plannedReturnDate
      };

      for (const [dateName, dateValue] of Object.entries(allDates)) {
        if (!dateValue || isNaN(dateValue.getTime())) {
          logger.error(
            `[IntelligentScheduling] Critical: ${dateName} is invalid for ${container.containerNumber}`
          );
          return {
            containerNumber: container.containerNumber,
            success: false,
            message: `排产失败：${dateName} 计算错误`,
            ...containerInfo
          };
        }
      }

      // 12. 更新数据库（dryRun 模式下跳过）
      const plannedData = {
        plannedCustomsDate: plannedCustomsDate.toISOString().split('T')[0],
        plannedPickupDate: plannedPickupDate.toISOString().split('T')[0],
        plannedDeliveryDate: plannedDeliveryDate.toISOString().split('T')[0],
        plannedUnloadDate: unloadDate.toISOString().split('T')[0],
        plannedReturnDate: plannedReturnDate.toISOString().split('T')[0],
        truckingCompanyId: truckingCompany.companyCode,
        truckingCompany: truckingCompany.companyName || truckingCompany.companyCode,
        warehouseId: warehouse.warehouseCode,
        warehouseName: warehouse.warehouseName || warehouse.warehouseCode,
        warehouseCountry: warehouse.country || countryCode, // ✅ 添加仓库国家信息，用于前端货币格式化
        unloadModePlan: unloadMode,
        customsBrokerCode,
        // 还箱码头信息（使用仓库作为还箱地点）
        returnTerminalCode: warehouse.warehouseCode,
        returnTerminalName: warehouse.warehouseName || warehouse.warehouseCode
      };

      if (!_request.dryRun) {
        await this.updateContainerSchedule(container.containerNumber, plannedData);

        // 与 biz_containers.gantt_derived / logistics_status 对齐（流程表已更新）
        try {
          await this.containerStatusService.updateStatus(container.containerNumber);
        } catch (syncErr) {
          logger.warn(
            `[IntelligentScheduling] updateStatus after schedule failed for ${container.containerNumber}:`,
            syncErr
          );
        }

        // 扣减仓库日产能
        await this.decrementWarehouseOccupancy(warehouse.warehouseCode, unloadDate);

        // 扣减拖车档期（送柜）
        await this.decrementTruckingOccupancy(
          truckingCompany.companyCode,
          plannedPickupDate,
          destPo.portCode,
          warehouse.warehouseCode
        );

        // 扣减还箱档期（Drop off 模式需要）
        if (unloadMode === 'Drop off') {
          await this.decrementFleetReturnOccupancy(
            truckingCompany.companyCode,
            plannedReturnDate,
            warehouse.warehouseCode,
            destPo.portCode
          );
        }
      }

      return {
        containerNumber: container.containerNumber,
        success: true,
        message: '排产成功',
        plannedData,
        estimatedCosts, // dryRun 模式下的预估费用
        ...containerInfo,
        warehouseName: warehouse.warehouseName || warehouse.warehouseCode
      };
    } catch (error: any) {
      logger.error(
        `[IntelligentScheduling] Error scheduling container ${container.containerNumber}:`,
        error
      );
      // 获取目的港操作记录用于错误返回
      const destPo = container.portOperations?.find((po: any) => po.portType === 'destination');
      const errorContainerInfo = {
        destinationPort: destPo?.portCode || '',
        destinationPortName: destPo?.portName || '',
        etaDestPort: destPo?.eta ? new Date(destPo.eta).toISOString().split('T')[0] : '',
        ataDestPort: destPo?.ata ? new Date(destPo.ata).toISOString().split('T')[0] : ''
      };
      return {
        containerNumber: container.containerNumber,
        success: false,
        message: error.message || '排产失败',
        ...errorContainerInfo
      };
    }
  }

  /**
   * 计算计划提柜日
   * = 计划清关日 + 1天，且 ≤ last_free_date
   * （下限「至少今天」在 scheduleSingleContainer 中统一处理）
   */
  private async calculatePlannedPickupDate(customsDate: Date, lastFreeDate?: Date): Promise<Date> {
    // ✅ 验证输入日期
    if (!customsDate || isNaN(customsDate.getTime())) {
      logger.warn(
        '[IntelligentScheduling] Invalid customsDate passed to calculatePlannedPickupDate'
      );
      return new Date(); // 返回今天作为默认值
    }

    const pickupDate = new Date(customsDate);
    pickupDate.setDate(pickupDate.getDate() + 1); // 清关后次日提柜

    if (lastFreeDate) {
      const lastFree = new Date(lastFreeDate);
      lastFree.setHours(0, 0, 0, 0);
      if (pickupDate > lastFree) {
        pickupDate.setTime(lastFree.getTime());
      }
    }

    // 跳过周末（如果配置了 skip_weekends = true）
    await this.skipWeekendsIfNeeded(pickupDate);

    return pickupDate;
  }

  /**
   * 检查配置并跳过周末（如果 skip_weekends = true）
   * @param date 要检查的日期（会被直接修改）
   */
  private async skipWeekendsIfNeeded(date: Date): Promise<void> {
    try {
      const config = await this.schedulingConfigRepo.findOne({
        where: { configKey: 'skip_weekends' }
      });

      const shouldSkipWeekends = config?.configValue === 'true';
      if (!shouldSkipWeekends) {
        return;
      }

      // 跳过周六（6）和周日（0）
      while (date.getDay() === 0 || date.getDay() === 6) {
        date.setDate(date.getDate() + 1);
      }
    } catch (error) {
      logger.warn('[IntelligentScheduling] Error checking weekend config:', error);
      // 配置读取失败时不跳过，避免阻塞排产
    }
  }

  /**
   * 检查日期是否为周末（周六或周日）
   */
  private isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  /**
   * 将备货单的销往信息解析为国家代码（dict_countries.code）
   * 约定：country 字段存国家代码；sell_to_country 存子公司名称，需通过 customer 取 country
   * @see frontend/public/docs/11-project/12-国家概念统一约定.md
   */
  private async resolveCountryCode(
    order:
      | { customer?: { country?: string }; customerCode?: string; sellToCountry?: string }
      | undefined
  ): Promise<string | undefined> {
    if (!order) return undefined;
    // 优先：通过 customer 关联取 country（国家代码）
    if (order.customer?.country) return order.customer.country;
    const v = (order.sellToCountry || '').trim();
    if (!v) return undefined;
    // 已是国家代码格式（2-3 位大写，如 US/CA/GB/UK），规范化别名 UK->GB
    if (/^[A-Z]{2,3}$/.test(v)) return normalizeCountryCode(v);
    // 回退：sell_to_country 为子公司名称，通过 customer_name 查 country
    const cust = await this.customerRepo.findOne({
      where: { customerName: v },
      select: ['country']
    });
    return cust?.country ?? undefined;
  }

  /**
   * 仓库属性类型优先级（自营仓优先于平台仓，避免误选 FBW 等平台仓）
   * 自营仓(CA-S003/Oshawa) > 平台仓(CA-P003/FBW_CA) > 第三方仓
   */
  private static readonly PROPERTY_TYPE_PRIORITY: Record<string, number> = {
    自营仓: 1,
    平台仓: 2,
    第三方仓: 3
  };

  /**
   * 获取候选仓库列表（严格匹配映射关系）
   * 仅返回 dict_trucking_port_mapping + dict_warehouse_trucking_mapping 推导出的仓库
   * 无 portCode 或映射链无结果时返回 []，不再回退到该国全部仓库
   * 排序：is_default 优先 > 自营仓 > 平台仓 > 第三方仓 > warehouse_code 字典序
   */
  private async getCandidateWarehouses(
    countryCode?: string,
    portCode?: string
  ): Promise<Warehouse[]> {
    if (!portCode || !countryCode) {
      return [];
    }

    // 1. 港口→车队（dict_trucking_port_mapping）
    const portMappings = await this.truckingPortMappingRepo.find({
      where: { portCode, country: countryCode, isActive: true }
    });
    if (portMappings.length === 0) return [];

    const truckingCompanyIds = portMappings.map((m) => m.truckingCompanyId);

    // 2. 车队→仓库（dict_warehouse_trucking_mapping），仅映射中有的仓库
    const warehouseMappings = await this.warehouseTruckingMappingRepo.find({
      where: {
        truckingCompanyId: In(truckingCompanyIds),
        country: countryCode,
        isActive: true
      }
    });
    if (warehouseMappings.length === 0) return [];

    const warehouseCodes = [...new Set(warehouseMappings.map((m) => m.warehouseCode))];
    const repo = AppDataSource.getRepository(Warehouse);
    const warehouses = await repo.find({
      where: {
        warehouseCode: In(warehouseCodes),
        country: countryCode,
        status: 'ACTIVE'
      }
    });
    return this.sortWarehousesByPriority(warehouses, warehouseMappings);
  }

  /**
   * 按优先级排序候选仓库：is_default > 自营仓 > 平台仓 > 第三方仓 > warehouse_code
   */
  private sortWarehousesByPriority(
    warehouses: Warehouse[],
    warehouseMappings: WarehouseTruckingMapping[]
  ): Warehouse[] {
    const defaultWarehouseCodes = new Set(
      warehouseMappings.filter((m) => m.isDefault).map((m) => m.warehouseCode)
    );
    const getPriority = (p: string) =>
      IntelligentSchedulingService.PROPERTY_TYPE_PRIORITY[p] ?? 999;

    return [...warehouses].sort((a, b) => {
      const aDefault = defaultWarehouseCodes.has(a.warehouseCode) ? 0 : 1;
      const bDefault = defaultWarehouseCodes.has(b.warehouseCode) ? 0 : 1;
      if (aDefault !== bDefault) return aDefault - bDefault;
      const pa = getPriority(a.propertyType);
      const pb = getPriority(b.propertyType);
      if (pa !== pb) return pa - pb;
      return (a.warehouseCode || '').localeCompare(b.warehouseCode || '');
    });
  }

  /**
   * 找到最早可用的仓库和卸柜日
   */
  private async findEarliestAvailableWarehouse(
    warehouses: Warehouse[],
    earliestDate: Date
  ): Promise<{ warehouse: Warehouse | null; plannedUnloadDate: Date | null }> {
    for (const warehouse of warehouses) {
      // 查找该仓库从 earliestDate 起的可用日
      const availableDate = await this.findEarliestAvailableDay(
        warehouse.warehouseCode,
        earliestDate
      );
      if (availableDate) {
        return { warehouse, plannedUnloadDate: availableDate };
      }
    }
    return { warehouse: null, plannedUnloadDate: null };
  }

  /**
   * 找到某仓库 earliestDate 起首个有产能的日期
   */
  private async findEarliestAvailableDay(
    warehouseCode: string,
    earliestDate: Date
  ): Promise<Date | null> {
    // 向前查找最多 30 天
    for (let i = 0; i < 30; i++) {
      const date = new Date(earliestDate);
      // ✅ 修复：使用 UTC 方法，避免时区问题
      date.setUTCDate(date.getUTCDate() + i);
      date.setUTCHours(0, 0, 0, 0); // 去除时间部分，只保留日期

      // ✅ 使用日期字符串查询，避免时区转换问题
      // 将日期格式化为 'YYYY-MM-DD' 字符串
      const dateStr =
        date.getUTCFullYear() +
        '-' +
        String(date.getUTCMonth() + 1).padStart(2, '0') +
        '-' +
        String(date.getUTCDate()).padStart(2, '0');

      // 查找或创建当日占用记录
      const occupancy = await this.warehouseOccupancyRepo.findOne({
        where: {
          warehouseCode,
          date: dateStr as any // TypeORM 会将字符串转换为 DATE
        }
      });

      if (!occupancy) {
        // 使用仓库默认产能
        const warehouse = await AppDataSource.getRepository(Warehouse).findOne({
          where: { warehouseCode }
        });
        const _capacity = warehouse?.dailyUnloadCapacity || 10; // 默认 10
        return date;
      }

      if (occupancy.plannedCount < occupancy.capacity) {
        return date;
      }
    }
    return null;
  }

  /**
   * 计算计划送仓日（必须 提<=送<=卸）
   * Live load（直接送）：提=送=卸（同日）；Drop off（先放堆场）：提<送=卸
   */
  private calculatePlannedDeliveryDate(
    pickupDate: Date,
    unloadMode: string,
    unloadDate: Date
  ): Date {
    if (unloadMode === 'Live load') {
      return new Date(pickupDate); // 提 = 送（同日）
    }
    // Drop off：送 = 卸（送仓日即卸柜日）
    return new Date(unloadDate);
  }

  /**
   * 计算计划还箱日（必须 提<=送<=卸<=还）
   *
   * 业务规则：
   * ① Drop off 模式：还 = 卸 + 1，但受车队还箱能力约束，若能力不足则顺延，最晚不超过 lastReturnDate
   * ② Live load 模式：还 = 卸（同日），若能力不足需调整卸柜日或选择其他车队
   *
   * @param unloadDate 卸柜日
   * @param unloadMode 卸柜方式（Drop off / Live load）
   * @param truckingCompanyId 车队 ID（用于查询还箱能力）
   * @param lastReturnDate 最晚还箱日（最终红线）
   * @param plannedPickupDate 计划提柜日（用于 Live load 模式下调整卸柜日）
   * @returns { returnDate: 还箱日，adjustedUnloadDate: 调整后的卸柜日（Live load 模式下可能需要调整）}
   */
  private async calculatePlannedReturnDate(
    unloadDate: Date,
    unloadMode: string,
    truckingCompanyId: string,
    lastReturnDate?: Date,
    plannedPickupDate?: Date
  ): Promise<{
    returnDate: Date;
    adjustedUnloadDate?: Date;
  }> {
    const returnDateOnly = new Date(unloadDate);
    returnDateOnly.setUTCHours(0, 0, 0, 0);

    let adjustedUnloadDate: Date | undefined;

    if (unloadMode === 'Live load') {
      // Live load 模式：还 = 卸（同日）
      // 需要检查车队当日的还箱能力
      const availableDate = await this.findEarliestAvailableReturnDate(
        truckingCompanyId,
        returnDateOnly,
        lastReturnDate
      );

      if (!availableDate) {
        // 车队还箱能力不足，且无法在 lastReturnDate 前找到可用日期
        // 返回卸柜日当天（由上层逻辑决定是否更换车队）
        return {
          returnDate: returnDateOnly,
          adjustedUnloadDate: undefined
        };
      }

      // 如果找到的日期不是卸柜日当天，需要调整卸柜日
      if (availableDate.getTime() !== returnDateOnly.getTime()) {
        adjustedUnloadDate = availableDate;
      }

      return {
        returnDate: availableDate,
        adjustedUnloadDate
      };
    } else {
      // ✅ Drop off 模式：优先当天还箱，其次卸 +1，再往后顺延

      // Step 1: 先检查卸柜日当天的还箱能力
      const availableOnUnloadDate = await this.findEarliestAvailableReturnDate(
        truckingCompanyId,
        returnDateOnly,
        lastReturnDate
      );

      if (availableOnUnloadDate) {
        // 如果卸柜日当天有能力，当天还箱（最优解，减少堆场费用）
        return {
          returnDate: availableOnUnloadDate,
          adjustedUnloadDate: undefined
        };
      }

      // Step 2: 如果卸柜日当天没能力，再检查卸柜日 +1
      const nextDay = new Date(returnDateOnly);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);

      const availableOnNextDay = await this.findEarliestAvailableReturnDate(
        truckingCompanyId,
        nextDay,
        lastReturnDate
      );

      if (availableOnNextDay) {
        // 卸柜日 +1 有能力，次日还箱（标准 Drop off 模式）
        return {
          returnDate: availableOnNextDay,
          adjustedUnloadDate: undefined
        };
      }

      // Step 3: 如果都没能力，继续顺延查找
      const availableDate = await this.findEarliestAvailableReturnDate(
        truckingCompanyId,
        nextDay,
        lastReturnDate
      );

      if (!availableDate) {
        // 找不到可用日期，返回 nextDay（可能会超过 lastReturnDate，由后续逻辑处理）
        return {
          returnDate: nextDay,
          adjustedUnloadDate: undefined
        };
      }

      return {
        returnDate: availableDate,
        adjustedUnloadDate: undefined
      };
    }
  }

  /**
   * 查找车队从 earliestDate 起首个有还箱能力的日期
   * @param truckingCompanyId 车队 ID
   * @param earliestDate 起始日期
   * @param lastReturnDate 最晚还箱日（可选，若指定则不能超过此日期）
   * @returns 最早可用的还箱日，若找不到则返回 null
   */
  private async findEarliestAvailableReturnDate(
    truckingCompanyId: string,
    earliestDate: Date,
    lastReturnDate?: Date
  ): Promise<Date | null> {
    // 向前查找最多 14 天（或到 lastReturnDate）
    const maxDaysToSearch = lastReturnDate
      ? Math.min(
          14,
          Math.ceil((lastReturnDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24))
        )
      : 14;

    for (let i = 0; i <= maxDaysToSearch; i++) {
      const date = new Date(earliestDate);
      date.setUTCDate(date.getUTCDate() + i);
      date.setUTCHours(0, 0, 0, 0);

      // 如果超过最晚还箱日，停止查找
      if (lastReturnDate) {
        const lastReturn = new Date(lastReturnDate);
        lastReturn.setUTCHours(0, 0, 0, 0);
        if (date > lastReturn) {
          return null;
        }
      }

      // 查询车队当日的还箱档期占用
      const occupancy = await AppDataSource.getRepository(ExtTruckingReturnSlotOccupancy).findOne({
        where: {
          truckingCompanyId,
          slotDate: date
        }
      });

      if (!occupancy) {
        // 无占用记录，使用车队默认还箱能力
        const trucking = await AppDataSource.getRepository(TruckingCompany).findOne({
          where: { companyCode: truckingCompanyId },
          select: ['dailyReturnCapacity', 'dailyCapacity']
        });
        const capacity = trucking?.dailyReturnCapacity ?? trucking?.dailyCapacity ?? 20;
        if (capacity > 0) {
          return date;
        }
      } else if (occupancy.plannedCount < occupancy.capacity) {
        // 有剩余能力
        return date;
      }
    }

    // 找不到可用日期
    return null;
  }

  /**
   * 选择车队（严格匹配映射关系）
   * 仅从 dict_warehouse_trucking_mapping 中选择，且车队须在 dict_trucking_port_mapping 中服务该港口
   * 不再回退到仅港口映射的车队，确保 (仓库, 车队) 在 warehouse_trucking_mapping 中存在
   */
  private async selectTruckingCompany(
    warehouseCode: string,
    portCode?: string,
    plannedPickupDate?: Date,
    countryCode?: string
  ): Promise<TruckingCompany | null> {
    const checkDate = plannedPickupDate || new Date();
    const dateOnly = new Date(checkDate);
    dateOnly.setHours(0, 0, 0, 0);

    const tryTrucking = async (truckingCompanyId: string): Promise<TruckingCompany | null> => {
      const occupancy = await this.truckingOccupancyRepo.findOne({
        where: {
          truckingCompanyId,
          date: dateOnly,
          portCode: portCode ?? undefined,
          warehouseCode
        }
      });
      if (!occupancy || occupancy.plannedTrips < occupancy.capacity) {
        return AppDataSource.getRepository(TruckingCompany).findOne({
          where: { companyCode: truckingCompanyId }
        });
      }
      return null;
    };

    // 仅从 warehouse_trucking_mapping 选择（仓库↔车队映射）
    const mappingWhere: any = { warehouseCode, isActive: true };
    if (countryCode) mappingWhere.country = countryCode;
    const mappings = await this.warehouseTruckingMappingRepo.find({
      where: mappingWhere,
      take: 20
    });

    // 若指定港口，仅选同时服务该港口的车队（trucking_port_mapping）
    let candidateIds = mappings.map((m) => m.truckingCompanyId);
    if (portCode && countryCode) {
      const portMappings = await this.truckingPortMappingRepo.find({
        where: { portCode, country: countryCode, isActive: true }
      });
      const portTruckingIds = new Set(portMappings.map((pm) => pm.truckingCompanyId));
      candidateIds = candidateIds.filter((id) => portTruckingIds.has(id));
    }

    for (const truckingCompanyId of candidateIds) {
      const t = await tryTrucking(truckingCompanyId);
      if (t) return t;
    }
    return null;
  }

  /**
   * 根据国家、港口匹配清关公司
   * 匹配规则：
   * 1. 优先匹配 国家 + 港口 都匹配的清关公司
   * 2. 如果没有精确匹配，只匹配国家
   * 3. 如果都没有匹配，返回 "UNSPECIFIED"（未指定）
   */
  private async selectCustomsBroker(countryCode?: string, _portCode?: string): Promise<string> {
    try {
      // 优先尝试精确匹配（国家 + 港口）
      // 注意：目前 dict_customs_brokers 表没有 port_code 字段，
      // 后续可能需要创建 dict_customs_port_mapping 表来实现更精细的匹配
      // 暂时只基于国家匹配

      if (!countryCode) {
        return UNSPECIFIED_CUSTOMS_BROKER;
      }

      // 根据国家匹配清关公司
      const brokers = await this.customsBrokerRepo.find({
        where: {
          country: countryCode
        },
        order: { brokerCode: 'ASC' },
        take: 1
      });

      if (brokers.length > 0) {
        return brokers[0].brokerCode;
      }

      // 如果没有匹配到，返回"未指定"
      logger.info(
        `[IntelligentScheduling] No customs broker found for country: ${countryCode}, using UNSPECIFIED`
      );
      return UNSPECIFIED_CUSTOMS_BROKER;
    } catch (error) {
      logger.warn('[IntelligentScheduling] Error selecting customs broker:', error);
      return UNSPECIFIED_CUSTOMS_BROKER;
    }
  }

  /**
   * 更新货柜计划
   */
  private async updateContainerSchedule(containerNumber: string, plannedData: any): Promise<void> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      await queryRunner.startTransaction();

      // 更新或创建拖卡运输记录
      let truckingTransport = await this.truckingTransportRepo.findOne({
        where: { containerNumber }
      });
      if (truckingTransport) {
        await queryRunner.manager.update(
          TruckingTransport,
          { containerNumber },
          {
            plannedPickupDate: plannedData.plannedPickupDate,
            plannedDeliveryDate: plannedData.plannedDeliveryDate,
            truckingCompanyId: plannedData.truckingCompanyId,
            unloadModePlan: plannedData.unloadModePlan,
            scheduleStatus: 'issued'
          }
        );
      } else {
        // 创建新记录
        truckingTransport = this.truckingTransportRepo.create({
          containerNumber,
          plannedPickupDate: plannedData.plannedPickupDate,
          plannedDeliveryDate: plannedData.plannedDeliveryDate,
          truckingCompanyId: plannedData.truckingCompanyId,
          unloadModePlan: plannedData.unloadModePlan,
          scheduleStatus: 'issued'
        });
        await queryRunner.manager.save(TruckingTransport, truckingTransport);
      }

      // 更新或创建仓库操作记录
      let warehouseOperation = await this.warehouseOperationRepo.findOne({
        where: { containerNumber }
      });
      if (warehouseOperation) {
        await queryRunner.manager.update(
          WarehouseOperation,
          { containerNumber },
          {
            plannedUnloadDate: plannedData.plannedUnloadDate,
            warehouseId: plannedData.warehouseId
          }
        );
      } else {
        warehouseOperation = this.warehouseOperationRepo.create({
          containerNumber,
          plannedUnloadDate: plannedData.plannedUnloadDate,
          warehouseId: plannedData.warehouseId
        });
        await queryRunner.manager.save(WarehouseOperation, warehouseOperation);
      }

      // 更新港口操作记录
      const portOperation = await this.portOperationRepo.findOne({
        where: { containerNumber, portType: 'destination' }
      });
      if (portOperation) {
        await queryRunner.manager.update(
          PortOperation,
          { id: portOperation.id },
          {
            plannedCustomsDate: plannedData.plannedCustomsDate,
            customsBrokerCode: plannedData.customsBrokerCode
          }
        );
      }

      // 更新或创建还箱记录
      let emptyReturn = await this.emptyReturnRepo.findOne({
        where: { containerNumber }
      });
      if (emptyReturn) {
        await queryRunner.manager.update(
          EmptyReturn,
          { containerNumber },
          {
            plannedReturnDate: plannedData.plannedReturnDate,
            returnTerminalCode: plannedData.returnTerminalCode,
            returnTerminalName: plannedData.returnTerminalName
          }
        );
      } else {
        emptyReturn = this.emptyReturnRepo.create({
          containerNumber,
          plannedReturnDate: plannedData.plannedReturnDate,
          returnTerminalCode: plannedData.returnTerminalCode,
          returnTerminalName: plannedData.returnTerminalName
        });
        await queryRunner.manager.save(EmptyReturn, emptyReturn);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 扣减仓库日产能
   */
  private async decrementWarehouseOccupancy(warehouseCode: string, date: Date): Promise<void> {
    const occupancy = await this.warehouseOccupancyRepo.findOne({
      where: { warehouseCode, date }
    });

    if (occupancy) {
      occupancy.plannedCount += 1;
      await this.warehouseOccupancyRepo.save(occupancy);
    } else {
      // 创建新记录
      const warehouse = await AppDataSource.getRepository(Warehouse).findOne({
        where: { warehouseCode }
      });
      await this.warehouseOccupancyRepo.save({
        warehouseCode,
        date,
        plannedCount: 1,
        capacity: warehouse?.dailyUnloadCapacity || 10
      });
    }
  }

  /**
   * 扣减拖车档期
   */
  private async decrementTruckingOccupancy(
    truckingCompanyId: string,
    date: Date,
    portCode?: string,
    warehouseCode?: string
  ): Promise<void> {
    const occupancy = await this.truckingOccupancyRepo.findOne({
      where: { truckingCompanyId, date, portCode, warehouseCode }
    });

    if (occupancy) {
      occupancy.plannedTrips += 1;
      await this.truckingOccupancyRepo.save(occupancy);
    } else {
      const trucking = await AppDataSource.getRepository(TruckingCompany).findOne({
        where: { companyCode: truckingCompanyId },
        select: ['dailyCapacity']
      });
      const capacity = trucking?.dailyCapacity ?? 10;
      await this.truckingOccupancyRepo.save({
        truckingCompanyId,
        date,
        portCode,
        warehouseCode,
        plannedTrips: 1,
        capacity
      });
    }
  }

  /**
   * 扣减车队还箱档期（Drop off 模式使用）
   */
  private async decrementFleetReturnOccupancy(
    truckingCompanyId: string,
    returnDate: Date,
    _warehouseCode?: string,
    _portCode?: string
  ): Promise<void> {
    const repo = AppDataSource.getRepository(ExtTruckingReturnSlotOccupancy);
    const returnDateOnly = new Date(returnDate);
    returnDateOnly.setHours(0, 0, 0, 0);

    const occupancy = await repo.findOne({
      where: { truckingCompanyId, slotDate: returnDateOnly }
    });

    if (occupancy) {
      // 更新现有记录
      occupancy.plannedCount += 1;
      occupancy.remaining -= 1;
      await repo.save(occupancy);
    } else {
      // 创建新记录，从车队配置读取容量
      const trucking = await AppDataSource.getRepository(TruckingCompany).findOne({
        where: { companyCode: truckingCompanyId },
        select: ['dailyReturnCapacity', 'dailyCapacity']
      });
      // 优先使用 daily_return_capacity，若无则使用 daily_capacity
      const capacity = trucking?.dailyReturnCapacity ?? trucking?.dailyCapacity ?? 20;

      await repo.save({
        truckingCompanyId,
        slotDate: returnDateOnly,
        plannedCount: 1,
        capacity,
        remaining: capacity - 1
      });
    }

    logger.info(
      `[IntelligentScheduling] Decremented fleet return occupancy: ${truckingCompanyId} on ${returnDateOnly.toISOString()}`
    );
  }

  /**
   * 计算预估费用（dryRun 模式下使用）
   */
  private async calculateEstimatedCosts(
    containerNumber: string,
    plannedPickupDate: Date,
    plannedUnloadDate: Date,
    plannedReturnDate: Date,
    unloadMode: string,
    warehouse: Warehouse,
    truckingCompany: TruckingCompany
  ): Promise<{
    demurrageCost?: number;
    detentionCost?: number;
    storageCost?: number;
    ddCombinedCost?: number; // D&D 合并费用
    transportationCost?: number;
    yardStorageCost?: number; // 外部堆场堆存费（Drop off 模式专属）
    handlingCost?: number; // 操作费/加急费（Expedited 模式专属）
    totalCost?: number;
    currency?: string;
  }> {
    try {
      // 使用统一的 calculateTotalCost 方法计算所有 D&D 费用和运输费
      const totalCostResult = await this.demurrageService.calculateTotalCost(containerNumber, {
        mode: 'forecast',
        plannedDates: {
          plannedPickupDate,
          plannedUnloadDate,
          plannedReturnDate
        },
        includeTransport: true,
        warehouse,
        truckingCompany,
        unloadMode
      });

      // ✅ 调试日志：查看各项费用
      logger.info(`[IntelligentScheduling] Cost breakdown for ${containerNumber}:`, {
        demurrageCost: totalCostResult.demurrageCost,
        detentionCost: totalCostResult.detentionCost,
        storageCost: totalCostResult.storageCost,
        ddCombinedCost: totalCostResult.ddCombinedCost,
        transportationCost: totalCostResult.transportationCost,
        totalCost: totalCostResult.totalCost,
        currency: totalCostResult.currency
      });

      // 计算外部堆场堆存费（仅在 Drop off 模式、车队有堆场且实际使用时）
      let yardStorageCost = 0;
      if (unloadMode === 'Drop off' && truckingCompany.hasYard) {
        try {
          // ✅ 关键修复：判断是否实际使用了堆场：提柜日 < 送仓日
          // 送仓日计算：Drop off 模式下，送仓日 = 卸柜日
          const plannedDeliveryDate = plannedUnloadDate; // Drop off: 送 = 卸

          // 判断是否实际使用了堆场：提柜日 < 送仓日
          const pickupDayStr = plannedPickupDate.toISOString().split('T')[0];
          const deliveryDayStr = plannedDeliveryDate.toISOString().split('T')[0];

          if (pickupDayStr !== deliveryDayStr) {
            // ✅ 提 < 送，说明货柜在堆场存放了
            // ✅ 预计堆场存放天数（从提柜日到送仓日）
            const yardStorageDays = dateTimeUtils.daysBetween(
              plannedPickupDate,
              plannedDeliveryDate
            );

            // 获取货柜的目的港信息
            const container = await this.containerRepo.findOne({
              where: { containerNumber },
              relations: ['portOperations']
            });

            if (container) {
              const destPo = container.portOperations?.find(
                (po: any) => po.portType === 'destination'
              );
              const portCode = destPo?.portCode || 'USLAX';
              const countryCode = warehouse.country || 'US';

              // 从 TruckingPortMapping 获取堆场费率
              const truckingPortMapping = await this.truckingPortMappingRepo.findOne({
                where: {
                  country: countryCode,
                  portCode,
                  truckingCompanyId: truckingCompany.companyCode,
                  isActive: true
                }
              });

              if (truckingPortMapping) {
                // 计算外部堆场堆存费 = 每日费率 × 天数 + 操作费
                // ✅ 关键修复：TypeORM 的 decimal 类型返回字符串，需要显式转换为数字
                const standardRate = Number(truckingPortMapping.standardRate) || 0;
                const yardOperationFee = Number(truckingPortMapping.yardOperationFee) || 0;
                yardStorageCost = standardRate * yardStorageDays + yardOperationFee;
              }
            }
          } // ← 添加闭合括号
        } catch (error) {
          logger.error(`[IntelligentScheduling] Yard storage cost calculation failed:`, error);
          // 计算失败不影响整体，yardStorageCost 保持为 0
        }
      }

      // 加急费单独计算（仅在 Expedited 模式下收取）
      let handlingCost = 0;
      if (unloadMode === 'Expedited') {
        try {
          const config = await this.schedulingConfigRepo.findOne({
            where: { configKey: 'expedited_handling_fee' }
          });
          handlingCost = config?.configValue ? parseFloat(config.configValue) : 50;
        } catch (error) {
          logger.warn('[IntelligentScheduling] Get expedited handling fee failed:', error);
          handlingCost = 50; // 默认$50
        }
      }

      // ✅ 关键修复：完整返回所有费用项，包括 ddCombinedCost
      // ✅ 确保所有数值都是 number 类型，避免字符串拼接
      return {
        demurrageCost: Number(totalCostResult.demurrageCost) || 0,
        detentionCost: Number(totalCostResult.detentionCost) || 0,
        storageCost: Number(totalCostResult.storageCost) || 0,
        ddCombinedCost: Number(totalCostResult.ddCombinedCost) || 0, // ✅ 新增：D&D 合并费用
        transportationCost: Number(totalCostResult.transportationCost) || 0,
        yardStorageCost: Number(yardStorageCost) || 0, // 外部堆场堆存费（如有）
        handlingCost: Number(handlingCost) || 0, // 加急费（如有）
        totalCost:
          Number(totalCostResult.totalCost) + Number(yardStorageCost) + Number(handlingCost), // 总计包含两种堆存费和加急费
        currency: totalCostResult.currency
      };
    } catch (error) {
      logger.error(`[IntelligentScheduling] calculateEstimatedCosts error:`, error);
      return {
        totalCost: 0,
        currency: 'USD'
      };
    }
  }
}

export const intelligentSchedulingService = new IntelligentSchedulingService();
