/**
 * 滞港费计算服务
 * Demurrage Calculation Service
 *
 * 从数据库匹配滞港费标准，计算单项费用并汇总
 */

import { Repository } from 'typeorm';
import { SchedulingCacheKeys, SchedulingCacheTTL } from '../constants/SchedulingCacheStrategy';
import { Container } from '../entities/Container';
import { Country } from '../entities/Country';
import { Customer } from '../entities/Customer';
import { DictSchedulingConfig } from '../entities/DictSchedulingConfig';
import { EmptyReturn } from '../entities/EmptyReturn';
import { ExtDemurrageRecord } from '../entities/ExtDemurrageRecord';
import { ExtDemurrageStandard } from '../entities/ExtDemurrageStandard';
import { FreightForwarder } from '../entities/FreightForwarder';
import { OverseasCompany } from '../entities/OverseasCompany';
import { Port } from '../entities/Port';
import { PortOperation } from '../entities/PortOperation';
import { ReplenishmentOrder } from '../entities/ReplenishmentOrder';
import { SeaFreight } from '../entities/SeaFreight';
import { ShippingCompany } from '../entities/ShippingCompany';
import { TruckingCompany } from '../entities/TruckingCompany';
import { TruckingTransport } from '../entities/TruckingTransport';
import { Warehouse } from '../entities/Warehouse';
import { WarehouseOperation } from '../entities/WarehouseOperation';
import { WarehouseTruckingMapping } from '../entities/WarehouseTruckingMapping';
import { logger } from '../utils/logger';
import {
  calculateLogisticsStatus,
  type LogisticsStatusResult,
  SimplifiedStatus
} from '../utils/logisticsStatusMachine';
import { CacheService } from './CacheService';
import { buildKeyTimeline, type KeyTimelineResult } from './keyTimeline';
import { LastPickupSubqueryTemplates } from './statistics/LastPickupSubqueryTemplates';
import { getDateRangeSubqueryRaw } from './statistics/common/DateRangeSubquery';

/** 阶梯费率项 */
export interface DemurrageTierDto {
  fromDay: number;
  toDay: number | null;
  ratePerDay: number;
}

/** 单项计算结果 */
export interface DemurrageItemResult {
  standardId: number;
  chargeName: string;
  chargeTypeCode: string;
  freeDays: number;
  freeDaysBasis?: string;
  calculationBasis?: string;
  calculationMode: 'actual' | 'forecast'; // 计算模式标注
  startDate: Date;
  endDate: Date;
  startDateSource: string | null;
  endDateSource: string | null;
  startDateMode: 'actual' | 'forecast'; // 起算日来源模式
  endDateMode: 'actual' | 'forecast'; // 截止日来源模式
  lastFreeDate: Date;
  lastFreeDateMode: 'actual' | 'forecast'; // 最晚免费日计算模式
  chargeDays: number;
  amount: number;
  currency: string;
  /** 目的港代码（用于前端显示国别货币符号） */
  destinationPortCode?: string;
  tierBreakdown: Array<{
    fromDay: number;
    toDay: number;
    days: number;
    ratePerDay: number;
    subtotal: number;
  }>;
}

/** 暂不计算项 */
export interface DemurrageSkippedItem {
  standardId: number;
  chargeName: string;
  chargeTypeCode: string;
  reasonCode:
    | 'missing_pickup_date_actual'
    | 'missing_planned_pickup_date'
    | 'missing_eta_combined_forecast'
    | 'missing_arrival_for_combined_actual'
    | 'missing_eta_storage_forecast'
    | 'missing_arrival_storage_actual';
  reason: string;
}

/** 完整计算响应 */
export interface DemurrageCalculationResult {
  containerNumber: string;
  calculationMode: 'actual' | 'forecast'; // 整体计算模式标注
  startDate: Date;
  endDate: Date;
  startDateSource: string | null;
  endDateSource: string | null;
  calculationDates?: {
    ataDestPort?: string | null;
    etaDestPort?: string | null;
    revisedEtaDestPort?: string | null; // 修正ETA
    dischargeDate?: string | null;
    lastPickupDate?: string | null;
    plannedPickupDate?: string | null;
    lastPickupDateComputed?: string | null;
    lastPickupDateMode?: 'actual' | 'forecast'; // 最晚提柜日计算模式
    lastReturnDate?: string | null;
    lastReturnDateComputed?: string | null;
    lastReturnDateMode?: 'actual' | 'forecast'; // 最晚还箱日计算模式
    pickupDateActual?: string | null;
    returnTime?: string | null;
    /** 计划还箱日（与 getContainerMatchParams 一致） */
    plannedReturnDate?: string | null;
    /** 出运日（关键日期） */
    shipmentDate?: string | null;
    today: string;
  };
  matchedStandards: Array<{
    id: number;
    chargeName: string;
    chargeTypeCode: string;
    foreignCompanyCode?: string;
    foreignCompanyName?: string;
    destinationPortCode?: string;
    destinationPortName?: string;
    shippingCompanyCode?: string;
    shippingCompanyName?: string;
    originForwarderCode?: string;
    originForwarderName?: string;
    freeDays: number;
    freeDaysBasis?: string;
    calculationBasis?: string;
    ratePerDay?: number;
    tiers?: DemurrageTierDto[];
    currency: string;
  }>;
  items: DemurrageItemResult[];
  skippedItems?: DemurrageSkippedItem[];
  totalAmount: number;
  currency: string;
  /** 与物流状态机顺序不一致时的提示（不阻断计算，供前端展示） */
  dateOrderWarnings?: string[];
  /** 滞港费 actual/forecast 第一步：状态机快照（calculateLogisticsStatus） */
  logisticsStatusSnapshot?: {
    status: string;
    reason: string;
    arrivedAtDestinationPort: boolean;
    currentPortType: 'origin' | 'transit' | 'destination' | null;
  };
  /** 关键日期时间线（历时/倒计时/超期）；Phase 1 占位 nodes 可为空，meta 已填充 */
  keyTimeline?: KeyTimelineResult;
  /** 本轮免费日写回是否真正落库（供批量统计与单条接口） */
  writeBack?: {
    lastFreeDateWritten: boolean;
    lastReturnDateWritten: boolean;
  };
}

/** 提取日期部分（使用 UTC 避免时区导致 ±1 天偏移） */
function toDateOnly(d: Date | string): Date {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** 取较晚一日（滞港费 forecast 截止日 = max(今天, 计划提柜日)） */
function maxDate(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b;
}

function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function daysBetween(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((end.getTime() - start.getTime()) / msPerDay) + 1;
}

/** 周六(6)、周日(0) 为非工作日 */
function isWeekend(d: Date): boolean {
  const dow = d.getUTCDay();
  return dow === 0 || dow === 6;
}

/** 从起算日起加 N 个工作日（周六、周日不计入） */
function addWorkingDays(start: Date, n: number): Date {
  if (n <= 0) return new Date(start.getTime());
  const result = new Date(start.getTime());
  let count = 0;
  while (count < n) {
    if (!isWeekend(result)) count++;
    if (count < n) result.setUTCDate(result.getUTCDate() + 1);
  }
  return result;
}

/** 两日期间的工作日数（含起止，周六、周日不计入） */
function workingDaysBetween(start: Date, end: Date): number {
  let count = 0;
  const cur = new Date(start.getTime());
  const endTime = end.getTime();
  while (cur.getTime() <= endTime) {
    if (!isWeekend(cur)) count++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

function matchCodeOrName(
  containerVal: string | null,
  stdCode: string | null,
  stdName: string | null
): boolean {
  if (!containerVal) return true;
  const cv = String(containerVal).trim().toLowerCase();
  const sc = stdCode ? String(stdCode).trim().toLowerCase() : '';
  const sn = stdName ? String(stdName).trim().toLowerCase() : '';
  if (!sc && !sn) return true;
  if (sc === cv) return true;
  if (sn === cv) return true;
  return false;
}

/**
 * 将 tiers 从多种存储格式归一化为 DemurrageTierDto[]
 * 支持：数组 [{ fromDay, toDay, ratePerDay }]、[{ minDays, maxDays, rate }]、对象 { "1": 50, "2-5": 60 }
 */
function normalizeTiers(raw: unknown): DemurrageTierDto[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const arr = raw as Array<Record<string, unknown>>;
    if (arr.length === 0) return null;
    return arr
      .map((t) => {
        const fromDay = Number(t.fromDay ?? t.minDays ?? 0);
        const toDay =
          t.toDay != null ? Number(t.toDay) : t.maxDays != null ? Number(t.maxDays) : null;
        const ratePerDay = Number(t.ratePerDay ?? t.rate ?? 0);
        if (fromDay < 1) return null;
        return { fromDay, toDay, ratePerDay };
      })
      .filter((t): t is DemurrageTierDto => t != null);
  }
  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, number>;
    const entries = Object.entries(obj)
      .filter(([k]) => /^\d+$|^\d+\+$/.test(String(k).trim()))
      .map(([k, v]) => {
        const isOpenEnded = String(k).includes('+');
        const num = parseInt(String(k).replace(/\D/g, ''), 10);
        return { day: num, rate: Number(v), isOpenEnded };
      })
      .sort((a, b) => a.day - b.day);
    if (entries.length === 0) return null;
    const tiers: DemurrageTierDto[] = [];
    let i = 0;
    while (i < entries.length) {
      const fromDay = entries[i].day;
      const rate = entries[i].rate;
      const isOpenEnded = entries[i].isOpenEnded;
      let toDay = fromDay;
      while (
        i + 1 < entries.length &&
        entries[i + 1].rate === rate &&
        !entries[i + 1].isOpenEnded &&
        entries[i + 1].day === toDay + 1
      ) {
        i++;
        toDay = entries[i].day;
      }
      tiers.push({ fromDay, toDay: isOpenEnded ? null : toDay, ratePerDay: rate });
      i++;
    }
    return tiers.length > 0 ? tiers : null;
  }
  return null;
}

/** 免费期是否按工作日（周六、周日不计入） */
function freePeriodUsesWorkingDays(basis: string | null | undefined): boolean {
  const b = (basis ?? '').toLowerCase();
  return (
    b.includes('工作+自然') || b.includes('natural+working') || b === '工作日' || b === 'working'
  );
}

/** 计费期是否按工作日 */
function chargePeriodUsesWorkingDays(basis: string | null | undefined): boolean {
  const b = (basis ?? '').toLowerCase();
  return (
    b.includes('自然+工作') || b.includes('working+natural') || b === '工作日' || b === 'working'
  );
}

/**
 * 计算单项滞港费（纯函数）
 * freeDaysBasis：自然日/工作日/工作+自然日/自然+工作日，仅工作日时排除周六、周日
 */
function calculateSingleDemurrage(
  startDate: Date,
  endDate: Date,
  freeDays: number,
  ratePerDay: number,
  tiers: DemurrageTierDto[] | null,
  currency: string,
  freeDaysBasis?: string | null
): {
  lastFreeDate: Date;
  chargeDays: number;
  totalAmount: number;
  tierBreakdown: Array<{
    fromDay: number;
    toDay: number;
    days: number;
    ratePerDay: number;
    subtotal: number;
  }>;
} {
  const n = Math.max(0, freeDays - 1);
  const lastFreeDate = freePeriodUsesWorkingDays(freeDaysBasis)
    ? addWorkingDays(startDate, n)
    : addDays(startDate, n);

  if (endDate <= lastFreeDate) {
    return {
      lastFreeDate,
      chargeDays: 0,
      totalAmount: 0,
      tierBreakdown: []
    };
  }

  const chargeStart = addDays(lastFreeDate, 1);
  const chargeDays = chargePeriodUsesWorkingDays(freeDaysBasis)
    ? workingDaysBetween(chargeStart, endDate)
    : daysBetween(chargeStart, endDate);

  if (chargeDays <= 0) {
    return { lastFreeDate, chargeDays: 0, totalAmount: 0, tierBreakdown: [] };
  }

  let totalAmount = 0;
  const tierBreakdown: Array<{
    fromDay: number;
    toDay: number;
    days: number;
    ratePerDay: number;
    subtotal: number;
  }> = [];

  if (tiers && tiers.length > 0) {
    const sorted = [...tiers].sort((a, b) => a.fromDay - b.fromDay);
    let remainingDays = chargeDays;
    // ✅ 关键修复：计费天数应该从免费期后的第一天开始计算
    // 例如：免费天数 7 天，计费从第 8 天开始
    let currentDay = freeDays + 1;

    // ✅ 调试日志：查看阶梯费率计算详情
    logger.info(`[Demurrage] Tier calculation:`, {
      freeDays,
      chargeDays,
      currentDay,
      tiers: sorted.map((t) => ({
        fromDay: t.fromDay,
        toDay: t.toDay,
        ratePerDay: t.ratePerDay
      }))
    });

    for (const tier of sorted) {
      if (remainingDays <= 0) break;
      const tierToDay = tier.toDay ?? 99999;
      const tierFromDay = Math.max(tier.fromDay, currentDay);
      const tierEndDay = Math.min(tierToDay, currentDay + remainingDays - 1);
      if (tierEndDay < tierFromDay) continue;

      const daysInTier = tierEndDay - tierFromDay + 1;
      const subtotal = daysInTier * tier.ratePerDay;
      tierBreakdown.push({
        fromDay: tierFromDay,
        toDay: tierEndDay,
        days: daysInTier,
        ratePerDay: tier.ratePerDay,
        subtotal
      });
      totalAmount += subtotal;
      remainingDays -= daysInTier;
      currentDay = tierEndDay + 1;
    }
  } else {
    totalAmount = chargeDays * ratePerDay;
    if (chargeDays > 0 && ratePerDay > 0) {
      tierBreakdown.push({
        fromDay: 1,
        toDay: chargeDays,
        days: chargeDays,
        ratePerDay,
        subtotal: totalAmount
      });
    }
  }

  return { lastFreeDate, chargeDays, totalAmount, tierBreakdown };
}

/**
 * 判断是否为「Demurrage & Detention」合并费用项：一个费用项覆盖到港→还箱整段
 * chargeTypeCode/chargeName 同时包含 Demurrage 与 Detention 时视为合并类型
 */
function isCombinedDemurrageDetention(std: {
  chargeTypeCode?: string | null;
  chargeName?: string | null;
}): boolean {
  const code = (std.chargeTypeCode ?? '').toUpperCase();
  const name = (std.chargeName ?? '').toLowerCase();
  const hasDem = code.includes('DEMURRAGE') || name.includes('demurrage') || name.includes('滞港');
  const hasDet = code.includes('DETENTION') || name.includes('detention') || name.includes('滞箱');
  return hasDem && hasDet;
}

/** 判断是否为纯滞箱费（Detention）标准：起算日=提柜，截止日=还箱；排除合并类型 */
function isDetentionCharge(std: {
  chargeTypeCode?: string | null;
  chargeName?: string | null;
}): boolean {
  if (isCombinedDemurrageDetention(std)) return false;
  const code = (std.chargeTypeCode ?? '').toUpperCase();
  const name = (std.chargeName ?? '').toLowerCase();
  return code.includes('DETENTION') || name.includes('detention') || name.includes('滞箱');
}

/**
 * 堆存费（Storage）：港区堆存，区间为「到港侧起算日 → 提柜侧截止日」（非提柜→还箱）。
 * - forecast 且无 ATA/实际卸船：起算=修正 ETA / ETA；截止=max(计划提柜日, 当天)。
 * - actual，或 forecast 但已有 ATA（或按标准已有实际卸船日）：起算=「按到港」用 ATA，「按卸船」用卸船日；截止=实际提柜或当天。
 */
function isStorageCharge(std: {
  chargeTypeCode?: string | null;
  chargeName?: string | null;
}): boolean {
  if (isCombinedDemurrageDetention(std)) return false;
  if (isDetentionCharge(std)) return false;
  const code = (std.chargeTypeCode ?? '').toUpperCase();
  const name = (std.chargeName ?? '').toLowerCase();
  return code.includes('STORAGE') || name.includes('storage') || name.includes('堆存');
}

/** 判断是否为纯滞港费（Demurrage）标准：到港侧起算，提柜截止；排除合并、滞箱、堆存类型 */
function isDemurrageCharge(std: {
  chargeTypeCode?: string | null;
  chargeName?: string | null;
}): boolean {
  if (isCombinedDemurrageDetention(std)) return false;
  if (isDetentionCharge(std)) return false;
  if (isStorageCharge(std)) return false;
  const code = (std.chargeTypeCode ?? '').toUpperCase();
  const name = (std.chargeName ?? '').toLowerCase();
  return code.includes('DEMURRAGE') || name.includes('demurrage') || name.includes('滞港');
}

/**
 * 滞港费「实际 / 计划」第一步：由状态机判断是否已到达**目的港**（或之后环节）。
 * - 已到目的港：AT_PORT 且 currentPortType=destination；或已提柜/已卸柜/已还箱（均视为已过到港节点）
 * - 仅中转港到港、在途、未出运等 → 未到达目的港，用计划/预测逻辑
 */
function isArrivedAtDestinationPortForDemurrage(ls: LogisticsStatusResult): boolean {
  const { status, currentPortType } = ls;
  if (
    status === SimplifiedStatus.PICKED_UP ||
    status === SimplifiedStatus.UNLOADED ||
    status === SimplifiedStatus.RETURNED_EMPTY
  ) {
    return true;
  }
  if (status === SimplifiedStatus.AT_PORT && currentPortType === 'destination') {
    return true;
  }
  return false;
}

export class DemurrageService {
  private cacheService: CacheService;

  constructor(
    private standardRepo: Repository<ExtDemurrageStandard>,
    private containerRepo: Repository<Container>,
    private portOpRepo: Repository<PortOperation>,
    private seaFreightRepo: Repository<SeaFreight>,
    private truckingRepo: Repository<TruckingTransport>,
    private emptyReturnRepo: Repository<EmptyReturn>,
    private orderRepo: Repository<ReplenishmentOrder>,
    private countryRepo: Repository<Country>,
    private recordRepo?: Repository<ExtDemurrageRecord>
  ) {
    this.cacheService = new CacheService();
  }

  /**
   * 与 `calculateLogisticsStatus`（logisticsStatusMachine）一致，供滞港费先判定是否到达目的港。
   */
  private async getLogisticsStatusSnapshot(
    containerNumber: string
  ): Promise<LogisticsStatusResult | null> {
    const container = await this.containerRepo.findOne({
      where: { containerNumber },
      relations: ['seaFreight']
    });
    if (!container) return null;
    const portOperations = await this.portOpRepo.find({
      where: { containerNumber },
      order: { portSequence: 'ASC' }
    });
    const truckings = await this.truckingRepo.find({
      where: { containerNumber },
      order: { lastPickupDate: 'DESC' }
    });
    const truckingTransport = truckings[0] ?? undefined;
    const warehouseRepo = this.containerRepo.manager.getRepository(WarehouseOperation);
    const warehouseOperation =
      (await warehouseRepo.findOne({
        where: { containerNumber },
        order: { updatedAt: 'DESC' }
      })) ?? undefined;
    // process_empty_return 主键为 container_number，无 id 字段
    const emptyReturn =
      (await this.emptyReturnRepo.findOne({
        where: { containerNumber }
      })) ?? undefined;
    const seaFreight = (container as any).seaFreight ?? undefined;
    return calculateLogisticsStatus(
      container,
      portOperations,
      seaFreight,
      truckingTransport,
      warehouseOperation,
      emptyReturn
    );
  }

  /**
   * 获取货柜销往国家对应的货币代码
   */
  private async getContainerCurrency(containerNumber: string): Promise<string | null> {
    try {
      const container = await this.containerRepo.findOne({
        where: { containerNumber },
        relations: ['replenishmentOrders']
      });
      if (!container) return null;

      const orders = container.replenishmentOrders || [];
      if (orders.length === 0) return null;

      const sellToCountry = orders[0].sellToCountry;
      if (!sellToCountry) return null;

      const country = await this.countryRepo.findOne({
        where: { code: sellToCountry }
      });
      return country?.currency || null;
    } catch (error) {
      logger.warn('[getContainerCurrency] Failed:', error);
      return null;
    }
  }

  /**
   * 获取货柜用于匹配的维度
   * @param resolve 是否做匹配口径标准化（默认 true：优先 name，失败回退 code）
   */
  private async getContainerMatchParams(
    containerNumber: string,
    resolve = true
  ): Promise<{
    destinationPortCode: string | null;
    shippingCompanyCode: string | null;
    originForwarderCode: string | null;
    foreignCompanyCode: string | null;
    startDate: Date | null;
    endDate: Date | null;
    startDateSource: string | null;
    endDateSource: string | null;
    /** 滞箱费：起算日=提柜，截止日=还箱 */
    detentionStartDate: Date | null;
    detentionEndDate: Date | null;
    detentionStartDateSource: string | null;
    detentionEndDateSource: string | null;
    /** 用于计算的原始日期（滞港费/滞箱费，含自动计算的最晚提柜日、最晚还箱日） */
    calculationDates: {
      ataDestPort: Date | null;
      etaDestPort: Date | null;
      revisedEtaDestPort: Date | null;
      dischargeDate: Date | null;
      dischargeDateSource?: string | null;
      /** 最晚提柜日（从 process_port_operations.last_free_date 读取） */
      lastPickupDate: Date | null;
      /** 计划提柜日（从 process_trucking_transport.last_pickup_date 读取，用于预测模式前置条件） */
      plannedPickupDate: Date | null;
      lastReturnDate?: Date | null;
      /** 计划还箱日 process_empty_return.planned_return_date */
      plannedReturnDate?: Date | null;
      pickupDateActual: Date | null;
      returnTime: Date | null;
      /** 出运日：备货 actual_ship_date 或海运 shipment_date（关键日期时间线） */
      shipmentDate?: Date | null;
      today: Date;
    };
    /** lastPickupDate 来源，用于展示 */
    lastPickupDateSource?:
      | 'process_port_operations.last_free_date'
      | 'process_port_operations.last_free_date (manual)'
      | 'process_trucking_transport.last_pickup_date'
      | 'process_trucking_transport.planned_pickup_date'
      | null;
  }> {
    const container = await this.containerRepo.findOne({
      where: { containerNumber },
      relations: ['seaFreight', 'replenishmentOrders', 'replenishmentOrders.customer']
    });
    const today = toDateOnly(new Date());
    if (!container) {
      return {
        destinationPortCode: null,
        shippingCompanyCode: null,
        originForwarderCode: null,
        foreignCompanyCode: null,
        startDate: null,
        endDate: null,
        startDateSource: null,
        endDateSource: null,
        detentionStartDate: null,
        detentionEndDate: null,
        detentionStartDateSource: null,
        detentionEndDateSource: null,
        calculationDates: {
          ataDestPort: null,
          etaDestPort: null,
          revisedEtaDestPort: null,
          dischargeDate: null,
          dischargeDateSource: null,
          lastPickupDate: null,
          plannedPickupDate: null,
          plannedReturnDate: null,
          pickupDateActual: null,
          returnTime: null,
          shipmentDate: null,
          today
        }
      };
    }

    const portOps = await this.portOpRepo.find({
      where: { containerNumber, portType: 'destination' },
      order: { portSequence: 'DESC' }
    });
    const destPort = portOps[0] ?? null; // 目的港最新一条（port_sequence 最大，与统计口径一致）

    const sf = (container as any).seaFreight ?? null;
    // 匹配入参优先使用业务侧编码/ID，再由 resolveToDictCode 统一转标准编码
    const destinationPortCode = destPort?.portCode ?? (sf as any)?.portOfDischarge ?? null;
    const shippingCompanyCode = (sf as any)?.shippingCompanyId ?? null;
    const originForwarderCode = (sf as any)?.freightForwarderId ?? null;

    let foreignCompanyCode: string | null = null;
    const orders = (container as any).replenishmentOrders ?? [];
    if (orders?.length > 0) {
      const o = orders[0];
      const customer = (o as any).customer;
      // 客户维度优先海外公司编码，其次客户名称/销往国家（供名称与别名映射兜底）
      foreignCompanyCode =
        customer?.overseasCompanyCode ??
        (o as any).customerName ??
        (o as any).sellToCountry ??
        null;
    }

    const shipmentDate =
      orders.length > 0 && (orders[0] as { actualShipDate?: Date }).actualShipDate
        ? toDateOnly((orders[0] as { actualShipDate: Date }).actualShipDate)
        : sf && (sf as { shipmentDate?: Date }).shipmentDate
          ? toDateOnly((sf as { shipmentDate: Date }).shipmentDate)
          : null;

    const ata = destPort?.ata ? toDateOnly(destPort.ata) : null;
    // 修正ETA：revised_eta 为空时回退使用 eta_correction（Excel 导入的「ETA修正」）
    const revisedEtaRaw = destPort?.revisedEta ?? destPort?.etaCorrection;
    const revisedEta = revisedEtaRaw ? toDateOnly(revisedEtaRaw) : null;
    const etaFromPort = destPort?.eta ? toDateOnly(destPort.eta) : null;
    const etaFromSeaFreight = (sf as any)?.eta ? toDateOnly((sf as any).eta) : null;
    const eta = revisedEta ?? etaFromPort ?? etaFromSeaFreight;
    const discharge = destPort?.destPortUnloadDate
      ? toDateOnly(destPort.destPortUnloadDate)
      : destPort?.dischargedTime
        ? toDateOnly(destPort.dischargedTime)
        : null;
    const dischargeDateSource = destPort?.destPortUnloadDate
      ? 'dest_port_unload_date'
      : destPort?.dischargedTime
        ? 'discharged_time'
        : null;
    const startDate = ata ?? eta ?? discharge;
    const startDateSource = ata
      ? 'ata'
      : etaFromPort
        ? 'eta'
        : etaFromSeaFreight
          ? 'process_sea_freight.eta'
          : discharge
            ? dischargeDateSource
            : null;

    const truckings = await this.truckingRepo.find({
      where: { containerNumber },
      order: { lastPickupDate: 'DESC' }
    });
    // 计划提柜日：从 process_trucking_transport.planned_pickup_date 读取
    const plannedPickupDate =
      truckings.length > 0 && truckings[0].plannedPickupDate
        ? toDateOnly(truckings[0].plannedPickupDate)
        : null;
    // 最晚提柜日：从 process_port_operations.last_free_date 读取
    // 优先使用手工维护的LFD（lastFreeDateSource === 'manual'）
    const lastPickupDate =
      destPort?.lastFreeDate && destPort.lastFreeDateSource === 'manual'
        ? toDateOnly(destPort.lastFreeDate)
        : null;
    // 截止日：优先使用最晚提柜日，其次使用计划提柜日（用于计算滞港费截止日）
    const _pickupDate = lastPickupDate ?? plannedPickupDate;
    const lastPickupDateSource = lastPickupDate
      ? destPort.lastFreeDateSource === 'manual'
        ? ('process_port_operations.last_free_date (manual)' as const)
        : ('process_port_operations.last_free_date' as const)
      : plannedPickupDate
        ? ('process_trucking_transport.planned_pickup_date' as const)
        : null;
    const pickupDateActual =
      truckings.length > 0 && truckings[0].pickupDate ? toDateOnly(truckings[0].pickupDate) : null;
    const endDate = pickupDateActual ?? today;
    const endDateSource = pickupDateActual ? 'process_trucking_transport.pickup_date' : '当前日期';

    const emptyReturns = await this.emptyReturnRepo.find({
      where: { containerNumber }
    });
    const returnTime =
      emptyReturns.length > 0 && emptyReturns[0].returnTime
        ? toDateOnly(emptyReturns[0].returnTime)
        : null;
    const lastReturnDateFromDb =
      emptyReturns.length > 0 && emptyReturns[0].lastReturnDate
        ? toDateOnly(emptyReturns[0].lastReturnDate)
        : null;
    const plannedReturnDate =
      emptyReturns.length > 0 && emptyReturns[0].plannedReturnDate
        ? toDateOnly(emptyReturns[0].plannedReturnDate)
        : null;

    /** 滞箱匹配用起止：与 calculateForContainer 一致，按状态机区分 forecast（计划提柜/计划还箱）与 actual（实际提柜/还箱） */
    const logisticsSnapshotForDetention = await this.getLogisticsStatusSnapshot(containerNumber);
    const arrivedForDetentionMatch = logisticsSnapshotForDetention
      ? isArrivedAtDestinationPortForDemurrage(logisticsSnapshotForDetention)
      : false;
    let detentionStartDate: Date | null;
    let detentionStartDateSource: string | null;
    let detentionEndDate: Date;
    let detentionEndDateSource: string;
    if (arrivedForDetentionMatch) {
      detentionStartDate = pickupDateActual ?? null;
      detentionStartDateSource = pickupDateActual ? 'process_trucking_transport.pickup_date' : null;
      detentionEndDate = returnTime ?? today;
      detentionEndDateSource = returnTime ? 'process_empty_return.return_time' : '当前日期';
    } else {
      detentionStartDate = plannedPickupDate ?? null;
      detentionStartDateSource = plannedPickupDate
        ? 'process_trucking_transport.planned_pickup_date'
        : null;
      detentionEndDate = plannedReturnDate ? maxDate(today, plannedReturnDate) : today;
      detentionEndDateSource = plannedReturnDate
        ? 'max(当前日期, process_empty_return.planned_return_date)'
        : '当前日期';
    }

    const calculationDates = {
      ataDestPort: ata,
      etaDestPort: eta,
      revisedEtaDestPort: revisedEta,
      dischargeDate: discharge,
      dischargeDateSource,
      lastPickupDate, // 最晚提柜日（从 process_port_operations.last_free_date）
      plannedPickupDate, // 计划提柜日（从 process_trucking_transport.last_pickup_date）
      lastReturnDate: lastReturnDateFromDb,
      plannedReturnDate, // 计划还箱日（从 process_empty_return.planned_return_date）
      pickupDateActual,
      returnTime,
      shipmentDate,
      today
    };

    if (resolve) {
      // 规则：严格 name-only 优先；若名称无法解析，回退标准 code（兼容历史数据）
      const portCodeResolved = await this.resolveToDictCode(destinationPortCode, 'port');
      const shipCodeResolved = await this.resolveToDictCode(shippingCompanyCode, 'shipping');
      const ffCodeResolved = await this.resolveToDictCode(originForwarderCode, 'forwarder');
      const overseasCodeResolved = await this.resolveToDictCode(foreignCompanyCode, 'overseas');

      const resolvedPort =
        (await this.resolveDictNameByCode(portCodeResolved, 'port')) ?? portCodeResolved;
      const resolvedShip =
        (await this.resolveDictNameByCode(shipCodeResolved, 'shipping')) ?? shipCodeResolved;
      const resolvedFf =
        (await this.resolveDictNameByCode(ffCodeResolved, 'forwarder')) ?? ffCodeResolved;
      const resolvedOverseas =
        (await this.resolveDictNameByCode(overseasCodeResolved, 'overseas')) ??
        overseasCodeResolved;
      return {
        destinationPortCode: resolvedPort,
        shippingCompanyCode: resolvedShip,
        originForwarderCode: resolvedFf,
        foreignCompanyCode: resolvedOverseas,
        startDate,
        endDate,
        startDateSource,
        endDateSource,
        detentionStartDate,
        detentionEndDate,
        detentionStartDateSource,
        detentionEndDateSource,
        calculationDates,
        lastPickupDateSource
      };
    }

    return {
      destinationPortCode,
      shippingCompanyCode,
      originForwarderCode,
      foreignCompanyCode,
      startDate,
      endDate,
      startDateSource,
      endDateSource,
      detentionStartDate,
      detentionEndDate,
      detentionStartDateSource,
      detentionEndDateSource,
      calculationDates,
      lastPickupDateSource
    };
  }

  /**
   * 将货柜侧名称/非标准编码解析为字典标准 code（匹配时口径统一）
   * 若字典中无匹配，返回原值（供 matchCodeOrName 与标准 name 兜底）
   */
  private async resolveToDictCode(
    nameOrCode: string | null,
    dictType: 'port' | 'shipping' | 'forwarder' | 'overseas'
  ): Promise<string | null> {
    if (!nameOrCode || !String(nameOrCode).trim()) return null;
    const v = String(nameOrCode).trim();
    const manager = this.containerRepo.manager;

    if (dictType === 'port') {
      const repo = manager.getRepository(Port);
      const row = await repo
        .createQueryBuilder('p')
        .where(
          'p.port_code = :v OR LOWER(TRIM(p.port_name)) = LOWER(:v) OR (p.port_name_en IS NOT NULL AND LOWER(TRIM(p.port_name_en)) = LOWER(:v))',
          { v }
        )
        .getOne();
      if (row?.portCode) return row.portCode;
      const mapped = await this.resolveByUniversalMapping(v, ['PORT', 'PORT_CODE']);
      return mapped ?? v;
    }
    if (dictType === 'shipping') {
      const repo = manager.getRepository(ShippingCompany);
      const row = await repo
        .createQueryBuilder('s')
        .where(
          's.company_code = :v OR LOWER(TRIM(s.company_name)) = LOWER(:v) OR (s.company_name_en IS NOT NULL AND LOWER(TRIM(s.company_name_en)) = LOWER(:v)) OR (s.scac_code IS NOT NULL AND LOWER(TRIM(s.scac_code)) = LOWER(:v))',
          { v }
        )
        .getOne();
      if (row?.companyCode) return row.companyCode;
      const mapped = await this.resolveByUniversalMapping(v, [
        'SHIPPING_COMPANY',
        'SHIPPING',
        'CARRIER'
      ]);
      return mapped ?? v;
    }
    if (dictType === 'forwarder') {
      const repo = manager.getRepository(FreightForwarder);
      const row = await repo
        .createQueryBuilder('f')
        .where(
          'f.forwarder_code = :v OR LOWER(TRIM(f.forwarder_name)) = LOWER(:v) OR (f.forwarder_name_en IS NOT NULL AND LOWER(TRIM(f.forwarder_name_en)) = LOWER(:v))',
          { v }
        )
        .getOne();
      if (row?.forwarderCode) return row.forwarderCode;
      const mapped = await this.resolveByUniversalMapping(v, ['FREIGHT_FORWARDER', 'FORWARDER']);
      return mapped ?? v;
    }
    if (dictType === 'overseas') {
      const repo = manager.getRepository(OverseasCompany);
      const row = await repo
        .createQueryBuilder('o')
        .where(
          'o.company_code = :v OR LOWER(TRIM(o.company_name)) = LOWER(:v) OR (o.company_name_en IS NOT NULL AND LOWER(TRIM(o.company_name_en)) = LOWER(:v))',
          { v }
        )
        .getOne();
      if (row?.companyCode) return row.companyCode;

      // 桥接：输入可能是客户编码/客户名称（如 MH_UK），先映射到 biz_customers.overseas_company_code
      const customerRepo = manager.getRepository(Customer);
      const customer = await customerRepo
        .createQueryBuilder('c')
        .where('c.customer_code = :v OR LOWER(TRIM(c.customer_name)) = LOWER(:v)', { v })
        .getOne();
      if (customer?.overseasCompanyCode) return String(customer.overseasCompanyCode).trim();

      const mapped = await this.resolveByUniversalMapping(v, [
        'OVERSEAS_COMPANY',
        'OVERSEAS',
        'CUSTOMER'
      ]);
      if (mapped) return mapped;

      // 兜底：输入为国家码时，尝试匹配该国家的海外公司编码（如 GB -> 83）
      const countryCode = v.toUpperCase();
      const byCountry = await repo
        .createQueryBuilder('o')
        .where('UPPER(TRIM(o.country)) = :countryCode', { countryCode })
        .orderBy('o.sort_order', 'ASC')
        .addOrderBy('o.company_code', 'ASC')
        .getOne();
      return byCountry?.companyCode ?? v;
    }
    return v;
  }

  /**
   * 由字典编码/ID反查名称（用于名称口径匹配）
   */
  private async resolveDictNameByCode(
    codeOrId: string | null,
    dictType: 'port' | 'shipping' | 'forwarder' | 'overseas'
  ): Promise<string | null> {
    if (!codeOrId || !String(codeOrId).trim()) return null;
    const v = String(codeOrId).trim();
    const manager = this.containerRepo.manager;

    if (dictType === 'port') {
      const repo = manager.getRepository(Port);
      const row = await repo.createQueryBuilder('p').where('p.port_code = :v', { v }).getOne();
      return row?.portName ?? null;
    }
    if (dictType === 'shipping') {
      const repo = manager.getRepository(ShippingCompany);
      const row = await repo
        .createQueryBuilder('s')
        .where(
          's.company_code = :v OR (s.scac_code IS NOT NULL AND LOWER(TRIM(s.scac_code)) = LOWER(:v))',
          { v }
        )
        .getOne();
      // 标准库 shipping_company_name 常使用 company_code（如 CMA），
      // 因此优先返回 company_code，再回退英文名/中文名。
      return row?.companyCode ?? row?.companyNameEn ?? row?.companyName ?? null;
    }
    if (dictType === 'forwarder') {
      const repo = manager.getRepository(FreightForwarder);
      const row = await repo.createQueryBuilder('f').where('f.forwarder_code = :v', { v }).getOne();
      return row?.forwarderName ?? null;
    }
    if (dictType === 'overseas') {
      const repo = manager.getRepository(OverseasCompany);
      const row = await repo.createQueryBuilder('o').where('o.company_code = :v', { v }).getOne();
      return row?.companyName ?? null;
    }

    return null;
  }

  /**
   * 从通用字典映射表解析标准编码
   * 兼容 old_code / aliases / 中英文名称 等多口径值
   */
  private async resolveByUniversalMapping(
    inputValue: string,
    dictTypes: string[]
  ): Promise<string | null> {
    const v = String(inputValue || '').trim();
    if (!v || dictTypes.length === 0) return null;
    try {
      const targetTables = this.getUniversalMappingTargetTables(dictTypes);
      const rows = await this.containerRepo.manager.query(
        `SELECT m.standard_code
         FROM dict_universal_mapping m
         WHERE m.is_active = TRUE
           AND (
             UPPER(TRIM(m.dict_type)) = ANY($1::text[])
             OR (m.target_table IS NOT NULL AND LOWER(TRIM(m.target_table)) = ANY($2::text[]))
           )
           AND (
             LOWER(TRIM(m.standard_code)) = LOWER($3)
             OR (m.standard_name IS NOT NULL AND LOWER(TRIM(m.standard_name)) = LOWER($3))
             OR (m.name_cn IS NOT NULL AND LOWER(TRIM(m.name_cn)) = LOWER($3))
             OR (m.name_en IS NOT NULL AND LOWER(TRIM(m.name_en)) = LOWER($3))
             OR (m.old_code IS NOT NULL AND LOWER(TRIM(m.old_code)) = LOWER($3))
             OR EXISTS (
               SELECT 1
               FROM unnest(string_to_array(COALESCE(m.aliases, ''), ',')) alias_item
               WHERE LOWER(TRIM(alias_item)) = LOWER($3)
             )
           )
         ORDER BY m.is_primary DESC, m.sort_order ASC, m.id ASC
         LIMIT 1`,
        [dictTypes.map((t) => t.toUpperCase()), targetTables, v]
      );
      return rows?.[0]?.standard_code ? String(rows[0].standard_code).trim() : null;
    } catch {
      // 映射表/函数不存在时静默回退到原逻辑，避免影响主流程
      return null;
    }
  }

  private getUniversalMappingTargetTables(dictTypes: string[]): string[] {
    const upper = dictTypes.map((t) => t.toUpperCase());
    if (upper.some((t) => t.includes('PORT'))) return ['dict_ports'];
    if (upper.some((t) => t.includes('SHIPPING') || t.includes('CARRIER')))
      return ['dict_shipping_companies'];
    if (upper.some((t) => t.includes('FORWARDER'))) return ['dict_freight_forwarders'];
    if (upper.some((t) => t.includes('OVERSEAS') || t.includes('CUSTOMER'))) {
      return ['dict_overseas_companies', 'biz_customers'];
    }
    return [];
  }

  /**
   * 匹配滞港费标准（四字段 + 有效期）
   * is_chargeable = 'N' 表示收费项，参与计算；Y = 不收费跳过
   *
   * 规则：先按四字段 + 有效期匹配；若有效期无一匹配但四字段有匹配，则取四字段匹配中「最新」的标准（按 effective_date 降序取最新）
   *
   * 💡 优化：使用缓存减少数据库查询（缓存 1 小时）
   */

  /**
   * 获取所有有效的滞港费标准（带缓存）
   *
   * 缓存策略：
   * - 全量标准列表变更不频繁，缓存 24 小时
   * - 每次查询过滤有效期内的标准
   */
  private async getAllActiveStandards(): Promise<ExtDemurrageStandard[]> {
    // ✅ 带缓存获取滞港费标准全量列表
    const cacheKey = SchedulingCacheKeys.DEMURRAGE_ALL_STANDARDS;

    let allStandards = await this.cacheService.get<ExtDemurrageStandard[]>(cacheKey);
    if (!allStandards) {
      allStandards = await this.standardRepo.find({
        order: { sequenceNumber: 'ASC', id: 'ASC' }
      });
      // 缓存 24 小时
      if (allStandards.length > 0) {
        await this.cacheService.set(cacheKey, allStandards, SchedulingCacheTTL.DEMURRAGE_STANDARD);
        logger.debug(`[DemurrageService] Cached ${allStandards.length} standards`);
      }
    }

    return allStandards;
  }

  async matchStandards(containerNumber: string): Promise<ExtDemurrageStandard[]> {
    // 生成缓存键（基于 containerNumber 的唯一标识）
    const cacheKey = `demurrage:standards:${containerNumber}`;

    // 先查缓存
    const cached = await this.cacheService.get<ExtDemurrageStandard[]>(cacheKey);
    if (cached && cached.length > 0) {
      logger.debug(`[DemurrageService] Cache hit for ${containerNumber}`);
      return cached;
    }

    const params = await this.getContainerMatchParams(containerNumber);
    const hasDemurrageRange = !!(params.startDate && params.endDate);
    const hasDetentionRange = !!(params.detentionStartDate && params.detentionEndDate);
    if (!hasDemurrageRange && !hasDetentionRange) return [];

    const today = toDateOnly(new Date());

    // 1. 获取所有 is_chargeable='N' 的标准（N=收费并参与计算，Y=不收费跳过）
    const allChargeable = await this.standardRepo
      .createQueryBuilder('s')
      .where('s.is_chargeable = :chargeable', { chargeable: 'N' })
      .orderBy('s.sequence_number', 'ASC')
      .addOrderBy('s.id', 'ASC')
      .getMany();

    // 2. 四字段匹配
    const fourFieldMatched = allChargeable.filter((s) => {
      if (params.destinationPortCode) {
        if (
          !matchCodeOrName(params.destinationPortCode, s.destinationPortCode, s.destinationPortName)
        )
          return false;
      }
      if (params.shippingCompanyCode) {
        if (
          !matchCodeOrName(params.shippingCompanyCode, s.shippingCompanyCode, s.shippingCompanyName)
        )
          return false;
      }
      if (params.originForwarderCode) {
        if (
          !matchCodeOrName(params.originForwarderCode, s.originForwarderCode, s.originForwarderName)
        )
          return false;
      }
      if (params.foreignCompanyCode) {
        if (!matchCodeOrName(params.foreignCompanyCode, s.foreignCompanyCode, s.foreignCompanyName))
          return false;
      }
      return true;
    });

    if (fourFieldMatched.length === 0) return [];

    // 3. 有效期匹配：effective_date <= today AND (expiry_date IS NULL OR expiry_date >= today)
    const validityMatched = fourFieldMatched.filter((s) => {
      if (s.effectiveDate) {
        const eff = toDateOnly(s.effectiveDate);
        if (eff > today) return false;
      }
      if (s.expiryDate) {
        const exp = toDateOnly(s.expiryDate);
        if (exp < today) return false;
      }
      return true;
    });

    let result: ExtDemurrageStandard[];
    if (validityMatched.length > 0) {
      result = validityMatched;
    } else {
      // 4. 有效期无一匹配，但四字段有匹配 → 取最新的标准（按 effective_date 降序，取最大 effective_date 的那批）
      const withEffDate = fourFieldMatched.map((s) => ({
        std: s,
        effTime: s.effectiveDate ? toDateOnly(s.effectiveDate).getTime() : 0
      }));
      const maxEffTime = Math.max(...withEffDate.map((x) => x.effTime));
      const latest = withEffDate
        .filter((x) => x.effTime === maxEffTime)
        .map((x) => x.std)
        .sort(
          (a, b) => (a.sequenceNumber ?? 0) - (b.sequenceNumber ?? 0) || (a.id ?? 0) - (b.id ?? 0)
        );
      result = latest;
    }

    // 写入缓存（1 小时过期）
    if (result.length > 0) {
      await this.cacheService.set(cacheKey, result, 3600);
      logger.debug(`[DemurrageService] Cached ${result.length} standards for ${containerNumber}`);
    }

    return result;
  }

  /**
   * 诊断滞港费匹配失败原因
   * 返回货柜解析参数、标准库情况、每项标准的排除原因
   */
  async diagnoseMatch(containerNumber: string): Promise<{
    containerExists: boolean;
    containerParams: {
      destinationPortCode: string | null;
      shippingCompanyCode: string | null;
      originForwarderCode: string | null;
      foreignCompanyCode: string | null;
      startDate: string | null;
      endDate: string | null;
      /** 口径统一解析后用于匹配的值（若与上不同则说明已从字典解析） */
      resolvedForMatch?: {
        destinationPortCode: string | null;
        shippingCompanyCode: string | null;
        originForwarderCode: string | null;
        foreignCompanyCode: string | null;
      };
    };
    standardsTotal: number;
    standardsAfterEffectiveDate: number;
    excludedByIsChargeable: number;
    standardsAfterFourFieldMatch: number;
    effectiveDateConstraint: { today: string; rule: string };
    allStandardsSample: Array<{
      id: number;
      destinationPortCode: string | null;
      destinationPortName: string | null;
      shippingCompanyCode: string | null;
      shippingCompanyName: string | null;
      originForwarderCode: string | null;
      originForwarderName: string | null;
      foreignCompanyCode: string | null;
      foreignCompanyName: string | null;
      effectiveDate: string | null;
      expiryDate: string | null;
      isChargeable: string;
      excludeReasons: string[];
    }>;
  }> {
    const rawParams = await this.getContainerMatchParams(containerNumber, false);
    const resolvedParams = await this.getContainerMatchParams(containerNumber, true);
    const today = toDateOnly(new Date());

    // ✅ 带缓存获取滞港费标准全量列表
    const allStandards = await this.getAllActiveStandards();

    const afterEffective = allStandards.filter((s) => {
      if (!s.effectiveDate) return true;
      const eff = toDateOnly(s.effectiveDate);
      if (eff > today) return false;
      if (s.expiryDate) {
        const exp = toDateOnly(s.expiryDate);
        if (exp < today) return false;
      }
      return true;
    });

    const afterChargeable = afterEffective.filter((s) => s.isChargeable === 'N');

    const matched = afterChargeable.filter((s) => {
      if (
        resolvedParams.destinationPortCode &&
        !matchCodeOrName(
          resolvedParams.destinationPortCode,
          s.destinationPortCode,
          s.destinationPortName
        )
      )
        return false;
      if (
        resolvedParams.shippingCompanyCode &&
        !matchCodeOrName(
          resolvedParams.shippingCompanyCode,
          s.shippingCompanyCode,
          s.shippingCompanyName
        )
      )
        return false;
      if (
        resolvedParams.originForwarderCode &&
        !matchCodeOrName(
          resolvedParams.originForwarderCode,
          s.originForwarderCode,
          s.originForwarderName
        )
      )
        return false;
      if (
        resolvedParams.foreignCompanyCode &&
        !matchCodeOrName(
          resolvedParams.foreignCompanyCode,
          s.foreignCompanyCode,
          s.foreignCompanyName
        )
      )
        return false;
      return true;
    });

    const sample = afterChargeable.slice(0, 20).map((s) => {
      const reasons: string[] = [];
      if (
        resolvedParams.destinationPortCode &&
        !matchCodeOrName(
          resolvedParams.destinationPortCode,
          s.destinationPortCode,
          s.destinationPortName
        )
      )
        reasons.push(
          `目的港不匹配: 货柜=${resolvedParams.destinationPortCode} 标准=${s.destinationPortCode || s.destinationPortName || '(空)'}`
        );
      if (
        resolvedParams.shippingCompanyCode &&
        !matchCodeOrName(
          resolvedParams.shippingCompanyCode,
          s.shippingCompanyCode,
          s.shippingCompanyName
        )
      )
        reasons.push(
          `船公司不匹配: 货柜=${resolvedParams.shippingCompanyCode} 标准=${s.shippingCompanyCode || s.shippingCompanyName || '(空)'}`
        );
      if (
        resolvedParams.originForwarderCode &&
        !matchCodeOrName(
          resolvedParams.originForwarderCode,
          s.originForwarderCode,
          s.originForwarderName
        )
      )
        reasons.push(
          `货代不匹配: 货柜=${resolvedParams.originForwarderCode} 标准=${s.originForwarderCode || s.originForwarderName || '(空)'}`
        );
      if (
        resolvedParams.foreignCompanyCode &&
        !matchCodeOrName(
          resolvedParams.foreignCompanyCode,
          s.foreignCompanyCode,
          s.foreignCompanyName
        )
      )
        reasons.push(
          `客户/境外公司不匹配: 货柜=${resolvedParams.foreignCompanyCode} 标准=${s.foreignCompanyCode || s.foreignCompanyName || '(空)'}`
        );
      if (reasons.length === 0) reasons.push('(应匹配)');
      return {
        id: s.id,
        destinationPortCode: s.destinationPortCode ?? null,
        destinationPortName: s.destinationPortName ?? null,
        shippingCompanyCode: s.shippingCompanyCode ?? null,
        shippingCompanyName: s.shippingCompanyName ?? null,
        originForwarderCode: s.originForwarderCode ?? null,
        originForwarderName: s.originForwarderName ?? null,
        foreignCompanyCode: s.foreignCompanyCode ?? null,
        foreignCompanyName: s.foreignCompanyName ?? null,
        effectiveDate: s.effectiveDate
          ? toDateOnly(s.effectiveDate).toISOString().slice(0, 10)
          : null,
        expiryDate: s.expiryDate ? toDateOnly(s.expiryDate).toISOString().slice(0, 10) : null,
        isChargeable: s.isChargeable ?? 'N',
        excludeReasons: reasons
      };
    });

    const excludedByChargeable = afterEffective.filter((s) => s.isChargeable !== 'N').length;

    return {
      containerExists: !!rawParams.startDate || !!rawParams.destinationPortCode,
      containerParams: {
        destinationPortCode: rawParams.destinationPortCode,
        shippingCompanyCode: rawParams.shippingCompanyCode,
        originForwarderCode: rawParams.originForwarderCode,
        foreignCompanyCode: rawParams.foreignCompanyCode,
        startDate: rawParams.startDate ? rawParams.startDate.toISOString().slice(0, 10) : null,
        endDate: rawParams.endDate ? rawParams.endDate.toISOString().slice(0, 10) : null,
        resolvedForMatch: {
          destinationPortCode: resolvedParams.destinationPortCode,
          shippingCompanyCode: resolvedParams.shippingCompanyCode,
          originForwarderCode: resolvedParams.originForwarderCode,
          foreignCompanyCode: resolvedParams.foreignCompanyCode
        }
      },
      standardsTotal: allStandards.length,
      standardsAfterEffectiveDate: afterEffective.length,
      excludedByIsChargeable: excludedByChargeable,
      standardsAfterFourFieldMatch: matched.length,
      effectiveDateConstraint: {
        today: today.toISOString().slice(0, 10),
        rule: 'effective_date <= 当前 AND (expiry_date IS NULL OR expiry_date >= 当前), is_chargeable = N（N=收费）'
      },
      allStandardsSample: sample
    };
  }

  /**
   * 计算单柜滞港费：匹配标准 → 自动计算最晚提柜日/最晚还箱日 → 逐项计算 → 汇总
   *
   * **权威业务口径（必须先读文档再改逻辑）**：
   * - `frontend/public/docs/demurrage/01-DEMURRAGE_LOGIC_FROM_CONTAINER_SYSTEM.md` — 费用类型、起止日、免费期
   * - `frontend/public/docs/demurrage/08-DEMURRAGE_CALCULATION_MODES.md` — actual / forecast 判定与 ETA 用法
   * - `frontend/public/docs/demurrage/05-DOC_VS_CODE_CONSISTENCY.md` — 文档与代码对照
   *
   * 费用区间摘要（与 `isDetentionCharge` / `isCombinedDemurrageDetention` / `isStorageCharge` 一致）：
   * - **滞港费（Demurrage）**：到港/卸船 → 实际提柜日（无则当天）
   * - **滞箱费（Detention）**：实际提柜日 → 实际还箱日（无则当天）；无提柜日则跳过该项
   * - **堆存费（Storage）**：全局 forecast 时若已有 ATA（或按标准已有实际卸船日）则视为已到港，堆存改按 **actual 区间**（起算 ATA|卸船，截止 实际提柜|当天）；否则 forecast 起算=修正ETA/ETA，截止=max(计划提柜,当天)
   * - **合并（D&D）**：forecast 起算修正 ETA/ETA、截止与滞箱 forecast 一致；actual 起算同滞港（按到港/卸船口径）、截止实际还箱或当天；不强制依赖实际提柜
   *
   * **计算模式（必须先于具体日期）**：调用 `calculateLogisticsStatus`（`utils/logisticsStatusMachine`）判断是否已到达目的港或已进入提柜/卸柜/还箱；**是** → `actual`，**否** → `forecast`（计划/预测）。不再仅用「有无 ATA/卸船」字段切换。
   *
   * 最晚提柜日 = 起算日(ATA/ETA/卸船) + 免费天数（按首条滞港类标准）
   * 最晚还箱日 = 用箱起算日(实际提柜/计划提柜) + 免费用箱天数（按滞箱费标准）
   *
   * @returns { result, message?, reason? } 当无法计算时 result 为 null
   *   - no_arrival_at_dest / missing_arrival_dates / no_matching_standards / missing_dates / missing_pickup_date_actual
   *   - missing_planned_pickup_date / missing_eta_combined_forecast / missing_arrival_for_combined_actual
   *   - missing_eta_storage_forecast / missing_arrival_storage_actual（堆存）
   * @param options.freeDateWriteMode batch=与定时任务相同的写回条件；none=仅计算不落库（单条免费日更新在 runSingleContainerFreeDateUpdate 中已先写库）
   */
  async calculateForContainer(
    containerNumber: string,
    options?: {
      freeDateWriteMode?: 'batch' | 'none';
      paramsOverride?: any; // ContainerMatchParams 类型
    }
  ): Promise<{
    result: DemurrageCalculationResult | null;
    message?: string;
    reason?:
      | 'no_arrival_at_dest'
      | 'missing_arrival_dates'
      | 'no_matching_standards'
      | 'missing_dates'
      | 'missing_pickup_date_actual'
      | 'missing_planned_pickup_date'
      | 'missing_eta_combined_forecast'
      | 'missing_arrival_for_combined_actual'
      | 'missing_eta_storage_forecast'
      | 'missing_arrival_storage_actual';
  }> {
    await this.normalizeOrphanLastFreeDateSource(containerNumber);
    // ✅ 关键修复：如果传入了 paramsOverride，使用覆盖的参数，否则从数据库获取
    const params = options?.paramsOverride || (await this.getContainerMatchParams(containerNumber));

    // 第一步：状态机判定是否到达目的港（或提柜/卸柜/还箱），再决定 actual vs forecast（计划逻辑）
    const logisticsSnapshot = await this.getLogisticsStatusSnapshot(containerNumber);
    const arrivedAtDestinationPort = logisticsSnapshot
      ? isArrivedAtDestinationPortForDemurrage(logisticsSnapshot)
      : false;
    const calculationMode: 'actual' | 'forecast' = arrivedAtDestinationPort ? 'actual' : 'forecast';

    const today = params.calculationDates.today;
    const plannedPickupDate = params.calculationDates.plannedPickupDate;
    const pickupDateActualEarly = params.calculationDates.pickupDateActual;

    /**
     * 滞港费（Demurrage）截止日（仅纯滞港费项使用，非堆存/滞箱/合并）：
     * ① forecast（未到港/无 ATA、无卸船）：max(今天, 计划提柜日)；无计划提柜日则用今天，每日滚动更新预计金额。
     * ② actual（已到港或已卸船）：有实际提柜日用提柜日；无则用今天。提柜日后金额封顶不再随日期增长。
     * 见 frontend/public/docs/demurrage/01-DEMURRAGE_LOGIC_FROM_CONTAINER_SYSTEM.md
     */
    let demurragePortEndDate: Date;
    let demurragePortEndDateSource: string;
    if (calculationMode === 'forecast') {
      demurragePortEndDate = plannedPickupDate ? maxDate(today, plannedPickupDate) : today;
      demurragePortEndDateSource = plannedPickupDate
        ? 'max(当前日期, process_trucking_transport.planned_pickup_date)'
        : '当前日期';
    } else {
      demurragePortEndDate = pickupDateActualEarly ?? today;
      demurragePortEndDateSource = pickupDateActualEarly
        ? 'process_trucking_transport.pickup_date'
        : '当前日期';
    }

    const dateOrderWarnings: string[] = [];
    const ataD = params.calculationDates.ataDestPort;
    const dischargeD = params.calculationDates.dischargeDate;
    const revEta = params.calculationDates.revisedEtaDestPort;
    const etaD = params.calculationDates.etaDestPort;
    if (calculationMode === 'actual' && pickupDateActualEarly) {
      if (ataD && pickupDateActualEarly.getTime() < ataD.getTime()) {
        dateOrderWarnings.push('实际提柜日早于目的港 ATA，与到港→提柜顺序不符，请核对');
      }
      if (dischargeD && pickupDateActualEarly.getTime() < dischargeD.getTime()) {
        dateOrderWarnings.push('实际提柜日早于卸船日，与卸船→提柜顺序不符，请核对');
      }
    }
    if (calculationMode === 'forecast' && plannedPickupDate) {
      const startRef = revEta ?? etaD;
      if (startRef && plannedPickupDate.getTime() < startRef.getTime()) {
        dateOrderWarnings.push('计划提柜日早于 ETA/修正 ETA 起算参考日，请核对排期');
      }
    }

    // 完全无起算日：无 ATA/ETA/卸船日
    const hasStartDate = !!(
      params.calculationDates.ataDestPort ??
      params.calculationDates.revisedEtaDestPort ??
      params.calculationDates.etaDestPort ??
      params.calculationDates.dischargeDate
    );
    const hasPickupDateActual = !!params.calculationDates.pickupDateActual;
    if (!hasStartDate) {
      const message = hasPickupDateActual
        ? '已有实际提柜，但缺少到港/ETA/卸船日起算日，无法计算滞港费'
        : '还未到达目的港，滞港费暂不用计算';
      return {
        result: null,
        message,
        reason: hasPickupDateActual ? 'missing_arrival_dates' : 'no_arrival_at_dest'
      };
    }

    const standards = await this.matchStandards(containerNumber);
    if (standards.length === 0) {
      return { result: null, message: '未匹配到滞港费标准', reason: 'no_matching_standards' };
    }

    // 说明：已通过 hasStartDate（含 ETA/修正 ETA），预测模式下仍可用 ETA 作为滞港费起算日，不得再强制要求「计划提柜日」。

    // 1) 免费日规则矩阵（单条/批量统一）
    // - Strict 节点型：
    //   * LFD = min(Storage>0, Demurrage>0)，若二者均无再回退 Combined(D&D)
    //   * LRD = min(Combined(D&D)>0, Detention>0)
    // - 起算口径保持：
    //   * LFD：到港侧起算（按标准 calculationBasis + 模式）
    //   * LRD：若选中 Combined(D&D) 则到港→还箱整段起算；否则按 Detention 提柜起算
    const firstStorageStd = standards.find((s) => isStorageCharge(s));
    const firstDemurrageStd = standards.find(
      (s) => !isDetentionCharge(s) && !isCombinedDemurrageDetention(s) && !isStorageCharge(s)
    );
    const firstDetentionStd = standards.find((s) => isDetentionCharge(s));
    const firstCombinedStd = standards.find((s) => isCombinedDemurrageDetention(s));

    const pickMinPositiveFreeDaysStd = (
      candidates: ExtDemurrageStandard[]
    ): ExtDemurrageStandard | null => {
      const valids = candidates
        .filter((s) => Number(s.freeDays ?? 0) > 0)
        .sort((a, b) => {
          const da = Number(a.freeDays ?? 0);
          const db = Number(b.freeDays ?? 0);
          if (da !== db) return da - db;
          const sa = Number(a.sequenceNumber ?? Number.MAX_SAFE_INTEGER);
          const sb = Number(b.sequenceNumber ?? Number.MAX_SAFE_INTEGER);
          if (sa !== sb) return sa - sb;
          return Number(a.id ?? Number.MAX_SAFE_INTEGER) - Number(b.id ?? Number.MAX_SAFE_INTEGER);
        });
      return valids[0] ?? null;
    };

    const lfdNodeStd = pickMinPositiveFreeDaysStd(
      [firstStorageStd, firstDemurrageStd].filter(Boolean) as ExtDemurrageStandard[]
    );
    const lfdStd = lfdNodeStd ?? firstCombinedStd ?? null;
    const lrdStd = pickMinPositiveFreeDaysStd(
      [firstCombinedStd, firstDetentionStd].filter(Boolean) as ExtDemurrageStandard[]
    );

    // 起算日按标准计算方式（按到港/按卸船）+ 计算模式（actual/forecast）统一计算
    const resolveArrivalStartDate = (
      calcBasisRaw: string | undefined | null
    ): { date: Date | null; source: string | null } => {
      const calcBasis = (calcBasisRaw ?? '').toLowerCase();
      const useDischargeOnly = calcBasis.includes('卸船');

      if (useDischargeOnly) {
        if (calculationMode === 'actual') {
          const date = params.calculationDates.dischargeDate ?? null;
          return {
            date,
            source: date ? (params.calculationDates.dischargeDateSource ?? 'discharged_time') : null
          };
        }
        const date =
          params.calculationDates.dischargeDate ??
          params.calculationDates.revisedEtaDestPort ??
          params.calculationDates.etaDestPort ??
          null;
        const source = params.calculationDates.dischargeDate
          ? (params.calculationDates.dischargeDateSource ?? 'discharged_time')
          : params.calculationDates.revisedEtaDestPort
            ? 'revised_eta'
            : params.calculationDates.etaDestPort
              ? 'eta'
              : null;
        return { date, source };
      }

      if (calculationMode === 'actual') {
        const date =
          params.calculationDates.ataDestPort ?? params.calculationDates.dischargeDate ?? null;
        const source = params.calculationDates.ataDestPort
          ? 'ata'
          : params.calculationDates.dischargeDate
            ? (params.calculationDates.dischargeDateSource ?? 'discharged_time')
            : null;
        return { date, source };
      }

      const date =
        params.calculationDates.ataDestPort ??
        params.calculationDates.dischargeDate ??
        params.calculationDates.revisedEtaDestPort ??
        params.calculationDates.etaDestPort ??
        null;
      const source = params.calculationDates.ataDestPort
        ? 'ata'
        : params.calculationDates.dischargeDate
          ? 'dest_port_unload_date'
          : params.calculationDates.revisedEtaDestPort
            ? 'revised_eta'
            : params.calculationDates.etaDestPort
              ? 'eta'
              : null;
      return { date, source };
    };

    const lfdStart = resolveArrivalStartDate(lfdStd?.calculationBasis);
    const lrdArrivalStart = resolveArrivalStartDate(lrdStd?.calculationBasis);

    let computedLastFreeDate: Date | null = null;
    const lastFreeDateMode: 'actual' | 'forecast' = calculationMode;
    if (lfdStd && lfdStart.date) {
      const freeDays = Math.max(0, lfdStd.freeDays ?? 0);
      const n = freeDays - 1;
      computedLastFreeDate = freePeriodUsesWorkingDays(lfdStd.freeDaysBasis)
        ? addWorkingDays(lfdStart.date, n)
        : addDays(lfdStart.date, n);
    }

    // LRD：Combined(D&D) 为到港→还箱整段；否则沿用 Detention 的提柜起算
    // ⭐ 三种场景完整支持：
    //   场景① forecast + 无计划提柜：从 LFD 起算
    //   场景② forecast + 有计划提柜：从计划提柜日起算
    //   场景③ actual + 有实际提柜：从实际提柜日起算
    let pickupBasisForDetention: Date | null;
    const lastReturnDateMode: 'actual' | 'forecast' = calculationMode;
    if (lrdStd && firstCombinedStd && lrdStd.id === firstCombinedStd.id) {
      // Combined D&D: 从到港日起算
      pickupBasisForDetention = lrdArrivalStart.date;
    } else {
      // 普通滞箱费：三种场景
      if (calculationMode === 'actual') {
        // ③ actual 模式：使用实际提柜日
        pickupBasisForDetention = params.calculationDates.pickupDateActual ?? null;
      } else {
        // forecast 模式
        if (params.calculationDates.plannedPickupDate) {
          // ② 有计划提柜日：使用计划提柜日
          pickupBasisForDetention = params.calculationDates.plannedPickupDate;
        } else if (computedLastFreeDate) {
          // ① 无计划提柜日：使用 LFD 作为 fallback
          pickupBasisForDetention = computedLastFreeDate;
        } else {
          // 都没有：无法计算
          pickupBasisForDetention = null;
        }
      }
    }

    let computedLastReturnDate: Date | null = null;
    if (lrdStd && pickupBasisForDetention) {
      const freeDays = Math.max(0, lrdStd.freeDays ?? 0);
      const n = freeDays - 1;
      computedLastReturnDate = freePeriodUsesWorkingDays(lrdStd.freeDaysBasis)
        ? addWorkingDays(pickupBasisForDetention, n)
        : addDays(pickupBasisForDetention, n);
    }

    // 2. 最晚提柜日：优先用本次计算值（与基础日期一致）
    const pickupDate = computedLastFreeDate ?? params.calculationDates.lastPickupDate;
    const lastReturnDate = params.calculationDates.lastReturnDate ?? computedLastReturnDate ?? null;

    // 滞箱费（Detention）截止日：
    // ① forecast（未到港/无 ATA、无卸船）：max(今天, 计划还箱日)；无计划还箱日则用今天
    // ② actual（已到港或已卸船）：有实际还箱日用还箱日；无则用今天
    let detentionEndDate: Date;
    let detentionEndDateSource: string;
    let detentionStartDate: Date | null;
    let detentionStartDateSource: string | null;
    if (calculationMode === 'forecast') {
      const plannedReturnDate = params.calculationDates.plannedReturnDate;
      detentionEndDate = plannedReturnDate ? maxDate(today, plannedReturnDate) : today;
      detentionEndDateSource = plannedReturnDate
        ? 'max(当前日期, process_empty_return.planned_return_date)'
        : '当前日期';
      // forecast模式：起算日 = 计划提柜日
      detentionStartDate = params.calculationDates.plannedPickupDate ?? null;
      detentionStartDateSource = params.calculationDates.plannedPickupDate
        ? 'process_trucking_transport.planned_pickup_date'
        : null;
    } else {
      // actual模式：起算日 = 实际提柜日，截止日 = 实际还箱日 或今天
      detentionEndDate = params.calculationDates.returnTime ?? today;
      detentionEndDateSource = params.calculationDates.returnTime
        ? 'process_empty_return.return_time'
        : '当前日期';
      detentionStartDate = params.calculationDates.pickupDateActual ?? null;
      detentionStartDateSource = params.calculationDates.pickupDateActual
        ? 'process_trucking_transport.pickup_date'
        : null;
    }

    // 3. 更新 params 用于后续计算（lastReturnDate 优先级：DB > 计算）
    // 滞港费截止日见 demurragePortEndDate（forecast：max(今天,计划提柜)；actual：实际提柜或今天）
    const enhancedParams = {
      ...params,
      endDate: demurragePortEndDate,
      endDateSource: demurragePortEndDateSource,
      detentionStartDate: detentionStartDate ? toDateOnly(detentionStartDate) : null,
      detentionEndDate: toDateOnly(detentionEndDate),
      detentionStartDateSource,
      detentionEndDateSource,
      calculationDates: {
        ...params.calculationDates,
        lastPickupDate: pickupDate
          ? toDateOnly(pickupDate)
          : params.calculationDates.lastPickupDate,
        lastPickupDateComputed: computedLastFreeDate ? toDateOnly(computedLastFreeDate) : null,
        lastPickupDateMode: pickupDate === computedLastFreeDate ? lastFreeDateMode : undefined,
        lastReturnDate: lastReturnDate ? toDateOnly(lastReturnDate) : null,
        lastReturnDateComputed: computedLastReturnDate ? toDateOnly(computedLastReturnDate) : null,
        lastReturnDateMode: computedLastReturnDate ? lastReturnDateMode : undefined
      }
    };

    const items: DemurrageItemResult[] = [];
    const skippedItems: DemurrageSkippedItem[] = [];
    let totalAmount = 0;
    // 获取销往国家对应的货币（默认值）
    const defaultCurrency = (await this.getContainerCurrency(containerNumber)) || 'USD';
    let currency = defaultCurrency;

    const pickupDateActual = pickupDateActualEarly;
    for (const std of standards) {
      const isDetention = isDetentionCharge(std);
      const isCombined = isCombinedDemurrageDetention(std);
      const isStorage = isStorageCharge(std);
      /** 堆存：全局 actual，或 forecast 但已有 ATA/实际卸船（按标准）→ 按实际区间计费 */
      let storageUsesActualInterval = false;
      if (isStorage) {
        const basisStorage = (std.calculationBasis ?? '').toLowerCase();
        const useDischargeStorage = basisStorage.includes('卸船');
        const hasStorageActualStart = useDischargeStorage
          ? !!params.calculationDates.dischargeDate
          : !!(params.calculationDates.ataDestPort ?? params.calculationDates.dischargeDate);
        storageUsesActualInterval =
          calculationMode === 'actual' || (calculationMode === 'forecast' && hasStorageActualStart);
      }
      // 滞箱费：actual 需实际提柜；forecast 需计划提柜
      if (isDetention) {
        if (calculationMode === 'actual' && !pickupDateActual) {
          skippedItems.push({
            standardId: std.id,
            chargeName: std.chargeName ?? 'Detention',
            chargeTypeCode: std.chargeTypeCode ?? '',
            reasonCode: 'missing_pickup_date_actual',
            reason: '缺少实际提柜日（pickup_date），该费用项暂不计算'
          });
          continue;
        }
        if (calculationMode === 'forecast' && !plannedPickupDate) {
          skippedItems.push({
            standardId: std.id,
            chargeName: std.chargeName ?? 'Detention',
            chargeTypeCode: std.chargeTypeCode ?? '',
            reasonCode: 'missing_planned_pickup_date',
            reason: '缺少计划提柜日（planned_pickup_date），该费用项暂不计算'
          });
          continue;
        }
      }
      // 堆存费：按实际区间时需 ATA 或卸船日；纯预测区间需计划提柜 + 修正ETA/ETA
      if (isStorage) {
        const basisStorage = (std.calculationBasis ?? '').toLowerCase();
        const useDischargeStorage = basisStorage.includes('卸船');
        const hasStorageActualStart = useDischargeStorage
          ? !!params.calculationDates.dischargeDate
          : !!(params.calculationDates.ataDestPort ?? params.calculationDates.dischargeDate);
        if (storageUsesActualInterval) {
          if (!hasStorageActualStart) {
            skippedItems.push({
              standardId: std.id,
              chargeName: std.chargeName ?? 'Storage',
              chargeTypeCode: std.chargeTypeCode ?? '',
              reasonCode: 'missing_arrival_storage_actual',
              reason: '堆存(实际口径)需目的港ATA或卸船日（按标准「按卸船」时仅需卸船日）'
            });
            continue;
          }
        } else {
          if (!plannedPickupDate) {
            skippedItems.push({
              standardId: std.id,
              chargeName: std.chargeName ?? 'Storage',
              chargeTypeCode: std.chargeTypeCode ?? '',
              reasonCode: 'missing_planned_pickup_date',
              reason: '堆存(预测)需计划提柜日（planned_pickup_date）'
            });
            continue;
          }
          const etaStorageStart =
            params.calculationDates.revisedEtaDestPort ?? params.calculationDates.etaDestPort;
          if (!etaStorageStart) {
            skippedItems.push({
              standardId: std.id,
              chargeName: std.chargeName ?? 'Storage',
              chargeTypeCode: std.chargeTypeCode ?? '',
              reasonCode: 'missing_eta_storage_forecast',
              reason: '堆存(预测)需目的港修正ETA或ETA'
            });
            continue;
          }
        }
      }
      if (isCombined) {
        if (calculationMode === 'forecast') {
          const etaCombinedStart =
            params.calculationDates.revisedEtaDestPort ?? params.calculationDates.etaDestPort;
          if (!etaCombinedStart) {
            skippedItems.push({
              standardId: std.id,
              chargeName: std.chargeName ?? 'Demurrage & Detention',
              chargeTypeCode: std.chargeTypeCode ?? '',
              reasonCode: 'missing_eta_combined_forecast',
              reason: '合并(D&D)预测模式需目的港修正ETA或ETA'
            });
            continue;
          }
        } else {
          const basisSkip = (std.calculationBasis ?? '').toLowerCase();
          const useDischargeOnlySkip = basisSkip.includes('卸船');
          const hasCombinedActualStart = useDischargeOnlySkip
            ? !!params.calculationDates.dischargeDate
            : !!(params.calculationDates.ataDestPort || params.calculationDates.dischargeDate);
          if (!hasCombinedActualStart) {
            skippedItems.push({
              standardId: std.id,
              chargeName: std.chargeName ?? 'Demurrage & Detention',
              chargeTypeCode: std.chargeTypeCode ?? '',
              reasonCode: 'missing_arrival_for_combined_actual',
              reason: '合并(D&D)实际模式需目的港ATA或卸船日（按标准「按卸船」时仅需卸船日）'
            });
            continue;
          }
        }
      }

      // 滞港费：起算日按 ATA/卸船与「计算方式」；滞箱：起算日见 enhancedParams.detention*；堆存单独在下方区间处理
      let demurrageStartForStd: Date | null = null;
      let demurrageStartSource: string | null = null;

      if (isDetention) {
        demurrageStartForStd = enhancedParams.detentionStartDate;
        demurrageStartSource = enhancedParams.detentionStartDateSource;
      } else if (!isCombined) {
        // 滞港费：按计算模式和计算方式确定起算日
        const basis = (std.calculationBasis ?? '').toLowerCase();
        const useDischargeOnly = basis.includes('卸船');

        if (useDischargeOnly) {
          // 按卸船
          demurrageStartForStd = params.calculationDates.dischargeDate ?? null;
          demurrageStartSource = demurrageStartForStd
            ? (params.calculationDates.dischargeDateSource ?? 'discharged_time')
            : null;
        } else {
          // 按到港
          if (calculationMode === 'actual') {
            // actual模式：只用实际时间
            demurrageStartForStd =
              params.calculationDates.ataDestPort ?? params.calculationDates.dischargeDate ?? null;
            demurrageStartSource = params.calculationDates.ataDestPort
              ? 'ata'
              : params.calculationDates.dischargeDate
                ? (params.calculationDates.dischargeDateSource ?? 'discharged_time')
                : null;
          } else {
            // forecast模式：包含ETA
            demurrageStartForStd =
              params.calculationDates.ataDestPort ??
              params.calculationDates.dischargeDate ??
              params.calculationDates.revisedEtaDestPort ??
              params.calculationDates.etaDestPort ??
              null;
            if (params.calculationDates.ataDestPort) {
              demurrageStartSource = 'ata';
            } else if (params.calculationDates.dischargeDate) {
              demurrageStartSource =
                params.calculationDates.dischargeDateSource ?? 'discharged_time';
            } else if (params.calculationDates.revisedEtaDestPort) {
              demurrageStartSource = 'revised_eta';
            } else if (params.calculationDates.etaDestPort) {
              demurrageStartSource = 'eta';
            } else {
              demurrageStartSource = null;
            }
          }
        }
      }

      // 区间：滞箱 = 计划或实际提柜 → 计划或实际还箱；堆存 = 无 ATA 时 forecast(ETA→max(计划提柜,今天))，有 ATA/卸船则按 actual(ATA|卸船→提柜|今天)；滞港 = 到港/卸船/ETA → 提柜截止；合并(D&D) 见下
      let rangeStart: Date | null;
      let rangeEnd: Date | null;
      let itemStartSource: string | null = null;
      let itemEndSource: string | null = null;

      if (isCombined) {
        if (calculationMode === 'forecast') {
          rangeStart =
            params.calculationDates.revisedEtaDestPort ??
            params.calculationDates.etaDestPort ??
            null;
          itemStartSource = params.calculationDates.revisedEtaDestPort
            ? 'revised_eta'
            : params.calculationDates.etaDestPort
              ? 'eta'
              : null;
          rangeEnd = enhancedParams.detentionEndDate;
          itemEndSource = enhancedParams.detentionEndDateSource ?? null;
        } else {
          const basisComb = (std.calculationBasis ?? '').toLowerCase();
          const useDischargeComb = basisComb.includes('卸船');
          if (useDischargeComb) {
            rangeStart = params.calculationDates.dischargeDate ?? null;
            itemStartSource = rangeStart
              ? (params.calculationDates.dischargeDateSource ?? 'discharged_time')
              : null;
          } else {
            rangeStart =
              params.calculationDates.ataDestPort ?? params.calculationDates.dischargeDate ?? null;
            itemStartSource = params.calculationDates.ataDestPort
              ? 'ata'
              : params.calculationDates.dischargeDate
                ? (params.calculationDates.dischargeDateSource ?? 'discharged_time')
                : null;
          }
          rangeEnd = enhancedParams.detentionEndDate;
          itemEndSource = enhancedParams.detentionEndDateSource ?? null;
        }
      } else if (isStorage) {
        if (storageUsesActualInterval) {
          const basisStorage = (std.calculationBasis ?? '').toLowerCase();
          const useDischargeStorage = basisStorage.includes('卸船');
          if (useDischargeStorage) {
            rangeStart = params.calculationDates.dischargeDate ?? null;
            itemStartSource = rangeStart
              ? (params.calculationDates.dischargeDateSource ?? 'discharged_time')
              : null;
          } else {
            rangeStart =
              params.calculationDates.ataDestPort ?? params.calculationDates.dischargeDate ?? null;
            itemStartSource = params.calculationDates.ataDestPort
              ? 'ata'
              : params.calculationDates.dischargeDate
                ? (params.calculationDates.dischargeDateSource ?? 'discharged_time')
                : null;
          }
          rangeEnd = pickupDateActual ? toDateOnly(pickupDateActual) : toDateOnly(today);
          itemEndSource = pickupDateActual ? 'process_trucking_transport.pickup_date' : '当前日期';
        } else {
          rangeStart =
            params.calculationDates.revisedEtaDestPort ??
            params.calculationDates.etaDestPort ??
            null;
          itemStartSource = params.calculationDates.revisedEtaDestPort
            ? 'revised_eta'
            : params.calculationDates.etaDestPort
              ? 'eta'
              : null;
          rangeEnd = maxDate(toDateOnly(plannedPickupDate!), toDateOnly(today));
          itemEndSource = 'max(计划提柜日，当前日期)';
        }
      } else if (isDetention) {
        rangeStart = enhancedParams.detentionStartDate;
        rangeEnd = enhancedParams.detentionEndDate;
        itemStartSource = enhancedParams.detentionStartDateSource ?? null;
        itemEndSource = enhancedParams.detentionEndDateSource ?? null;
      } else {
        rangeStart = demurrageStartForStd;
        rangeEnd = enhancedParams.endDate;
        itemStartSource = demurrageStartSource;
        itemEndSource = enhancedParams.endDateSource ?? null;
      }

      if (!rangeStart || !rangeEnd) {
        continue;
      }

      const freeDays = std.freeDays ?? 0;
      const ratePerDay = Number(std.ratePerDay ?? 0);
      const tiers =
        normalizeTiers(std.tiers) ??
        (Array.isArray(std.tiers) ? (std.tiers as DemurrageTierDto[]) : null);
      // 货币优先级：滞港费标准配置的货币 > 销往国家货币 > USD 兜底
      const standardCurrency = std.currency ?? null;
      const curr = standardCurrency || defaultCurrency || 'USD';
      currency = curr;

      const {
        lastFreeDate,
        chargeDays,
        totalAmount: amount,
        tierBreakdown
      } = calculateSingleDemurrage(
        rangeStart,
        rangeEnd,
        freeDays,
        ratePerDay,
        tiers,
        curr,
        std.freeDaysBasis
      );

      // ✅ 调试日志：查看费用计算详情
      if (chargeDays > 0) {
        logger.info(`[Demurrage] Cost calculation for ${containerNumber}:`, {
          chargeName: std.chargeName,
          chargeTypeCode: std.chargeTypeCode,
          rangeStart,
          rangeEnd,
          freeDays,
          ratePerDay,
          chargeDays,
          amount,
          tierBreakdown
        });
      }

      // 确定起算日和截止日的模式（堆存在全局 forecast 但已有 ATA 时用 actual 子模式）
      const startDateMode = isCombined
        ? calculationMode === 'forecast'
          ? 'forecast'
          : 'actual'
        : isStorage
          ? storageUsesActualInterval
            ? 'actual'
            : 'forecast'
          : isDetention
            ? calculationMode === 'forecast'
              ? 'forecast'
              : 'actual'
            : demurrageStartSource?.includes('eta')
              ? 'forecast'
              : 'actual';
      const endDateMode = isCombined
        ? calculationMode === 'forecast'
          ? 'forecast'
          : 'actual'
        : isStorage
          ? storageUsesActualInterval
            ? 'actual'
            : 'forecast'
          : isDetention
            ? calculationMode === 'forecast'
              ? 'forecast'
              : 'actual'
            : calculationMode === 'forecast'
              ? 'forecast'
              : enhancedParams.endDateSource === '当前日期'
                ? 'actual'
                : startDateMode;

      items.push({
        standardId: std.id,
        chargeName: std.chargeName ?? (isCombined ? 'Demurrage & Detention' : '滞港费'),
        chargeTypeCode: std.chargeTypeCode ?? '',
        freeDays,
        freeDaysBasis: std.freeDaysBasis ?? undefined,
        calculationBasis: std.calculationBasis ?? undefined,
        calculationMode,
        startDate: rangeStart,
        endDate: rangeEnd,
        startDateSource: itemStartSource,
        endDateSource: itemEndSource,
        startDateMode,
        endDateMode,
        lastFreeDate,
        lastFreeDateMode: isCombined
          ? calculationMode
          : isStorage
            ? storageUsesActualInterval
              ? 'actual'
              : 'forecast'
            : isDetention
              ? calculationMode
              : lastFreeDateMode,
        chargeDays,
        amount,
        currency: curr,
        destinationPortCode: params.matchParams?.destinationPortCode ?? undefined,
        tierBreakdown
      });
      totalAmount += amount;
    }

    if (items.length === 0) {
      // 仅有 ETA 无 ATA/卸船，且标准需卸船日 → 视为未到港
      const hasAtaOrDischarge =
        !!params.calculationDates.ataDestPort || !!params.calculationDates.dischargeDate;
      const hasPickupDateActual = !!params.calculationDates.pickupDateActual;
      if (!hasAtaOrDischarge) {
        const message = hasPickupDateActual
          ? '已有实际提柜，但缺少到港/卸船日起算日，无法计算滞港费'
          : '还未到达目的港，滞港费暂不用计算';
        return {
          result: null,
          message,
          reason: hasPickupDateActual ? 'missing_arrival_dates' : 'no_arrival_at_dest'
        };
      }
      // 匹配到的标准因缺关键日期被跳过：按 reason 给出更明确的提示
      if (skippedItems.length > 0) {
        const onlyPickup = skippedItems.every((s) => s.reasonCode === 'missing_pickup_date_actual');
        const onlyPlanned = skippedItems.every(
          (s) => s.reasonCode === 'missing_planned_pickup_date'
        );
        const onlyEtaCombined = skippedItems.every(
          (s) => s.reasonCode === 'missing_eta_combined_forecast'
        );
        const onlyArrivalCombined = skippedItems.every(
          (s) => s.reasonCode === 'missing_arrival_for_combined_actual'
        );
        if (onlyPickup) {
          return {
            result: null,
            message:
              '堆存、滞箱类费用需维护实际提柜日（拖卡运输 pickup_date）。最晚提柜日录入不能代替实际提柜日。',
            reason: 'missing_pickup_date_actual'
          };
        }
        if (onlyPlanned) {
          return {
            result: null,
            message:
              '预测模式下滞箱/堆存需维护计划提柜日（process_trucking_transport.planned_pickup_date）。',
            reason: 'missing_planned_pickup_date'
          };
        }
        if (onlyEtaCombined) {
          return {
            result: null,
            message: skippedItems[0].reason,
            reason: 'missing_eta_combined_forecast'
          };
        }
        if (onlyArrivalCombined) {
          return {
            result: null,
            message: skippedItems[0].reason,
            reason: 'missing_arrival_for_combined_actual'
          };
        }
      }
      return {
        result: null,
        message: '缺少起算日或截止日，无法计算',
        reason: 'missing_dates'
      };
    }

    // 4. 写回：须 await；freeDateWriteMode=none 时跳过（单条「免费日更新」已单独写回）
    const freeDateWriteMode = options?.freeDateWriteMode ?? 'batch';
    let writeBack: { lastFreeDateWritten: boolean; lastReturnDateWritten: boolean } = {
      lastFreeDateWritten: false,
      lastReturnDateWritten: false
    };
    if (freeDateWriteMode !== 'none') {
      try {
        writeBack = await this.writeBackComputedDatesIfNeeded(
          containerNumber,
          params.calculationDates.pickupDateActual,
          params.calculationDates.returnTime,
          computedLastFreeDate,
          computedLastReturnDate,
          calculationMode
        );
      } catch (err) {
        logger.warn('[Demurrage] writeBackComputedDates failed:', err);
      }
    }

    const primaryStart = enhancedParams.startDate ?? enhancedParams.detentionStartDate;
    const primaryEnd = enhancedParams.endDate ?? enhancedParams.detentionEndDate;
    const primaryStartSource =
      enhancedParams.startDateSource ?? enhancedParams.detentionStartDateSource;
    const primaryEndSource = enhancedParams.endDateSource ?? enhancedParams.detentionEndDateSource;

    const formatDateForApi = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
    const calcDates = enhancedParams.calculationDates;
    type CalcDatesExt = typeof calcDates & {
      plannedPickupDate?: Date | null;
      plannedReturnDate?: Date | null;
      lastPickupDateComputed?: Date | null;
      lastReturnDateComputed?: Date | null;
      shipmentDate?: Date | null;
    };
    const cd = calcDates as CalcDatesExt;

    const result: DemurrageCalculationResult = {
      containerNumber,
      calculationMode, // 增加计算模式标注
      startDate: (primaryStart ?? items[0]?.startDate) as Date,
      endDate: (primaryEnd ?? items[0]?.endDate) as Date,
      startDateSource: primaryStartSource,
      endDateSource: primaryEndSource,
      calculationDates: {
        ataDestPort: formatDateForApi(calcDates.ataDestPort),
        etaDestPort: formatDateForApi(calcDates.etaDestPort),
        revisedEtaDestPort: formatDateForApi(calcDates.revisedEtaDestPort),
        dischargeDate: formatDateForApi(calcDates.dischargeDate),
        lastPickupDate: formatDateForApi(calcDates.lastPickupDate),
        plannedPickupDate: formatDateForApi(cd.plannedPickupDate ?? null),
        lastPickupDateComputed: formatDateForApi(cd.lastPickupDateComputed ?? null),
        lastPickupDateMode: calcDates.lastPickupDateMode,
        lastReturnDate: formatDateForApi(calcDates.lastReturnDate),
        lastReturnDateComputed: formatDateForApi(cd.lastReturnDateComputed ?? null),
        lastReturnDateMode: calcDates.lastReturnDateMode,
        pickupDateActual: formatDateForApi(calcDates.pickupDateActual),
        returnTime: formatDateForApi(calcDates.returnTime),
        plannedReturnDate: formatDateForApi(cd.plannedReturnDate ?? null),
        shipmentDate: formatDateForApi(cd.shipmentDate ?? null),
        today: formatDateForApi(calcDates.today)!
      },
      matchedStandards: standards.map((s) => ({
        id: s.id,
        chargeName: s.chargeName ?? '滞港费',
        chargeTypeCode: s.chargeTypeCode ?? '',
        foreignCompanyCode: s.foreignCompanyCode ?? undefined,
        foreignCompanyName: s.foreignCompanyName ?? undefined,
        destinationPortCode: s.destinationPortCode ?? undefined,
        destinationPortName: s.destinationPortName ?? undefined,
        shippingCompanyCode: s.shippingCompanyCode ?? undefined,
        shippingCompanyName: s.shippingCompanyName ?? undefined,
        originForwarderCode: s.originForwarderCode ?? undefined,
        originForwarderName: s.originForwarderName ?? undefined,
        freeDays: s.freeDays ?? 0,
        freeDaysBasis: s.freeDaysBasis ?? undefined,
        calculationBasis: s.calculationBasis ?? undefined,
        isChargeable: s.isChargeable ?? 'N',
        ratePerDay: s.ratePerDay != null ? Number(s.ratePerDay) : undefined,
        tiers:
          normalizeTiers(s.tiers) ??
          (Array.isArray(s.tiers) ? (s.tiers as DemurrageTierDto[]) : undefined),
        currency: s.currency ?? 'USD'
      })),
      items,
      skippedItems,
      totalAmount,
      currency,
      dateOrderWarnings: dateOrderWarnings.length > 0 ? dateOrderWarnings : undefined,
      logisticsStatusSnapshot: logisticsSnapshot
        ? {
            status: logisticsSnapshot.status,
            reason: logisticsSnapshot.reason ?? '',
            arrivedAtDestinationPort,
            currentPortType: logisticsSnapshot.currentPortType ?? null
          }
        : undefined,
      keyTimeline: buildKeyTimeline({
        containerNumber,
        calculationMode,
        arrivedAtDestinationPort,
        dateOrderWarnings: dateOrderWarnings.length > 0 ? dateOrderWarnings : undefined,
        calculationDates: {
          today: calcDates.today,
          ataDestPort: calcDates.ataDestPort,
          etaDestPort: calcDates.etaDestPort,
          revisedEtaDestPort: calcDates.revisedEtaDestPort,
          dischargeDate: calcDates.dischargeDate,
          lastPickupDate: calcDates.lastPickupDate,
          plannedPickupDate: cd.plannedPickupDate ?? null,
          lastPickupDateComputed: cd.lastPickupDateComputed ?? null,
          lastReturnDate: calcDates.lastReturnDate ?? null,
          lastReturnDateComputed: cd.lastReturnDateComputed ?? null,
          pickupDateActual: calcDates.pickupDateActual,
          returnTime: calcDates.returnTime,
          plannedReturnDate: cd.plannedReturnDate ?? null,
          shipmentDate: cd.shipmentDate ?? null
        }
      }),
      writeBack
    };
    return { result };
  }

  /**
   * 将计算结果写入 ext_demurrage_records
   * @param result 单柜计算结果
   * @param isFinal true=已还箱永久数据，false=临时数据（每日更新）
   * @param destinationPort 货柜目的港（写回时保存，高费用货柜分组时直接读取，避免二次查询）
   * @param logisticsStatus 货柜物流状态（写回时保存，高费用货柜卡片展示）
   */
  async saveCalculationToRecords(
    result: DemurrageCalculationResult,
    isFinal: boolean,
    destinationPort?: string,
    logisticsStatus?: string
  ): Promise<number> {
    if (!this.recordRepo) return 0;
    const containerNumber = result.containerNumber;
    const now = new Date();

    await this.recordRepo.delete({ containerNumber });

    let count = 0;
    for (const item of result.items) {
      const rec = this.recordRepo.create({
        containerNumber,
        destinationPort: destinationPort ?? undefined,
        logisticsStatus: logisticsStatus ?? undefined,
        chargeType: item.chargeTypeCode,
        chargeName: item.chargeName,
        freeDays: item.freeDays,
        freeDaysBasis: item.freeDaysBasis ?? undefined,
        calculationBasis: item.calculationBasis ?? undefined,
        calculationMode: item.calculationMode,
        startDateMode: item.startDateMode,
        endDateMode: item.endDateMode,
        lastFreeDateMode: item.lastFreeDateMode,
        chargeStartDate: item.startDate,
        chargeEndDate: item.endDate,
        chargeDays: item.chargeDays,
        chargeAmount: item.amount,
        currency: item.currency,
        chargeStatus: isFinal ? 'FINAL' : 'TEMP',
        isFinal,
        computedAt: now
      });
      await this.recordRepo.save(rec);
      count++;
    }
    return count;
  }

  /**
   * 批量预计算并写入记录表（每日定时任务）
   * 未还箱：临时数据（is_final=false），每次覆盖
   * 已还箱：永久数据（is_final=true），计算一次后不再更新
   */
  async batchComputeAndSaveRecords(options?: {
    shipmentStartDate?: string;
    shipmentEndDate?: string;
    limit?: number;
  }): Promise<{ computed: number; saved: number; finalized: number }> {
    const containerNumbers = await this.getContainerNumbersInDateRange(
      options?.shipmentStartDate,
      options?.shipmentEndDate
    );
    const limit = options?.limit ?? 1000;
    const toProcess = containerNumbers.slice(0, limit);

    let saved = 0;
    let finalized = 0;

    // 批量预取目的港，写回时一并保存，避免高费用货柜读取时二次查询
    const portMap = await this.getDestinationPortsForContainers(toProcess);

    for (const cn of toProcess) {
      try {
        const { result } = await this.calculateForContainer(cn);
        if (!result || result.totalAmount === 0) continue;

        const container = await this.containerRepo.findOne({ where: { containerNumber: cn } });
        const isReturnedEmpty = container?.logisticsStatus === 'returned_empty';

        if (this.recordRepo) {
          const destinationPort = portMap.get(cn) ?? undefined;
          const logisticsStatus = container?.logisticsStatus ?? undefined;
          const n = await this.saveCalculationToRecords(
            result,
            isReturnedEmpty,
            destinationPort,
            logisticsStatus
          );
          saved += n;
          if (isReturnedEmpty) finalized++;
        }
      } catch (e) {
        logger.warn(`[Demurrage] batchComputeAndSaveRecords failed for ${cn}:`, e);
      }
    }

    return { computed: toProcess.length, saved, finalized };
  }

  /**
   * 滞港费汇总统计：优先从 ext_demurrage_records 读取，无记录时回退实时计算
   * @param startDate 出运开始日期
   * @param endDate 出运结束日期
   * @param limit 最大计算柜数（默认 500，避免超时）
   */
  async getSummary(
    startDate?: string,
    endDate?: string,
    limit = 500
  ): Promise<{
    totalAmount: number;
    currency: string;
    containerCount: number;
    containerCountWithCharge: number;
    avgPerContainer: number;
    partialResults?: boolean;
    totalContainersInRange?: number;
    fromCache?: boolean;
    byPort?: Array<{ port: string; totalAmount: number; containerCount: number }>;
  }> {
    const containerNumbers = await this.getContainerNumbersInDateRange(startDate, endDate);
    const totalInRange = containerNumbers.length;

    if (this.recordRepo && containerNumbers.length > 0) {
      try {
        const fromCache = await this.getSummaryFromRecords(containerNumbers);
        if (fromCache) return fromCache;
      } catch (e) {
        logger.warn('[Demurrage] getSummaryFromRecords failed, fallback to real-time:', e);
      }
    }

    const toProcess = containerNumbers.slice(0, limit);
    const partialResults = totalInRange > limit;

    let totalAmount = 0;
    let containerCountWithCharge = 0;
    let currency = 'USD';

    for (const cn of toProcess) {
      try {
        const { result } = await this.calculateForContainer(cn);
        if (result && result.totalAmount > 0) {
          totalAmount += result.totalAmount;
          containerCountWithCharge++;
          currency = result.currency ?? currency;
        }
      } catch (e) {
        logger.warn(`[Demurrage] getSummary failed for ${cn}:`, e);
      }
    }

    const avgPerContainer =
      containerCountWithCharge > 0 ? totalAmount / containerCountWithCharge : 0;

    return {
      totalAmount,
      currency,
      containerCount: toProcess.length,
      containerCountWithCharge,
      avgPerContainer: Math.round(avgPerContainer * 100) / 100,
      ...(partialResults && {
        partialResults: true,
        totalContainersInRange: totalInRange
      }),
      byPort: [] // 实时计算路径暂无按港口分组，仅缓存路径有
    };
  }

  /**
   * 从 ext_demurrage_records 读取汇总（每柜仅保留 final 或 temp 一种，不会重复）
   * 含按港口子分组（byPort）
   */
  private async getSummaryFromRecords(containerNumbers: string[]): Promise<{
    totalAmount: number;
    currency: string;
    containerCount: number;
    containerCountWithCharge: number;
    avgPerContainer: number;
    fromCache: boolean;
    byPort?: Array<{ port: string; totalAmount: number; containerCount: number }>;
  } | null> {
    if (!this.recordRepo || containerNumbers.length === 0) return null;

    const rows = await this.recordRepo
      .createQueryBuilder('r')
      .select('r.container_number', 'containerNumber')
      .addSelect('SUM(r.charge_amount)', 'total')
      .addSelect('MAX(r.currency)', 'currency')
      .where('r.container_number IN (:...containerNumbers)', { containerNumbers })
      .groupBy('r.container_number')
      .getRawMany();

    if (rows.length === 0) return null;

    let totalAmount = 0;
    let containerCountWithCharge = 0;
    let currency = 'USD';

    for (const r of rows) {
      const total = Number(r.total ?? 0);
      if (total > 0) {
        totalAmount += total;
        containerCountWithCharge++;
        currency = r.currency ?? currency;
      }
    }

    const avgPerContainer =
      containerCountWithCharge > 0 ? totalAmount / containerCountWithCharge : 0;

    const byPort = await this.getSummaryByPortFromRecords(containerNumbers);

    return {
      totalAmount,
      currency,
      containerCount: containerNumbers.length,
      containerCountWithCharge,
      avgPerContainer: Math.round(avgPerContainer * 100) / 100,
      fromCache: true,
      byPort: byPort && byPort.length > 0 ? byPort : undefined
    };
  }

  /**
   * 从 ext_demurrage_records 按港口聚合（用于 Dashboard 子分组）
   */
  private async getSummaryByPortFromRecords(
    containerNumbers: string[]
  ): Promise<Array<{ port: string; totalAmount: number; containerCount: number }>> {
    if (!this.recordRepo || containerNumbers.length === 0) return [];
    try {
      const ph = containerNumbers.map((_, i) => `$${i + 1}`).join(',');
      const rows = await this.recordRepo.manager.query(
        `WITH per_container AS (
          SELECT r.container_number,
            SUM(r.charge_amount)::numeric AS total,
            COALESCE(NULLIF(TRIM(MAX(r.destination_port)), ''), '未指定目的港') AS port
          FROM ext_demurrage_records r
          WHERE r.container_number IN (${ph})
          GROUP BY r.container_number
          HAVING SUM(r.charge_amount) > 0
        )
        SELECT port, SUM(total)::numeric AS total_amount, COUNT(*)::int AS container_count
        FROM per_container
        GROUP BY port
        ORDER BY total_amount DESC`,
        containerNumbers
      );
      return (rows || []).map(
        (r: { port: string; total_amount: number; container_count: number }) => ({
          port: String(r.port ?? '未指定目的港'),
          totalAmount: Number(r.total_amount ?? 0),
          containerCount: Number(r.container_count ?? 0)
        })
      );
    } catch (e) {
      logger.warn('[Demurrage] getSummaryByPortFromRecords failed:', e);
      return [];
    }
  }

  /**
   * 高费用货柜 Top N：优先从记录表读取，无则实时计算
   */
  async getTopContainers(
    startDate?: string,
    endDate?: string,
    topN = 10
  ): Promise<{
    items: Array<{
      containerNumber: string;
      totalAmount: number;
      currency: string;
      chargeDays: number;
      lastFreeDate: string | null;
      destinationPort?: string;
      logisticsStatus?: string;
    }>;
    partialResults?: boolean;
    totalContainersInRange?: number;
    fromCache?: boolean;
  }> {
    const containerNumbers = await this.getContainerNumbersInDateRange(startDate, endDate);
    const totalInRange = containerNumbers.length;

    if (this.recordRepo && containerNumbers.length > 0) {
      try {
        const fromCache = await this.getTopContainersFromRecords(containerNumbers, topN);
        if (fromCache) return fromCache;
      } catch (e) {
        logger.warn('[Demurrage] getTopContainersFromRecords failed, fallback to real-time:', e);
      }
    }

    const limit = Math.min(200, totalInRange); // 降低上限，减少超时；优先依赖缓存
    const toProcess = containerNumbers.slice(0, limit);
    const partialResults = totalInRange > limit;

    const results: Array<{
      containerNumber: string;
      totalAmount: number;
      currency: string;
      chargeDays: number;
      lastFreeDate: string | null;
      destinationPort?: string;
      logisticsStatus?: string;
    }> = [];

    // 并发计算（每批 10 个），减少串行等待
    const CONCURRENCY = 10;
    for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
      const batch = toProcess.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map(async (cn) => {
          try {
            const { result } = await this.calculateForContainer(cn);
            if (result && result.totalAmount > 0) {
              const chargeDays = result.items.reduce((sum, it) => sum + it.chargeDays, 0);
              return {
                containerNumber: result.containerNumber,
                totalAmount: result.totalAmount,
                currency: result.currency ?? 'USD',
                chargeDays,
                lastFreeDate: result.calculationDates?.lastPickupDate ?? null,
                destinationPort: undefined as string | undefined,
                logisticsStatus: undefined as string | undefined
              };
            }
          } catch (e) {
            logger.warn(`[Demurrage] getTopContainers failed for ${cn}:`, e);
          }
          return null;
        })
      );
      for (const r of batchResults) {
        if (r) results.push(r);
      }
    }

    results.sort((a, b) => b.totalAmount - a.totalAmount);
    const items = results.slice(0, topN);

    // 按货柜目的港分组、物流状态：用 container_number 匹配
    const cns = items.map((it) => it.containerNumber);
    const [portMap, statusMap] = await Promise.all([
      this.getDestinationPortsForContainers(cns),
      this.getLogisticsStatusForContainers(cns)
    ]);
    for (const it of items) {
      it.destinationPort = portMap.get(it.containerNumber) ?? undefined;
      it.logisticsStatus = statusMap.get(it.containerNumber) ?? undefined;
    }

    return {
      items,
      ...(partialResults && {
        partialResults: true,
        totalContainersInRange: totalInRange
      })
    };
  }

  /**
   * 批量获取货柜目的港（用于高费用货柜分组）
   * 来源：process_port_operations(destination) 或 process_sea_freight.port_of_discharge，优先 dict_ports.port_name
   */
  private async getDestinationPortsForContainers(
    containerNumbers: string[]
  ): Promise<Map<string, string>> {
    if (containerNumbers.length === 0) return new Map();
    const map = new Map<string, string>();
    try {
      const ph1 = containerNumbers.map((_, i) => `$${i + 1}`).join(',');
      const ph2 = containerNumbers.map((_, i) => `$${containerNumbers.length + i + 1}`).join(',');
      const rows = await this.containerRepo.query(
        `WITH dest_po AS (
          SELECT DISTINCT ON (po.container_number) po.container_number,
            COALESCE(NULLIF(TRIM(po.port_name), ''), dp.port_name, po.port_code) AS port_display
          FROM process_port_operations po
          LEFT JOIN dict_ports dp ON dp.port_code = po.port_code
          WHERE po.container_number IN (${ph1}) AND po.port_type = 'destination'
          ORDER BY po.container_number, po.port_sequence DESC
        ),
        sea_port AS (
          SELECT c.container_number,
            COALESCE(dp.port_name, sf.port_of_discharge) AS port_display
          FROM biz_containers c
          INNER JOIN process_sea_freight sf ON sf.bill_of_lading_number = c.bill_of_lading_number
          LEFT JOIN dict_ports dp ON dp.port_code = sf.port_of_discharge
          WHERE c.container_number IN (${ph2}) AND sf.port_of_discharge IS NOT NULL
        )
        SELECT COALESCE(d.container_number, s.container_number) AS container_number,
          COALESCE(d.port_display, s.port_display) AS destination_port
        FROM dest_po d
        FULL OUTER JOIN sea_port s ON s.container_number = d.container_number
        WHERE COALESCE(d.port_display, s.port_display) IS NOT NULL`,
        [...containerNumbers, ...containerNumbers]
      );
      for (const r of rows || []) {
        const cn = r.container_number;
        const port = r.destination_port;
        if (cn && port) map.set(String(cn), String(port));
      }
    } catch (e) {
      logger.warn('[Demurrage] getDestinationPortsForContainers failed:', e);
    }
    return map;
  }

  /**
   * 批量获取货柜物流状态（用于高费用货柜卡片展示，记录表无 logistics_status 时回退）
   */
  private async getLogisticsStatusForContainers(
    containerNumbers: string[]
  ): Promise<Map<string, string>> {
    if (containerNumbers.length === 0) return new Map();
    const map = new Map<string, string>();
    try {
      const containers = await this.containerRepo.find({
        where: containerNumbers.map((cn) => ({ containerNumber: cn })),
        select: ['containerNumber', 'logisticsStatus']
      });
      for (const c of containers) {
        if (c.containerNumber && c.logisticsStatus) {
          map.set(c.containerNumber, c.logisticsStatus);
        }
      }
    } catch (e) {
      logger.warn('[Demurrage] getLogisticsStatusForContainers failed:', e);
    }
    return map;
  }

  /**
   * 从 ext_demurrage_records 读取 Top N 高费用货柜
   */
  private async getTopContainersFromRecords(
    containerNumbers: string[],
    topN: number
  ): Promise<{
    items: Array<{
      containerNumber: string;
      totalAmount: number;
      currency: string;
      chargeDays: number;
      lastFreeDate: string | null;
      destinationPort?: string;
      logisticsStatus?: string;
    }>;
    fromCache: boolean;
  } | null> {
    if (!this.recordRepo || containerNumbers.length === 0) return null;

    try {
      const rows = await this.recordRepo
        .createQueryBuilder('r')
        .select('r.container_number', 'containerNumber')
        .addSelect('SUM(r.charge_amount)', 'totalAmount')
        .addSelect('COALESCE(SUM(r.charge_days), 0)', 'chargeDays')
        .addSelect('MAX(r.currency)', 'currency')
        .addSelect('MAX(r.charge_end_date)', 'chargeEndDate')
        .addSelect('MAX(r.destination_port)', 'destinationPort')
        .addSelect('MAX(r.logistics_status)', 'logisticsStatus')
        .where('r.container_number IN (:...containerNumbers)', { containerNumbers })
        .groupBy('r.container_number')
        .having('SUM(r.charge_amount) > 0')
        .orderBy('SUM(r.charge_amount)', 'DESC')
        .limit(topN)
        .getRawMany();

      if (rows.length === 0) return null;

      const cns = rows.map((r: Record<string, unknown>) =>
        String(r.containerNumber ?? r.container_number ?? '')
      );
      const missingPortCns = cns.filter(
        (cn, i) => !(rows[i]?.destinationPort ?? rows[i]?.destination_port)
      );
      const portMap =
        missingPortCns.length > 0
          ? await this.getDestinationPortsForContainers(missingPortCns)
          : new Map<string, string>();
      const missingStatusCns = cns.filter(
        (cn, i) => !(rows[i]?.logisticsStatus ?? rows[i]?.logistics_status)
      );
      const statusMap =
        missingStatusCns.length > 0
          ? await this.getLogisticsStatusForContainers(missingStatusCns)
          : new Map<string, string>();

      const items = rows.map((r: Record<string, unknown>, _i: number) => {
        const total = r.totalAmount ?? r.total_amount ?? r.totalamount ?? 0;
        const days = r.chargeDays ?? r.charge_days ?? r.chargedays ?? 0;
        const cn = String(r.containerNumber ?? r.container_number ?? '');
        const fromRecord = r.destinationPort ?? r.destination_port;
        const fromRecordStatus = r.logisticsStatus ?? r.logistics_status;
        return {
          containerNumber: cn,
          totalAmount: Number(total),
          currency: String(r.currency ?? 'USD'),
          chargeDays: Number(days),
          lastFreeDate:
            (r.chargeEndDate ?? r.charge_end_date)
              ? String(r.chargeEndDate ?? r.charge_end_date).slice(0, 10)
              : null,
          destinationPort: (fromRecord ? String(fromRecord) : portMap.get(cn)) ?? undefined,
          logisticsStatus:
            (fromRecordStatus ? String(fromRecordStatus) : statusMap.get(cn)) ?? undefined
        };
      });

      return { items, fromCache: true };
    } catch (e) {
      logger.warn('[Demurrage] getTopContainersFromRecords failed, fallback to real-time:', e);
      return null;
    }
  }

  /**
   * 按出运日期范围获取货柜号列表（与 statistics-detailed 同口径）
   * 使用 raw SQL 确保列名稳定
   */
  private async getContainerNumbersInDateRange(
    startDate?: string,
    endDate?: string
  ): Promise<string[]> {
    if (!startDate || !endDate) {
      const rows = await this.containerRepo.query(
        'SELECT DISTINCT container_number FROM biz_containers'
      );
      return (rows || [])
        .map((r: { container_number: string }) => r.container_number)
        .filter(Boolean);
    }
    const { sql, params } = getDateRangeSubqueryRaw(startDate, endDate);
    const rows = await this.containerRepo.query(sql, params);
    return (rows || [])
      .map((r: { container_number: string }) => r.container_number)
      .filter(Boolean);
  }

  /**
   * 批量写回：对「last_free_date 为空且已到目的港」「已提柜但 last_return_date 为空」的货柜计算并写回
   * @param options.limitLastFree 最晚提柜日写回批次上限，默认 100
   * @param options.limitLastReturn 最晚还箱日写回批次上限，默认 100
   */
  async batchWriteBackComputedDates(options?: {
    limitLastFree?: number;
    limitLastReturn?: number;
  }): Promise<{
    lastFreeWritten: number;
    lastReturnWritten: number;
    lastFreeProcessed: number;
    lastReturnProcessed: number;
  }> {
    const limitLastFree = options?.limitLastFree ?? 100;
    const limitLastReturn = options?.limitLastReturn ?? 100;

    let lastFreeWritten = 0;
    let lastReturnWritten = 0;

    // 1. last_free_date 写回目标集：
    //    - 已到目的港 last_free_date 为空
    //    - 未到目的港但有 ETA last_free_date 为空（forecast 写回）
    //    - 目的港有 ATA 且 last_free_date_mode='forecast'（ATA 到港后 actual 覆盖）
    const noLastFreeAtaSql = LastPickupSubqueryTemplates.NO_LAST_FREE_DATE_SUBQUERY;
    const noLastFreeEtaSql = LastPickupSubqueryTemplates.NO_LAST_FREE_DATE_WITH_ETA_SUBQUERY;
    const ataForecastSql = LastPickupSubqueryTemplates.ATA_WITH_FORECAST_LAST_FREE_SUBQUERY;
    // 兜底：目的港记录存在且 last_free_date 为空，且有到港/预计到港依据；不依赖 biz_containers.logistics_status
    const noLastFreeFallbackSql = `
      SELECT DISTINCT po.container_number
      FROM process_port_operations po
      WHERE po.port_type = 'destination'
      AND po.last_free_date IS NULL
      AND (po.ata IS NOT NULL OR po.available_time IS NOT NULL OR po.eta IS NOT NULL OR po.revised_eta IS NOT NULL)
      AND po.port_sequence = (
        SELECT MAX(po2.port_sequence)
        FROM process_port_operations po2
        WHERE po2.container_number = po.container_number
        AND po2.port_type = 'destination'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM process_empty_return er
        WHERE er.container_number = po.container_number
        AND er.return_time IS NOT NULL
      )
      AND NOT EXISTS (
        SELECT 1
        FROM process_trucking_transport tt
        WHERE tt.container_number = po.container_number
        AND tt.pickup_date IS NOT NULL
      )
    `;
    const lastFreeRows = await this.containerRepo.query(
      `(SELECT container_number FROM (${noLastFreeAtaSql}) t)
       UNION
       (${noLastFreeEtaSql})
       UNION
       (${ataForecastSql})
       UNION
       (${noLastFreeFallbackSql})
       LIMIT ${Math.max(1, limitLastFree)}`
    );
    const lastFreeNumbers = (lastFreeRows || [])
      .map((r: { container_number: string }) => r.container_number)
      .filter(Boolean);

    for (const cn of lastFreeNumbers) {
      try {
        const { result } = await this.calculateForContainer(cn);
        if (result?.writeBack?.lastFreeDateWritten) lastFreeWritten++;
      } catch (e) {
        logger.warn(`[Demurrage] batchWriteBack last_free failed for ${cn}:`, e);
      }
    }

    // 2. 已提柜但 last_return_date 为空（按提柜事实而非 biz_containers.logistics_status，避免状态滞后漏算）
    const lastReturnRows = await this.containerRepo.query(`
      SELECT DISTINCT tt.container_number
      FROM process_trucking_transport tt
      LEFT JOIN process_empty_return er ON er.container_number = tt.container_number
      WHERE (tt.pickup_date IS NOT NULL OR tt.last_pickup_date IS NOT NULL)
      AND (er.last_return_date IS NULL OR er.container_number IS NULL)
      AND NOT EXISTS (
        SELECT 1
        FROM process_empty_return er2
        WHERE er2.container_number = tt.container_number
        AND er2.return_time IS NOT NULL
      )
      LIMIT ${Math.max(1, limitLastReturn)}
    `);
    const lastReturnNumbers = (lastReturnRows || [])
      .map((r: { container_number: string }) => r.container_number)
      .filter(Boolean);

    for (const cn of lastReturnNumbers) {
      try {
        const { result } = await this.calculateForContainer(cn);
        if (result?.writeBack?.lastReturnDateWritten) lastReturnWritten++;
      } catch (e) {
        logger.warn(`[Demurrage] batchWriteBack last_return failed for ${cn}:`, e);
      }
    }

    return {
      lastFreeWritten,
      lastReturnWritten,
      lastFreeProcessed: lastFreeNumbers.length,
      lastReturnProcessed: lastReturnNumbers.length
    };
  }

  /**
   * 免费日计算逻辑（单柜纯计算入口）
   * 返回 calculateForContainer 的原始结果，供手工/定时/单条更新复用。
   */
  async calculateFreeDatesForContainer(containerNumber: string) {
    return this.calculateForContainer(containerNumber);
  }

  /**
   * 手工更新逻辑（批量）
   * 供前端“免费日更新”按钮调用。
   */
  async runManualFreeDateUpdate(options?: {
    limitLastFree?: number;
    limitLastReturn?: number;
  }): Promise<{
    lastFreeWritten: number;
    lastReturnWritten: number;
    lastFreeProcessed: number;
    lastReturnProcessed: number;
  }> {
    return this.batchWriteBackComputedDates(options);
  }

  /**
   * 定时更新逻辑（批量）
   * 供 scheduler 调用。
   */
  async runScheduledFreeDateUpdate(options?: {
    limitLastFree?: number;
    limitLastReturn?: number;
  }): Promise<{
    lastFreeWritten: number;
    lastReturnWritten: number;
    lastFreeProcessed: number;
    lastReturnProcessed: number;
  }> {
    return this.batchWriteBackComputedDates(options);
  }

  /**
   * 单条货柜「免费日更新」：写回规则与定时/批量不同——不限制「无提柜才写 LFD / actual 才写还箱日」，
   * 按业务优先级单独计算后写库，再调用 calculateForContainer（不写回）刷新计算结果。
   */
  async runSingleContainerFreeDateUpdate(containerNumber: string): Promise<{
    containerNumber: string;
    updated: boolean;
    message: string;
    hasResult: boolean;
  }> {
    await this.normalizeOrphanLastFreeDateSource(containerNumber);
    // 关键：单条免费日更新与滞港费面板使用同一套匹配与计算结果，避免口径分叉。
    const { result, message } = await this.calculateForContainer(containerNumber, {
      freeDateWriteMode: 'none'
    });
    if (!result) {
      return {
        containerNumber,
        updated: false,
        hasResult: false,
        message: message || '未匹配到滞港费标准'
      };
    }

    const toDateOnlyFromApi = (value?: string | null): Date | null => {
      if (!value) return null;
      const d = new Date(`${value}T00:00:00.000Z`);
      return Number.isNaN(d.getTime()) ? null : toDateOnly(d);
    };
    const calcDates = result.calculationDates;
    const computedLastFreeDate = toDateOnlyFromApi(calcDates?.lastPickupDateComputed);
    const computedLastReturnDate = toDateOnlyFromApi(calcDates?.lastReturnDateComputed);

    if (!computedLastFreeDate && !computedLastReturnDate) {
      return {
        containerNumber,
        updated: false,
        hasResult: true,
        message: '已匹配标准，但本次未得到可写回的免费日'
      };
    }

    const writeBack = await this.writeBackSingleContainerFreeDates(
      containerNumber,
      computedLastFreeDate,
      computedLastReturnDate,
      result.calculationMode
    );

    const updated = !!(writeBack.lastFreeDateWritten || writeBack.lastReturnDateWritten);
    return {
      containerNumber,
      updated,
      hasResult: !!(result || updated),
      message: updated
        ? '更新完成'
        : result
          ? '已计算但无需写回（可能为手工维护的最晚提柜日）'
          : message || '缺少计算条件'
    };
  }

  /**
   * 预测在指定卸柜日产生的滞港费
   * @param containerNumber 柜号
   * @param proposedUnloadDate 拟安排的卸柜日
   * @returns 预估的滞港费和详细信息
   */
  async predictDemurrageForUnloadDate(
    containerNumber: string,
    proposedUnloadDate: Date
  ): Promise<{
    lastFreeDate: Date;
    proposedUnloadDate: Date;
    demurrageDays: number;
    demurrageCost: number;
    tierBreakdown: Array<{
      fromDay: number;
      toDay: number;
      days: number;
      ratePerDay: number;
      subtotal: number;
    }>;
    currency: string;
  }> {
    // 获取货柜信息
    const params = await this.getContainerMatchParams(containerNumber);

    // 确定起算日（按计算模式）
    const hasAtaOrDischarge = !!(
      params.calculationDates.ataDestPort ?? params.calculationDates.dischargeDate
    );
    const calculationMode: 'actual' | 'forecast' = hasAtaOrDischarge ? 'actual' : 'forecast';

    // 获取滞港费标准
    const standards = await this.matchStandards(containerNumber);
    if (standards.length === 0) {
      throw new Error(`No demurrage standards found for container ${containerNumber}`);
    }

    // 找到第一个非滞箱费的标准（用于计算最晚提柜日）
    const firstDemurrageStd = standards.find(
      (s) => !isDetentionCharge(s) && !isCombinedDemurrageDetention(s) && !isStorageCharge(s)
    );
    if (!firstDemurrageStd) {
      throw new Error(
        `No demurrage standard (non-detention) found for container ${containerNumber}`
      );
    }

    // 确定起算日
    const calcBasis = (firstDemurrageStd.calculationBasis ?? '').toLowerCase();
    const useDischargeOnly = calcBasis.includes('卸船');
    let demurrageStartDate: Date | null;

    if (useDischargeOnly) {
      demurrageStartDate = params.calculationDates.dischargeDate ?? null;
    } else {
      if (calculationMode === 'actual') {
        demurrageStartDate =
          params.calculationDates.ataDestPort ?? params.calculationDates.dischargeDate ?? null;
      } else {
        demurrageStartDate =
          params.calculationDates.ataDestPort ??
          params.calculationDates.dischargeDate ??
          params.calculationDates.revisedEtaDestPort ??
          params.calculationDates.etaDestPort ??
          null;
      }
    }

    if (!demurrageStartDate) {
      throw new Error(
        `No start date found for demurrage calculation for container ${containerNumber}`
      );
    }

    // 计算免费期截止日
    const freeDays = Math.max(0, firstDemurrageStd.freeDays ?? 0);
    const n = freeDays - 1;
    const lastFreeDate = freePeriodUsesWorkingDays(firstDemurrageStd.freeDaysBasis)
      ? addWorkingDays(demurrageStartDate, n)
      : addDays(demurrageStartDate, n);

    // 计算计费天数（从免费期次日到拟议卸柜日）
    const chargeStart = addDays(lastFreeDate, 1);
    const proposedUnloadDateOnly = toDateOnly(proposedUnloadDate);

    if (proposedUnloadDateOnly <= lastFreeDate) {
      // 在免费期内，无费用
      return {
        lastFreeDate,
        proposedUnloadDate,
        demurrageDays: 0,
        demurrageCost: 0,
        tierBreakdown: [],
        currency: firstDemurrageStd.currency ?? 'USD'
      };
    }

    const chargeDays = chargePeriodUsesWorkingDays(firstDemurrageStd.freeDaysBasis)
      ? workingDaysBetween(chargeStart, proposedUnloadDateOnly)
      : daysBetween(chargeStart, proposedUnloadDateOnly);

    if (chargeDays <= 0) {
      return {
        lastFreeDate,
        proposedUnloadDate,
        demurrageDays: 0,
        demurrageCost: 0,
        tierBreakdown: [],
        currency: firstDemurrageStd.currency ?? 'USD'
      };
    }

    // 计算费用
    const ratePerDay = Number(firstDemurrageStd.ratePerDay ?? 0);
    const tiers =
      normalizeTiers(firstDemurrageStd.tiers) ??
      (Array.isArray(firstDemurrageStd.tiers)
        ? (firstDemurrageStd.tiers as DemurrageTierDto[])
        : null);
    const curr = firstDemurrageStd.currency ?? 'USD';

    const { totalAmount, tierBreakdown } = calculateSingleDemurrage(
      demurrageStartDate,
      proposedUnloadDateOnly,
      freeDays,
      ratePerDay,
      tiers,
      curr,
      firstDemurrageStd.freeDaysBasis
    );

    return {
      lastFreeDate,
      proposedUnloadDate,
      demurrageDays: chargeDays,
      demurrageCost: totalAmount,
      tierBreakdown,
      currency: curr
    };
  }

  /**
   * 预测在指定还箱日产生的滞箱费
   * @param containerNumber 柜号
   * @param proposedReturnDate 拟安排的还箱日
   * @param pickupDateActual 实际提柜日（可选，不传则从数据库读取）
   * @returns 预估的滞箱费和详细信息
   */
  async predictDetentionForReturnDate(
    containerNumber: string,
    proposedReturnDate: Date,
    pickupDateActual?: Date
  ): Promise<{
    lastFreeDate: Date;
    proposedReturnDate: Date;
    detentionDays: number;
    detentionCost: number;
    tierBreakdown: Array<{
      fromDay: number;
      toDay: number;
      days: number;
      ratePerDay: number;
      subtotal: number;
    }>;
    currency: string;
  }> {
    // 获取货柜信息
    const params = await this.getContainerMatchParams(containerNumber);

    // 使用传入的实际提柜日，或从数据库读取
    const actualPickup = pickupDateActual ?? params.calculationDates.pickupDateActual;
    if (!actualPickup) {
      // 没有实际提柜日，无法计算滞箱费
      return {
        lastFreeDate: toDateOnly(new Date()),
        proposedReturnDate,
        detentionDays: 0,
        detentionCost: 0,
        tierBreakdown: [],
        currency: 'USD'
      };
    }

    // 获取滞箱费标准
    const standards = await this.matchStandards(containerNumber);
    if (standards.length === 0) {
      throw new Error(`No detention standards found for container ${containerNumber}`);
    }

    // 找到第一个滞箱费标准
    const firstDetentionStd = standards.find((s) => isDetentionCharge(s));
    if (!firstDetentionStd) {
      throw new Error(`No detention standard found for container ${containerNumber}`);
    }

    // 计算免费期截止日（从实际提柜日起算）
    const freeDays = Math.max(0, firstDetentionStd.freeDays ?? 0);
    const n = freeDays - 1;
    const lastFreeDate = freePeriodUsesWorkingDays(firstDetentionStd.freeDaysBasis)
      ? addWorkingDays(actualPickup, n)
      : addDays(actualPickup, n);

    // 计算计费天数（从免费期次日到拟议还箱日）
    const chargeStart = addDays(lastFreeDate, 1);
    const proposedReturnDateOnly = toDateOnly(proposedReturnDate);

    if (proposedReturnDateOnly <= lastFreeDate) {
      // 在免费期内，无费用
      return {
        lastFreeDate,
        proposedReturnDate,
        detentionDays: 0,
        detentionCost: 0,
        tierBreakdown: [],
        currency: firstDetentionStd.currency ?? 'USD'
      };
    }

    const chargeDays = chargePeriodUsesWorkingDays(firstDetentionStd.freeDaysBasis)
      ? workingDaysBetween(chargeStart, proposedReturnDateOnly)
      : daysBetween(chargeStart, proposedReturnDateOnly);

    if (chargeDays <= 0) {
      return {
        lastFreeDate,
        proposedReturnDate,
        detentionDays: 0,
        detentionCost: 0,
        tierBreakdown: [],
        currency: firstDetentionStd.currency ?? 'USD'
      };
    }

    // 计算费用
    const ratePerDay = Number(firstDetentionStd.ratePerDay ?? 0);
    const tiers =
      normalizeTiers(firstDetentionStd.tiers) ??
      (Array.isArray(firstDetentionStd.tiers)
        ? (firstDetentionStd.tiers as DemurrageTierDto[])
        : null);
    const curr = firstDetentionStd.currency ?? 'USD';

    const { totalAmount, tierBreakdown } = calculateSingleDemurrage(
      actualPickup,
      proposedReturnDateOnly,
      freeDays,
      ratePerDay,
      tiers,
      curr,
      firstDetentionStd.freeDaysBasis
    );

    return {
      lastFreeDate,
      proposedReturnDate,
      detentionDays: chargeDays,
      detentionCost: totalAmount,
      tierBreakdown,
      currency: curr
    };
  }

  /**
   * 单条免费日写回：不套用批量写回的前置条件（无提柜才写 LFD、actual 才写还箱日等）
   */
  private async writeBackSingleContainerFreeDates(
    containerNumber: string,
    computedLastFreeDate: Date | null,
    computedLastReturnDate: Date | null,
    lastFreeDateMode: 'actual' | 'forecast'
  ): Promise<{ lastFreeDateWritten: boolean; lastReturnDateWritten: boolean }> {
    let lastFreeDateWritten = false;
    let lastReturnDateWritten = false;

    const destPort = await this.portOpRepo.findOne({
      where: { containerNumber, portType: 'destination' },
      order: { portSequence: 'DESC' }
    });

    if (computedLastFreeDate && destPort) {
      const canOverwrite =
        !destPort.lastFreeDateSource || destPort.lastFreeDateSource === 'computed';
      if (canOverwrite) {
        await this.portOpRepo.update(
          { id: destPort.id },
          {
            lastFreeDate: computedLastFreeDate,
            lastFreeDateMode,
            lastFreeDateSource: 'computed'
          }
        );
        lastFreeDateWritten = true;
        logger.info(`[Demurrage] Single free-date write: last_free_date ${containerNumber}`);
        const tt = await this.truckingRepo.findOne({ where: { containerNumber } });
        if (tt) {
          await this.truckingRepo.update(
            { containerNumber },
            { lastPickupDate: computedLastFreeDate }
          );
          logger.info(
            `[Demurrage] Single free-date write: synced trucking last_pickup_date ${containerNumber}`
          );
        }
      } else {
        logger.info(
          `[Demurrage] Single free-date write skipped LFD for ${containerNumber} (manual source preserved)`
        );
      }
    }

    // 最晚还箱日（单条更新）：允许覆盖旧值，确保人工触发可对齐到最新计算结果
    if (computedLastReturnDate) {
      let emptyReturn = await this.emptyReturnRepo.findOne({
        where: { containerNumber }
      });
      if (!emptyReturn) {
        emptyReturn = this.emptyReturnRepo.create({
          containerNumber,
          lastReturnDate: computedLastReturnDate
        });
        await this.emptyReturnRepo.save(emptyReturn);
        lastReturnDateWritten = true;
        logger.info(
          `[Demurrage] Single free-date write: last_return_date insert ${containerNumber}`
        );
      } else {
        const shouldUpdate =
          !emptyReturn.lastReturnDate ||
          toDateOnly(emptyReturn.lastReturnDate).getTime() !==
            toDateOnly(computedLastReturnDate).getTime();
        if (shouldUpdate) {
          await this.emptyReturnRepo.update(
            { containerNumber },
            { lastReturnDate: computedLastReturnDate }
          );
          lastReturnDateWritten = true;
          logger.info(
            `[Demurrage] Single free-date write: last_return_date overwrite ${containerNumber}`
          );
        }
      }
    }

    return { lastFreeDateWritten, lastReturnDateWritten };
  }

  /**
   * 目的港 last_free_date 为空却 last_free_date_source=computed 时，将来源置空（历史「恢复自动」等会留下无效标记）
   */
  private async normalizeOrphanLastFreeDateSource(containerNumber: string): Promise<void> {
    const destPort = await this.portOpRepo.findOne({
      where: { containerNumber, portType: 'destination' },
      order: { portSequence: 'DESC' }
    });
    if (destPort && !destPort.lastFreeDate && destPort.lastFreeDateSource === 'computed') {
      await this.portOpRepo.update({ id: destPort.id }, { lastFreeDateSource: null as any });
      logger.info(
        `[Demurrage] Cleared orphan last_free_date_source=computed for ${containerNumber} (no last_free_date)`
      );
    }
  }

  /**
   * 写回计算的最晚提柜日/最晚还箱日到 DB
   * 最晚提柜日：无实际提柜日时写回；actual/forecast 均允许覆盖，并写入 last_free_date_mode 区分来源
   * forecast 每次都重新计算（ETA 变化时更新）；actual 覆盖 forecast（ATA 到港后重算）
   * 最晚还箱日：仅 actual、有实际提柜时起算；若已有实际还箱但 last_return_date 仍为空则补写
   */
  private async writeBackComputedDatesIfNeeded(
    containerNumber: string,
    pickupDateActual: Date | null,
    returnTime: Date | null,
    computedLastFreeDate: Date | null,
    computedLastReturnDate: Date | null,
    calculationMode: 'actual' | 'forecast'
  ): Promise<{ lastFreeDateWritten: boolean; lastReturnDateWritten: boolean }> {
    let lastFreeDateWritten = false;
    let lastReturnDateWritten = false;

    const destPort = await this.portOpRepo.findOne({
      where: { containerNumber, portType: 'destination' },
      order: { portSequence: 'DESC' }
    });

    // 最晚提柜日：无实际提柜日时才写回（滞港费免费期截止）
    if (!pickupDateActual && computedLastFreeDate) {
      if (destPort) {
        // 只在来源为computed或空时才写回，保留手工维护的LFD
        const canOverwrite =
          !destPort.lastFreeDateSource || destPort.lastFreeDateSource === 'computed';
        if (canOverwrite) {
          await this.portOpRepo.update(
            { id: destPort.id },
            {
              lastFreeDate: computedLastFreeDate,
              lastFreeDateMode: calculationMode,
              lastFreeDateSource: 'computed'
            }
          );
          lastFreeDateWritten = true;
          logger.info(
            `[Demurrage] Wrote back last_free_date for ${containerNumber} (${calculationMode}, computed)`
          );
          const tt = await this.truckingRepo.findOne({ where: { containerNumber } });
          if (tt) {
            await this.truckingRepo.update(
              { containerNumber },
              { lastPickupDate: computedLastFreeDate }
            );
            logger.info(
              `[Demurrage] Synced process_trucking_transport.last_pickup_date for ${containerNumber}`
            );
          }
        } else {
          logger.info(
            `[Demurrage] Skipped write back last_free_date for ${containerNumber} (manual source preserved)`
          );
        }
      }
    }

    // ⭐ 最晚还箱日（批量/定时更新）：支持所有三种场景
    //   场景① forecast + 无计划提柜：从 LFD 计算的结果
    //   场景② forecast + 有计划提柜：从计划提柜日计算的结果
    //   场景③ actual + 有实际提柜：从实际提柜日计算的结果
    if (computedLastReturnDate) {
      // ✅ 不再限制 calculationMode 和 pickupDateActual
      // 只要有计算结果就写回
      let emptyReturn = await this.emptyReturnRepo.findOne({
        where: { containerNumber }
      });
      if (!emptyReturn) {
        emptyReturn = this.emptyReturnRepo.create({
          containerNumber,
          lastReturnDate: computedLastReturnDate
        });
        await this.emptyReturnRepo.save(emptyReturn);
        lastReturnDateWritten = true;
        logger.info(`[Demurrage] Wrote back last_return_date for ${containerNumber} (insert)`);
      } else {
        // 检查是否需要更新
        const shouldUpdate =
          !emptyReturn.lastReturnDate ||
          toDateOnly(emptyReturn.lastReturnDate).getTime() !==
            toDateOnly(computedLastReturnDate).getTime();
        if (shouldUpdate) {
          await this.emptyReturnRepo.update(
            { containerNumber },
            { lastReturnDate: computedLastReturnDate }
          );
          lastReturnDateWritten = true;
          logger.info(`[Demurrage] Wrote back last_return_date for ${containerNumber}`);
        }
      }
    }

    return { lastFreeDateWritten, lastReturnDateWritten };
  }

  /**
   * 统一的总费用计算入口（所有场景复用）
   * Unified total cost calculation entry point (reused across all scenarios)
   *
   * @param containerNumber 柜号
   * @param options 可选参数
   * @param options.mode 计算模式：'actual' | 'forecast'（默认自动判断）
   * @param options.plannedDates 预测模式必需的计划日期
   * @param options.includeTransport 是否包含运输费（默认 false）
   * @param options.warehouse 仓库信息（运输费必需）
   * @param options.truckingCompany 车队信息（运输费必需）
   * @param options.unloadMode 卸柜方式（运输费必需）
   *
   * @returns 完整的费用明细和总计
   */
  /**
   * 🎯 计算总成本（支持传入计划日期）
   *
   * **用途**: 成本优化场景中，需要评估不同提柜日期的成本差异
   *
   * @param containerNumber 柜号
   * @param options 配置选项
   * @param options.plannedDates 计划日期（关键参数，用于覆盖数据库中的原计划）
   * @returns 总成本及明细
   * @since 2026-03-27 (新增 plannedDates 支持)
   */
  async calculateTotalCost(
    containerNumber: string,
    options?: {
      mode?: 'actual' | 'forecast';
      plannedDates?: {
        plannedPickupDate: Date;
        plannedUnloadDate: Date;
        plannedReturnDate: Date;
      };
      includeTransport?: boolean;
      warehouse?: Warehouse;
      truckingCompany?: TruckingCompany;
      unloadMode?: string;
    }
  ): Promise<{
    demurrageCost: number;
    detentionCost: number;
    storageCost: number;
    ddCombinedCost: number;
    transportationCost: number;
    totalCost: number;
    currency: string;
    calculationMode: 'actual' | 'forecast';
    items?: DemurrageItemResult[];
  }> {
    try {
      // 1. ✅ 修复 3: 如果传入了 plannedDates，使用临时覆盖逻辑
      if (options?.plannedDates) {
        const optionsWithPlanned = options as typeof options & {
          plannedDates: NonNullable<typeof options.plannedDates>;
        };
        return await this.calculateTotalCostWithPlannedDates(containerNumber, optionsWithPlanned);
      }

      // 2. 否则使用原有逻辑（从数据库读取计划日期）
      const demurrageResult = await this.calculateForContainer(containerNumber, {
        freeDateWriteMode: 'none'
      });

      const costs = {
        demurrageCost: 0,
        detentionCost: 0,
        storageCost: 0,
        ddCombinedCost: 0,
        transportationCost: 0,
        totalCost: 0,
        currency: 'USD',
        calculationMode: 'forecast' as 'actual' | 'forecast',
        items: [] as DemurrageItemResult[]
      };

      if (demurrageResult.result) {
        // 2. 更新计算模式
        costs.calculationMode = demurrageResult.result.calculationMode;
        costs.currency = demurrageResult.result.currency;
        costs.items = demurrageResult.result.items;

        // 3. 分类汇总各项费用
        demurrageResult.result.items.forEach((item) => {
          if (isDemurrageCharge(item)) {
            costs.demurrageCost += item.amount;
          }
          if (isDetentionCharge(item)) {
            costs.detentionCost += item.amount;
          }
          if (isStorageCharge(item)) {
            costs.storageCost += item.amount;
          }
          if (isCombinedDemurrageDetention(item)) {
            costs.ddCombinedCost += item.amount;
          }
        });
      }

      // 4. 计算运输费（如果需要）
      if (options?.includeTransport && options.warehouse && options.truckingCompany) {
        try {
          costs.transportationCost = await this.calculateTransportationCostInternal(
            containerNumber,
            options.warehouse,
            options.truckingCompany,
            options.unloadMode || 'Live load'
          );
        } catch (error) {
          logger.warn(`[Demurrage] Transportation cost calculation failed:`, error);
          costs.transportationCost = 0;
        }
      }

      // 5. 总计
      costs.totalCost =
        costs.demurrageCost +
        costs.detentionCost +
        costs.storageCost +
        costs.ddCombinedCost +
        costs.transportationCost;

      return costs;
    } catch (error) {
      logger.error(`[Demurrage] calculateTotalCost error:`, error);
      throw error;
    }
  }

  /**
   * 🎯 计算总成本（带计划日期覆盖）
   *
   * **核心逻辑**: 临时修改 calculationDates，使用传入的计划日期而非数据库中的日期
   *
   * @param containerNumber 柜号
   * @param options 配置选项（包含 plannedDates）
   * @returns 总成本及明细
   * @since 2026-03-27
   */
  private async calculateTotalCostWithPlannedDates(
    containerNumber: string,
    options: {
      mode?: 'actual' | 'forecast';
      plannedDates: {
        plannedPickupDate: Date;
        plannedUnloadDate: Date;
        plannedReturnDate: Date;
      };
      includeTransport?: boolean;
      warehouse?: Warehouse;
      truckingCompany?: TruckingCompany;
      unloadMode?: string;
    }
  ): Promise<{
    demurrageCost: number;
    detentionCost: number;
    storageCost: number;
    ddCombinedCost: number;
    transportationCost: number;
    totalCost: number;
    currency: string;
    calculationMode: 'actual' | 'forecast';
    items?: DemurrageItemResult[];
  }> {
    try {
      // 1. 先获取基础参数（包含数据库中的日期）
      const params = await this.getContainerMatchParams(containerNumber);

      // 2. ✅ 关键：临时覆盖 calculationDates 中的计划日期
      const originalPlannedPickupDate = params.calculationDates.plannedPickupDate;
      const originalPlannedReturnDate = params.calculationDates.plannedReturnDate;

      // 使用传入的计划日期（保持 Date 类型）
      params.calculationDates.plannedPickupDate = options.plannedDates.plannedPickupDate;
      params.calculationDates.plannedReturnDate = options.plannedDates.plannedReturnDate;

      logger.info(`[Demurrage] Temporarily overriding planned dates for ${containerNumber}:`, {
        originalPickup: originalPlannedPickupDate,
        newPickup: params.calculationDates.plannedPickupDate,
        originalReturn: originalPlannedReturnDate,
        newReturn: params.calculationDates.plannedReturnDate
      });

      // 3. ✅ 关键修复：调用 calculateForContainer 时传入覆盖后的 params
      const demurrageResult = await this.calculateForContainer(containerNumber, {
        freeDateWriteMode: 'none',
        paramsOverride: params // 传入覆盖后的参数
      });

      // 4. 恢复原始日期（防御性编程）
      params.calculationDates.plannedPickupDate = originalPlannedPickupDate || null;
      params.calculationDates.plannedReturnDate = originalPlannedReturnDate || null;

      const costs = {
        demurrageCost: 0,
        detentionCost: 0,
        storageCost: 0,
        ddCombinedCost: 0,
        transportationCost: 0,
        totalCost: 0,
        currency: 'USD',
        calculationMode: 'forecast' as 'actual' | 'forecast',
        items: [] as DemurrageItemResult[]
      };

      if (demurrageResult.result) {
        costs.calculationMode = demurrageResult.result.calculationMode;
        costs.currency = demurrageResult.result.currency;
        costs.items = demurrageResult.result.items;

        // 分类汇总各项费用
        demurrageResult.result.items.forEach((item) => {
          if (isDemurrageCharge(item)) {
            costs.demurrageCost += item.amount;
          }
          if (isDetentionCharge(item)) {
            costs.detentionCost += item.amount;
          }
          if (isStorageCharge(item)) {
            costs.storageCost += item.amount;
          }
          if (isCombinedDemurrageDetention(item)) {
            costs.ddCombinedCost += item.amount;
          }
        });
      }

      // 5. 计算运输费（如果需要）
      if (options?.includeTransport && options.warehouse && options.truckingCompany) {
        try {
          costs.transportationCost = await this.calculateTransportationCostInternal(
            containerNumber,
            options.warehouse,
            options.truckingCompany,
            options.unloadMode || 'Live load'
          );
        } catch (error) {
          logger.warn(`[Demurrage] Transportation cost calculation failed:`, error);
          costs.transportationCost = 0;
        }
      }

      // 6. 总计
      costs.totalCost =
        costs.demurrageCost +
        costs.detentionCost +
        costs.storageCost +
        costs.ddCombinedCost +
        costs.transportationCost;

      logger.info(
        `[Demurrage] Calculated cost for ${containerNumber} with pickup date ${options.plannedDates.plannedPickupDate.toISOString().split('T')[0]}: $${costs.totalCost.toFixed(2)}`
      );

      return costs;
    } catch (error) {
      logger.error(`[Demurrage] calculateTotalCostWithPlannedDates error:`, error);
      throw error;
    }
  }

  /**
   * 计算运输费（内部方法，供 calculateTotalCost 调用）
   * Calculate transportation cost (internal method for calculateTotalCost)
   */
  private async calculateTransportationCostInternal(
    containerNumber: string,
    warehouse: Warehouse,
    truckingCompany: TruckingCompany,
    unloadMode: string
  ): Promise<number> {
    try {
      // 从 dict_warehouse_trucking_mapping 获取基础运费
      const warehouseTruckingMappingRepo =
        this.containerRepo.manager.getRepository(WarehouseTruckingMapping);
      const warehouseTruckingMapping = await warehouseTruckingMappingRepo.findOne({
        where: {
          country: warehouse.country || 'US',
          warehouseCode: warehouse.warehouseCode,
          truckingCompanyId: truckingCompany.companyCode,
          isActive: true
        }
      });

      let transportFee = warehouseTruckingMapping?.transportFee || 100; // 默认 $100
      // ✅ 关键修复：TypeORM 的 decimal 类型返回字符串，需要显式转换为数字
      transportFee = Number(transportFee) || 100;

      // ✅ 关键修复：Drop off 模式下，只有实际使用了堆场（提 < 送）才翻倍
      if (unloadMode === 'Drop off') {
        // 需要获取实际的提柜日和送仓日来判断是否使用了堆场
        const actuallyUsedYard = await this.checkIfActuallyUsedYard(
          containerNumber,
          warehouse,
          truckingCompany
        );

        if (actuallyUsedYard) {
          // ✅ 实际使用了堆场（提 < 送），需要两次运输，费用翻倍
          const dropoffMultiplier = await this.getDropoffMultiplier();
          transportFee *= dropoffMultiplier;
          logger.debug(
            `[Demurrage] Drop off mode (used yard): transportFee=${transportFee}, multiplier=${dropoffMultiplier}`
          );
        } else {
          // ✅ 未使用堆场（提 = 送），只运输一次，不翻倍
          logger.debug(
            `[Demurrage] Drop off mode (direct delivery): transportFee=${transportFee}, no multiplier`
          );
        }
      }

      return transportFee;
    } catch (error) {
      logger.warn(`[Demurrage] calculateTransportationCostInternal error:`, error);
      return 0;
    }
  }

  /**
   * 从配置表读取 Drop off 模式运费倍数
   * @returns Drop off 模式倍数，默认 2.0
   */
  private async getDropoffMultiplier(): Promise<number> {
    try {
      const configRepo = this.containerRepo.manager.getRepository(DictSchedulingConfig);
      const config = await configRepo.findOne({
        where: { configKey: 'transport_dropoff_multiplier' }
      });
      const multiplier = config ? parseFloat(config.configValue || '2.0') : 2.0;
      return isNaN(multiplier) ? 2.0 : multiplier;
    } catch (error) {
      logger.warn('[Demurrage] Failed to read transport_dropoff_multiplier config:', error);
      return 2.0; // 默认 2.0（两次运输）
    }
  }

  /**
   * 检查 Drop off 模式下是否实际使用了堆场
   * 判断标准：提柜日 < 送仓日
   * @returns true=实际使用了堆场，false=直接送仓
   */
  private async checkIfActuallyUsedYard(
    containerNumber: string,
    warehouse: Warehouse,
    truckingCompany: TruckingCompany
  ): Promise<boolean> {
    try {
      // 从 TruckingTransport 表获取提柜日和送仓日
      const truckingTransportRepo = this.containerRepo.manager.getRepository(TruckingTransport);
      const truckingTransport = await truckingTransportRepo.findOne({
        where: {
          containerNumber,
          truckingCompanyId: truckingCompany.companyCode
        },
        order: { createdAt: 'DESC' } // 获取最新的记录
      });

      if (!truckingTransport || !truckingTransport.pickupDate) {
        return false;
      }

      const pickupDate = truckingTransport.pickupDate;
      const deliveryDate = truckingTransport.deliveryDate;

      if (!deliveryDate) {
        // 还没有送仓，假设会使用堆场（保守估计）
        return true;
      }

      // 判断提柜日是否早于送仓日
      const pickupDayStr = pickupDate.toISOString().split('T')[0];
      const deliveryDayStr = deliveryDate.toISOString().split('T')[0];

      return pickupDayStr !== deliveryDayStr; // 提 < 送 = 使用了堆场
    } catch (error) {
      logger.warn('[Demurrage] checkIfActuallyUsedYard error:', error);
      return false; // 出错时假设未使用堆场
    }
  }
}

export type {
  KeyTimelineBuildInput,
  KeyTimelineMetaDto,
  KeyTimelineMilestoneKey,
  KeyTimelineNodeDto,
  KeyTimelineResult
} from './keyTimeline';
