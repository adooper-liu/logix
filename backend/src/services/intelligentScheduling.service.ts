/**
 * 智能排柜服务
 * Intelligent Scheduling Service
 * 
 * 实现规则引擎（阶段一）：先到先得 + 约束校验
 */

import { In } from 'typeorm';
import { AppDataSource } from '../database';
import { Container } from '../entities/Container';
import { PortOperation } from '../entities/PortOperation';
import { TruckingTransport } from '../entities/TruckingTransport';
import { WarehouseOperation } from '../entities/WarehouseOperation';
import { EmptyReturn } from '../entities/EmptyReturn';
import { ExtWarehouseDailyOccupancy } from '../entities/ExtWarehouseDailyOccupancy';
import { ExtTruckingSlotOccupancy } from '../entities/ExtTruckingSlotOccupancy';
import { Warehouse } from '../entities/Warehouse';
import { TruckingCompany } from '../entities/TruckingCompany';
import { WarehouseTruckingMapping } from '../entities/WarehouseTruckingMapping';
import { TruckingPortMapping } from '../entities/TruckingPortMapping';
import { Customer } from '../entities/Customer';
import { ExtDemurrageStandard } from '../entities/ExtDemurrageStandard';
import { ExtDemurrageRecord } from '../entities/ExtDemurrageRecord';
import { SeaFreight } from '../entities/SeaFreight';
import { ReplenishmentOrder } from '../entities/ReplenishmentOrder';
import { CustomsBroker } from '../entities/CustomsBroker';
import { normalizeCountryCode } from '../utils/countryCode.js';
import { logger } from '../utils/logger';
import { DemurrageService } from './demurrage.service';

/**
 * 未指定的清关公司编码
 */
const UNSPECIFIED_CUSTOMS_BROKER = 'UNSPECIFIED';

export interface ScheduleRequest {
  country?: string;           // 国家过滤
  startDate?: string;         // 开始日期
  endDate?: string;          // 结束日期
  forceSchedule?: boolean;   // 是否强制重排（忽略schedule_status）
  containerNumbers?: string[]; // 指定柜号列表，仅排这些柜（用于单柜模拟）
  limit?: number;            // 每批处理数量，用于分步排产
  skip?: number;             // 跳过数量，用于分步排产
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
    warehouseId?: string;
    customsBrokerCode?: string;
  };
}

export interface BatchScheduleResponse {
  success: boolean;
  total: number;
  successCount: number;
  failedCount: number;
  results: ScheduleResult[];
  hasMore?: boolean;         // 是否还有待排产货柜（分步排产时使用）
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
      const limit = request.limit != null && request.limit > 0 ? request.limit : sortedContainers.length;
      const toProcess = sortedContainers.slice(skip, skip + limit);
      const hasMore = skip + limit < sortedContainers.length;

      // 3. 仅对本批货柜做滞港费写回（避免全量写回导致首批迟迟不返回）
      const CONCURRENCY = 5;
      const lastFreeByCn: Record<string, Date> = {};
      try {
        const numbers = toProcess.map(c => c.containerNumber);
        for (let i = 0; i < numbers.length; i += CONCURRENCY) {
          const batch = numbers.slice(i, i + CONCURRENCY);
          const settled = await Promise.allSettled(
            batch.map(cn => this.demurrageService.calculateForContainer(cn))
          );
          for (let j = 0; j < batch.length; j++) {
            const s = settled[j];
            const computed = s.status === 'fulfilled' ? s.value?.result?.calculationDates?.lastPickupDateComputed : null;
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

      // 4. 对每个货柜进行排产
      for (const container of toProcess) {
        const result = await this.scheduleSingleContainer(container, request);
        results.push(result);
      }

      const successCount = results.filter(r => r.success).length;
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
        successCount: results.filter(r => r.success).length,
        failedCount: results.length - results.filter(r => r.success).length,
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
    const query = this.containerRepo.createQueryBuilder('c')
      .leftJoinAndSelect('c.portOperations', 'po')
      .leftJoinAndSelect('c.seaFreight', 'sf')
      .leftJoinAndSelect('c.replenishmentOrders', 'o')
      .leftJoinAndSelect('o.customer', 'cust')
      .where('c.scheduleStatus IN (:...statuses)', { statuses: ['initial', 'issued'] });

    if (request.startDate) {
      query.andWhere('(po.ataDestPort >= :startDate OR po.etaDestPort >= :startDate)', 
        { startDate: request.startDate });
    }
    if (request.endDate) {
      query.andWhere('(po.ataDestPort <= :endDate OR po.etaDestPort <= :endDate)', 
        { endDate: request.endDate });
    }
    if (request.containerNumbers && request.containerNumbers.length > 0) {
      query.andWhere('c.containerNumber IN (:...containerNumbers)', 
        { containerNumbers: request.containerNumbers });
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

      const aDate = aDestPo?.ataDestPort || aDestPo?.etaDestPort || a.seaFreight?.eta;
      const bDate = bDestPo?.ataDestPort || bDestPo?.etaDestPort || b.seaFreight?.eta;

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
    request: ScheduleRequest
  ): Promise<ScheduleResult> {
    try {
      // 获取目的港操作记录
      const destPo = container.portOperations?.find((po: any) => po.portType === 'destination');
      
      // 提取货柜基本信息用于前端展示
      const containerInfo = {
        destinationPort: destPo?.portCode || '',
        destinationPortName: destPo?.portName || '',
        etaDestPort: destPo?.etaDestPort ? new Date(destPo.etaDestPort).toISOString().split('T')[0] : '',
        ataDestPort: destPo?.ataDestPort ? new Date(destPo.ataDestPort).toISOString().split('T')[0] : ''
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
      const clearanceDate = destPo.etaDestPort || destPo.ataDestPort;
      if (!clearanceDate) {
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: '无到港日期（ATA/ETA），无法排产',
          ...containerInfo
        };
      }

      // 2. 计算计划清关日、提柜日（若 ATA/ETA 已过，提柜日至少为今天）
      const plannedCustomsDate = new Date(clearanceDate);
      let plannedPickupDate = await this.calculatePlannedPickupDate(
        plannedCustomsDate,
        destPo.lastFreeDate
      );
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (plannedPickupDate < today) {
        plannedPickupDate = new Date(today);
        plannedCustomsDate.setTime(today.getTime());
        plannedCustomsDate.setDate(plannedCustomsDate.getDate() - 1); // 保持 提=清关+1
      }

      // 4. 确定候选仓库（根据该国分公司 → 国家代码，见 12-国家概念统一约定.md）
      const countryCode = await this.resolveCountryCode(container.replenishmentOrders?.[0] as any);
      const warehouses = await this.getCandidateWarehouses(countryCode, destPo.portCode);
      if (warehouses.length === 0) {
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: '无映射关系中的仓库（请配置 dict_trucking_port_mapping、dict_warehouse_trucking_mapping）',
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

      // 6. 根据仓库卸柜能力确定卸柜方式（见 04-五节点调度 2.3.1）
      // 提柜日当天有产能 → Live load（直接送，提=送=卸）；否则 → Drop off（先放车队堆场，提<送=卸）
      const pickupDay = plannedPickupDate.toISOString().split('T')[0];
      const unloadDay = plannedUnloadDate.toISOString().split('T')[0];
      const unloadMode = pickupDay === unloadDay ? 'Live load' : 'Drop off';
      const plannedDeliveryDate = this.calculatePlannedDeliveryDate(
        plannedPickupDate,
        unloadMode,
        plannedUnloadDate
      );

      // 7. 计算计划还箱日（从 EmptyReturn 表获取最晚还箱日）
      let lastReturnDate: Date | undefined;
      const emptyReturn = await this.emptyReturnRepo.findOne({
        where: { containerNumber: container.containerNumber }
      });
      if (emptyReturn?.lastReturnDate) {
        lastReturnDate = new Date(emptyReturn.lastReturnDate);
      } else if (destPo.lastFreeDate) {
        //  fallback: 从 lastFreeDate + 免费用箱天数计算（默认7天）
        lastReturnDate = new Date(destPo.lastFreeDate);
        lastReturnDate.setDate(lastReturnDate.getDate() + 7);
      }
      const plannedReturnDate = this.calculatePlannedReturnDate(
        plannedUnloadDate,
        unloadMode,
        lastReturnDate
      );

      // 8. 选择车队（按仓库×港口定价表，选最低价且有剩余能力的车队）
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
          message: '无映射关系中的车队（请配置 dict_warehouse_trucking_mapping 中该仓库对应的车队）',
          ...containerInfo
        };
      }

      // 9. 选择清关公司（根据国家匹配，无匹配时使用"未指定"）
      const customsBrokerCode = await this.selectCustomsBroker(
        countryCode,
        destPo.portCode
      );

      // 10. 更新数据库
      const plannedData = {
        plannedCustomsDate: plannedCustomsDate.toISOString().split('T')[0],
        plannedPickupDate: plannedPickupDate.toISOString().split('T')[0],
        plannedDeliveryDate: plannedDeliveryDate.toISOString().split('T')[0],
        plannedUnloadDate: plannedUnloadDate.toISOString().split('T')[0],
        plannedReturnDate: plannedReturnDate.toISOString().split('T')[0],
        truckingCompanyId: truckingCompany.companyCode,
        warehouseId: warehouse.warehouseCode,
        unloadModePlan: unloadMode,
        customsBrokerCode,
        // 还箱码头信息（使用仓库作为还箱地点）
        returnTerminalCode: warehouse.warehouseCode,
        returnTerminalName: warehouse.warehouseName || warehouse.warehouseCode
      };

      await this.updateContainerSchedule(container.containerNumber, plannedData);

      // 10. 扣减仓库日产能
      await this.decrementWarehouseOccupancy(warehouse.warehouseCode, plannedUnloadDate);

      // 11. 扣减拖车档期
      await this.decrementTruckingOccupancy(
        truckingCompany.companyCode,
        plannedPickupDate,
        destPo.portCode,
        warehouse.warehouseCode
      );

      return {
        containerNumber: container.containerNumber,
        success: true,
        message: '排产成功',
        plannedData,
        ...containerInfo,
        warehouseName: warehouse.warehouseName || warehouse.warehouseCode
      };
    } catch (error: any) {
      logger.error(`[IntelligentScheduling] Error scheduling container ${container.containerNumber}:`, error);
      // 获取目的港操作记录用于错误返回
      const destPo = container.portOperations?.find((po: any) => po.portType === 'destination');
      const errorContainerInfo = {
        destinationPort: destPo?.portCode || '',
        destinationPortName: destPo?.portName || '',
        etaDestPort: destPo?.etaDestPort ? new Date(destPo.etaDestPort).toISOString().split('T')[0] : '',
        ataDestPort: destPo?.ataDestPort ? new Date(destPo.ataDestPort).toISOString().split('T')[0] : ''
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
  private async calculatePlannedPickupDate(
    customsDate: Date,
    lastFreeDate?: Date
  ): Promise<Date> {
    const pickupDate = new Date(customsDate);
    pickupDate.setDate(pickupDate.getDate() + 1); // 清关后次日提柜

    if (lastFreeDate) {
      const lastFree = new Date(lastFreeDate);
      lastFree.setHours(0, 0, 0, 0);
      if (pickupDate > lastFree) {
        pickupDate.setTime(lastFree.getTime());
      }
    }

    return pickupDate;
  }

  /**
   * 将备货单的销往信息解析为国家代码（dict_countries.code）
   * 约定：country 字段存国家代码；sell_to_country 存子公司名称，需通过 customer 取 country
   * @see frontend/public/docs/11-project/12-国家概念统一约定.md
   */
  private async resolveCountryCode(order: { customer?: { country?: string }; customerCode?: string; sellToCountry?: string } | undefined): Promise<string | undefined> {
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
    '自营仓': 1,
    '平台仓': 2,
    '第三方仓': 3
  };

  /**
   * 获取候选仓库列表（严格匹配映射关系）
   * 仅返回 dict_trucking_port_mapping + dict_warehouse_trucking_mapping 推导出的仓库
   * 无 portCode 或映射链无结果时返回 []，不再回退到该国全部仓库
   * 排序：is_default 优先 > 自营仓 > 平台仓 > 第三方仓 > warehouse_code 字典序
   */
  private async getCandidateWarehouses(countryCode?: string, portCode?: string): Promise<Warehouse[]> {
    if (!portCode || !countryCode) {
      return [];
    }

    // 1. 港口→车队（dict_trucking_port_mapping）
    const portMappings = await this.truckingPortMappingRepo.find({
      where: { portCode, country: countryCode, isActive: true }
    });
    if (portMappings.length === 0) return [];

    const truckingCompanyIds = portMappings.map(m => m.truckingCompanyId);

    // 2. 车队→仓库（dict_warehouse_trucking_mapping），仅映射中有的仓库
    const warehouseMappings = await this.warehouseTruckingMappingRepo.find({
      where: {
        truckingCompanyId: In(truckingCompanyIds),
        country: countryCode,
        isActive: true
      }
    });
    if (warehouseMappings.length === 0) return [];

    const warehouseCodes = [...new Set(warehouseMappings.map(m => m.warehouseCode))];
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
      warehouseMappings.filter(m => m.isDefault).map(m => m.warehouseCode)
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
      date.setDate(date.getDate() + i);
      date.setHours(0, 0, 0, 0); // 去除时间部分，只保留日期

      // 查找或创建当日占用记录
      let occupancy = await this.warehouseOccupancyRepo.findOne({
        where: { warehouseCode, date }
      });

      if (!occupancy) {
        // 使用仓库默认产能
        const warehouse = await AppDataSource.getRepository(Warehouse).findOne({
          where: { warehouseCode }
        });
        const capacity = warehouse?.dailyUnloadCapacity || 10; // 默认10
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
   * Live load：还=卸（同日）；Drop off：还=卸+1
   * 若 lastReturnDate 早于卸柜日则忽略（数据异常），保证 还>=卸
   */
  private calculatePlannedReturnDate(
    unloadDate: Date,
    unloadMode: string,
    lastReturnDate?: Date
  ): Date {
    const returnDate = new Date(unloadDate);
    if (unloadMode === 'Drop off') {
      returnDate.setDate(returnDate.getDate() + 1); // Drop off 卸柜后次日还箱
    }
    const unloadOnly = new Date(unloadDate);
    unloadOnly.setHours(0, 0, 0, 0);
    // 不能超过最晚还箱日（且 lastReturnDate 必须 >= 卸柜日才生效）
    if (lastReturnDate) {
      const lastReturn = new Date(lastReturnDate);
      lastReturn.setHours(0, 0, 0, 0);
      if (lastReturn >= unloadOnly && returnDate > lastReturn) {
        returnDate.setTime(lastReturn.getTime());
      }
    }
    // 兜底：还箱日必须 >= 卸柜日
    if (returnDate < unloadOnly) {
      returnDate.setTime(unloadOnly.getTime());
      if (unloadMode === 'Drop off') {
        returnDate.setDate(returnDate.getDate() + 1);
      }
    }
    return returnDate;
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
    let candidateIds = mappings.map(m => m.truckingCompanyId);
    if (portCode && countryCode) {
      const portMappings = await this.truckingPortMappingRepo.find({
        where: { portCode, country: countryCode, isActive: true }
      });
      const portTruckingIds = new Set(portMappings.map(pm => pm.truckingCompanyId));
      candidateIds = candidateIds.filter(id => portTruckingIds.has(id));
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
  private async selectCustomsBroker(
    countryCode?: string,
    portCode?: string
  ): Promise<string> {
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
          country: countryCode,
          status: 'ACTIVE'
        },
        order: { brokerCode: 'ASC' },
        take: 1
      });

      if (brokers.length > 0) {
        return brokers[0].brokerCode;
      }

      // 如果没有匹配到，返回"未指定"
      logger.info(`[IntelligentScheduling] No customs broker found for country: ${countryCode}, using UNSPECIFIED`);
      return UNSPECIFIED_CUSTOMS_BROKER;
    } catch (error) {
      logger.warn('[IntelligentScheduling] Error selecting customs broker:', error);
      return UNSPECIFIED_CUSTOMS_BROKER;
    }
  }

  /**
   * 更新货柜计划
   */
  private async updateContainerSchedule(
    containerNumber: string,
    plannedData: any
  ): Promise<void> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      await queryRunner.startTransaction();

      // 更新或创建拖卡运输记录
      let truckingTransport = await this.truckingTransportRepo.findOne({
        where: { containerNumber }
      });
      if (truckingTransport) {
        await queryRunner.manager.update(TruckingTransport, 
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
        await queryRunner.manager.update(WarehouseOperation,
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
        await queryRunner.manager.update(PortOperation,
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
        await queryRunner.manager.update(EmptyReturn,
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
  private async decrementWarehouseOccupancy(
    warehouseCode: string,
    date: Date
  ): Promise<void> {
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
}

export const intelligentSchedulingService = new IntelligentSchedulingService();
