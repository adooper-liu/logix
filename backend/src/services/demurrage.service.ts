/**
 * 滞港费计算服务
 * Demurrage Calculation Service
 *
 * 从数据库匹配滞港费标准，计算单项费用并汇总
 */

import { Repository } from 'typeorm';
import { logger } from '../utils/logger';
import { ExtDemurrageStandard } from '../entities/ExtDemurrageStandard';
import { ExtDemurrageRecord } from '../entities/ExtDemurrageRecord';
import { LastPickupSubqueryTemplates } from './statistics/LastPickupSubqueryTemplates';
import { getDateRangeSubqueryRaw } from './statistics/common/DateRangeSubquery';
import { Container } from '../entities/Container';
import { PortOperation } from '../entities/PortOperation';
import { SeaFreight } from '../entities/SeaFreight';
import { TruckingTransport } from '../entities/TruckingTransport';
import { EmptyReturn } from '../entities/EmptyReturn';
import { ReplenishmentOrder } from '../entities/ReplenishmentOrder';
import { Port } from '../entities/Port';
import { ShippingCompany } from '../entities/ShippingCompany';
import { FreightForwarder } from '../entities/FreightForwarder';
import { OverseasCompany } from '../entities/OverseasCompany';

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
  tierBreakdown: Array<{
    fromDay: number;
    toDay: number;
    days: number;
    ratePerDay: number;
    subtotal: number;
  }>;
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
    lastPickupDateComputed?: string | null;
    lastPickupDateMode?: 'actual' | 'forecast'; // 最晚提柜日计算模式
    lastReturnDate?: string | null;
    lastReturnDateComputed?: string | null;
    lastReturnDateMode?: 'actual' | 'forecast'; // 最晚还箱日计算模式
    pickupDateActual?: string | null;
    returnTime?: string | null;
    today: string;
  };
  matchedStandards: Array<{
    id: number;
    chargeName: string;
    chargeTypeCode: string;
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
  totalAmount: number;
  currency: string;
}

/** 提取日期部分（使用 UTC 避免时区导致 ±1 天偏移） */
function toDateOnly(d: Date | string): Date {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
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
  let result = new Date(start.getTime());
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

function matchCodeOrName(containerVal: string | null, stdCode: string | null, stdName: string | null): boolean {
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
        const toDay = t.toDay != null ? Number(t.toDay) : t.maxDays != null ? Number(t.maxDays) : null;
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
      while (i + 1 < entries.length && entries[i + 1].rate === rate && !entries[i + 1].isOpenEnded && entries[i + 1].day === toDay + 1) {
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
  return b.includes('工作+自然') || b.includes('natural+working') || b === '工作日' || b === 'working';
}

/** 计费期是否按工作日 */
function chargePeriodUsesWorkingDays(basis: string | null | undefined): boolean {
  const b = (basis ?? '').toLowerCase();
  return b.includes('自然+工作') || b.includes('working+natural') || b === '工作日' || b === 'working';
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
  tierBreakdown: Array<{ fromDay: number; toDay: number; days: number; ratePerDay: number; subtotal: number }>;
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
  const tierBreakdown: Array<{ fromDay: number; toDay: number; days: number; ratePerDay: number; subtotal: number }> = [];

  if (tiers && tiers.length > 0) {
    const sorted = [...tiers].sort((a, b) => a.fromDay - b.fromDay);
    let remainingDays = chargeDays;
    let currentDay = 1;

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
function isCombinedDemurrageDetention(std: { chargeTypeCode?: string | null; chargeName?: string | null }): boolean {
  const code = (std.chargeTypeCode ?? '').toUpperCase();
  const name = (std.chargeName ?? '').toLowerCase();
  const hasDem = code.includes('DEMURRAGE') || name.includes('demurrage') || name.includes('滞港');
  const hasDet = code.includes('DETENTION') || name.includes('detention') || name.includes('滞箱');
  return hasDem && hasDet;
}

/** 判断是否为纯滞箱费（Detention）标准：起算日=提柜，截止日=还箱；排除合并类型 */
function isDetentionCharge(std: { chargeTypeCode?: string | null; chargeName?: string | null }): boolean {
  if (isCombinedDemurrageDetention(std)) return false;
  const code = (std.chargeTypeCode ?? '').toUpperCase();
  const name = (std.chargeName ?? '').toLowerCase();
  return code.includes('DETENTION') || name.includes('detention') || name.includes('滞箱');
}

export class DemurrageService {
  constructor(
    private standardRepo: Repository<ExtDemurrageStandard>,
    private containerRepo: Repository<Container>,
    private portOpRepo: Repository<PortOperation>,
    private seaFreightRepo: Repository<SeaFreight>,
    private truckingRepo: Repository<TruckingTransport>,
    private emptyReturnRepo: Repository<EmptyReturn>,
    private orderRepo: Repository<ReplenishmentOrder>,
    private recordRepo?: Repository<ExtDemurrageRecord>
  ) {}

  /**
   * 获取货柜用于匹配的维度
   * @param resolve 是否将名称/非标准编码解析为字典 code（默认 true，匹配时口径统一）
   */
  private async getContainerMatchParams(containerNumber: string, resolve = true): Promise<{
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
      dischargeDateSource?: 'dest_port_unload_date' | 'discharged_time' | null;
      /** 最晚提柜日（从 process_port_operations.last_free_date 读取） */
      lastPickupDate: Date | null;
      /** 计划提柜日（从 process_trucking_transport.last_pickup_date 读取，用于预测模式前置条件） */
      plannedPickupDate: Date | null;
      lastReturnDate?: Date | null;
      pickupDateActual: Date | null;
      returnTime: Date | null;
      today: Date;
    };
    /** lastPickupDate 来源，用于展示 */
    lastPickupDateSource?: 'process_port_operations.last_free_date' | 'process_trucking_transport.last_pickup_date' | null;
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
          pickupDateActual: null,
          returnTime: null,
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
    const destinationPortCode = destPort?.portCode ?? (sf as any)?.portOfDischarge ?? null;
    const shippingCompanyCode = (sf as any)?.shippingCompanyId ?? null;
    const originForwarderCode = (sf as any)?.freightForwarderId ?? null;

    let foreignCompanyCode: string | null = null;
    const orders = (container as any).replenishmentOrders ?? [];
    if (orders?.length > 0) {
      const o = orders[0];
      const customer = (o as any).customer;
      foreignCompanyCode = customer?.overseasCompanyCode ?? (o as any).sellToCountry ?? null;
    }

    const ata = destPort?.ataDestPort ? toDateOnly(destPort.ataDestPort) : null;
    const revisedEta = destPort?.revisedEtaDestPort ? toDateOnly(destPort.revisedEtaDestPort) : null;
    const etaFromPort = destPort?.etaDestPort ? toDateOnly(destPort.etaDestPort) : null;
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
      ? 'ata_dest_port'
      : etaFromPort
        ? 'eta_dest_port'
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
    const lastPickupDate = destPort?.lastFreeDate ? toDateOnly(destPort.lastFreeDate) : null;
    // 截止日：优先使用最晚提柜日，其次使用计划提柜日（用于计算滞港费截止日）
    const pickupDate = lastPickupDate ?? plannedPickupDate;
    const lastPickupDateSource = lastPickupDate
      ? ('process_port_operations.last_free_date' as const)
      : plannedPickupDate
        ? ('process_trucking_transport.planned_pickup_date' as const)
        : null;
    const pickupDateActual =
      truckings.length > 0 && truckings[0].pickupDate
        ? toDateOnly(truckings[0].pickupDate)
        : null;
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
    const detentionEndDate = returnTime ?? today;
    // 滞箱费（Detention）必须有实际提柜日才计算，不得用最晚提柜日（last_free_date）作为回退
    const detentionStartDate = pickupDateActual ?? null;
    const detentionStartDateSource = pickupDateActual ? 'process_trucking_transport.pickup_date' : null;
    const detentionEndDateSource = returnTime ? 'process_empty_return.return_time' : '当前日期';

    const calculationDates = {
      ataDestPort: ata,
      etaDestPort: eta,
      revisedEtaDestPort: revisedEta,
      dischargeDate: discharge,
      dischargeDateSource,
      lastPickupDate: lastPickupDate, // 最晚提柜日（从 process_port_operations.last_free_date）
      plannedPickupDate: plannedPickupDate, // 计划提柜日（从 process_trucking_transport.last_pickup_date）
      lastReturnDate: lastReturnDateFromDb,
      pickupDateActual: pickupDateActual,
      returnTime: returnTime,
      today
    };

    if (resolve) {
      const resolvedPort = await this.resolveToDictCode(destinationPortCode, 'port');
      const resolvedShip = await this.resolveToDictCode(shippingCompanyCode, 'shipping');
      const resolvedFf = await this.resolveToDictCode(originForwarderCode, 'forwarder');
      const resolvedOverseas = await this.resolveToDictCode(foreignCompanyCode, 'overseas');
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
        .where('p.port_code = :v OR LOWER(TRIM(p.port_name)) = LOWER(:v) OR (p.port_name_en IS NOT NULL AND LOWER(TRIM(p.port_name_en)) = LOWER(:v))', { v })
        .getOne();
      return row?.portCode ?? v;
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
      return row?.companyCode ?? v;
    }
    if (dictType === 'forwarder') {
      const repo = manager.getRepository(FreightForwarder);
      const row = await repo
        .createQueryBuilder('f')
        .where('f.forwarder_code = :v OR LOWER(TRIM(f.forwarder_name)) = LOWER(:v) OR (f.forwarder_name_en IS NOT NULL AND LOWER(TRIM(f.forwarder_name_en)) = LOWER(:v))', { v })
        .getOne();
      return row?.forwarderCode ?? v;
    }
    if (dictType === 'overseas') {
      const repo = manager.getRepository(OverseasCompany);
      const row = await repo
        .createQueryBuilder('o')
        .where('o.company_code = :v OR LOWER(TRIM(o.company_name)) = LOWER(:v) OR (o.company_name_en IS NOT NULL AND LOWER(TRIM(o.company_name_en)) = LOWER(:v))', { v })
        .getOne();
      return row?.companyCode ?? v;
    }
    return v;
  }

  /**
   * 匹配滞港费标准（四字段 + 有效期）
   * is_chargeable = 'N' 表示收费项，参与计算；Y = 不收费跳过
   *
   * 规则：先按四字段 + 有效期匹配；若有效期无一匹配但四字段有匹配，则取四字段匹配中「最新」的标准（按 effective_date 降序取最新）
   */
  async matchStandards(containerNumber: string): Promise<ExtDemurrageStandard[]> {
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
        if (!matchCodeOrName(params.destinationPortCode, s.destinationPortCode, s.destinationPortName)) return false;
      }
      if (params.shippingCompanyCode) {
        if (!matchCodeOrName(params.shippingCompanyCode, s.shippingCompanyCode, s.shippingCompanyName)) return false;
      }
      if (params.originForwarderCode) {
        if (!matchCodeOrName(params.originForwarderCode, s.originForwarderCode, s.originForwarderName)) return false;
      }
      if (params.foreignCompanyCode) {
        if (!matchCodeOrName(params.foreignCompanyCode, s.foreignCompanyCode, s.foreignCompanyName)) return false;
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

    if (validityMatched.length > 0) return validityMatched;

    // 4. 有效期无一匹配，但四字段有匹配 → 取最新的标准（按 effective_date 降序，取最大 effective_date 的那批）
    const withEffDate = fourFieldMatched.map((s) => ({
      std: s,
      effTime: s.effectiveDate ? toDateOnly(s.effectiveDate).getTime() : 0
    }));
    const maxEffTime = Math.max(...withEffDate.map((x) => x.effTime));
    const latest = withEffDate
      .filter((x) => x.effTime === maxEffTime)
      .map((x) => x.std)
      .sort((a, b) => (a.sequenceNumber ?? 0) - (b.sequenceNumber ?? 0) || (a.id ?? 0) - (b.id ?? 0));

    return latest;
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

    const allStandards = await this.standardRepo.find({
      order: { sequenceNumber: 'ASC', id: 'ASC' }
    });

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
      if (resolvedParams.destinationPortCode && !matchCodeOrName(resolvedParams.destinationPortCode, s.destinationPortCode, s.destinationPortName))
        return false;
      if (resolvedParams.shippingCompanyCode && !matchCodeOrName(resolvedParams.shippingCompanyCode, s.shippingCompanyCode, s.shippingCompanyName))
        return false;
      if (resolvedParams.originForwarderCode && !matchCodeOrName(resolvedParams.originForwarderCode, s.originForwarderCode, s.originForwarderName))
        return false;
      if (resolvedParams.foreignCompanyCode && !matchCodeOrName(resolvedParams.foreignCompanyCode, s.foreignCompanyCode, s.foreignCompanyName))
        return false;
      return true;
    });

    const sample = afterChargeable.slice(0, 20).map((s) => {
      const reasons: string[] = [];
      if (resolvedParams.destinationPortCode && !matchCodeOrName(resolvedParams.destinationPortCode, s.destinationPortCode, s.destinationPortName))
        reasons.push(`目的港不匹配: 货柜=${resolvedParams.destinationPortCode} 标准=${s.destinationPortCode || s.destinationPortName || '(空)'}`);
      if (resolvedParams.shippingCompanyCode && !matchCodeOrName(resolvedParams.shippingCompanyCode, s.shippingCompanyCode, s.shippingCompanyName))
        reasons.push(`船公司不匹配: 货柜=${resolvedParams.shippingCompanyCode} 标准=${s.shippingCompanyCode || s.shippingCompanyName || '(空)'}`);
      if (resolvedParams.originForwarderCode && !matchCodeOrName(resolvedParams.originForwarderCode, s.originForwarderCode, s.originForwarderName))
        reasons.push(`货代不匹配: 货柜=${resolvedParams.originForwarderCode} 标准=${s.originForwarderCode || s.originForwarderName || '(空)'}`);
      if (resolvedParams.foreignCompanyCode && !matchCodeOrName(resolvedParams.foreignCompanyCode, s.foreignCompanyCode, s.foreignCompanyName))
        reasons.push(`客户/境外公司不匹配: 货柜=${resolvedParams.foreignCompanyCode} 标准=${s.foreignCompanyCode || s.foreignCompanyName || '(空)'}`);
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
        effectiveDate: s.effectiveDate ? toDateOnly(s.effectiveDate).toISOString().slice(0, 10) : null,
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
   * 最晚提柜日 = 起算日(ATA/ETA/卸船) + 免费天数（按滞港费标准）
   * 最晚还箱日 = 用箱起算日(实际提柜/计划提柜) + 免费用箱天数（按滞箱费标准）
   *
   * 计算模式自动判断：
   * - actual: 有ATA或实际卸船日 → 实际滞港费计算（只用实际时间）
   *   - 最晚还箱日使用实际提柜日计算
   * - forecast: 只有ETA → 预测/预警计算（用ETA，不写回数据库）
   *   - 最晚还箱日使用计划提柜日计算
   *
   * @returns { result, message?, reason? } 当无法计算时 result 为 null，message 为提示文案，reason 用于前端区分展示样式
   *   - no_arrival_at_dest: 未到港友好提示（预测模式下无计划提柜日）
   *   - missing_dates: 缺少必要日期（包括预测模式下未实际到港且无计划提柜日）
   *   - no_matching_standards: 未匹配到滞港费标准
   *   - missing_arrival_dates: 已有实际提柜但缺少到港/ETA/卸船日
   */
  async calculateForContainer(containerNumber: string): Promise<{
    result: DemurrageCalculationResult | null;
    message?: string;
    reason?: 'no_arrival_at_dest' | 'missing_arrival_dates' | 'no_matching_standards' | 'missing_dates';
  }> {
    const params = await this.getContainerMatchParams(containerNumber);

    // 自动判断计算模式
    const hasAtaOrDischarge = !!(
      params.calculationDates.ataDestPort ??
      params.calculationDates.dischargeDate
    );
    const calculationMode: 'actual' | 'forecast' = hasAtaOrDischarge ? 'actual' : 'forecast';

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

    // 预测模式前置条件检查：无实际到港数据且无计划提柜日时，不计算
    if (calculationMode === 'forecast' &&
        !params.calculationDates.ataDestPort &&
        !params.calculationDates.dischargeDate &&
        !params.calculationDates.plannedPickupDate) {  // ✅ 检查计划提柜日，不是最晚提柜日
      return {
        result: null,
        message: '预测模式下，未实际到港且未维护计划提柜日，无法计算滞港费',
        reason: 'missing_dates'
      };
    }

    // 1. 按货柜与标准自动计算最晚提柜日、最晚还箱日（Natural Days 公式：起算日 + freeDays - 1）
    // 合并类型（Demurrage & Detention）不参与 lastPickupDate/lastReturnDate 计算，仅用于自身计费区间
    const firstDemurrageStd = standards.find((s) => !isDetentionCharge(s) && !isCombinedDemurrageDetention(s));
    const firstDetentionStd = standards.find((s) => isDetentionCharge(s));

    // 起算日按计算模式和标准的「计算方式」：
    // actual模式: ATA > 实际卸船日（不包含ETA）
    // forecast模式: ATA > 实际卸船日 > 修正ETA > 原始ETA
    const calcBasis = (firstDemurrageStd?.calculationBasis ?? '').toLowerCase();
    const useDischargeOnly = calcBasis.includes('卸船');
    let demurrageStartDate: Date | null;
    let demurrageStartDateSource: string | null;

    if (useDischargeOnly) {
      // 按卸船
      if (calculationMode === 'actual') {
        // actual模式：只用实际卸船日
        demurrageStartDate = params.calculationDates.dischargeDate ?? null;
        demurrageStartDateSource = demurrageStartDate
          ? (params.calculationDates.dischargeDateSource ?? 'discharged_time')
          : null;
      } else {
        // forecast模式：实际卸船日 > 修正ETA > 原始ETA
        demurrageStartDate =
          params.calculationDates.dischargeDate ??
          params.calculationDates.revisedEtaDestPort ??
          params.calculationDates.etaDestPort ??
          null;
        if (params.calculationDates.dischargeDate) {
          demurrageStartDateSource = params.calculationDates.dischargeDateSource ?? 'discharged_time';
        } else if (params.calculationDates.revisedEtaDestPort) {
          demurrageStartDateSource = 'revised_eta_dest_port';
        } else if (params.calculationDates.etaDestPort) {
          demurrageStartDateSource = 'eta_dest_port';
        } else {
          demurrageStartDateSource = null;
        }
      }
      } else {
        // 按到港
        if (calculationMode === 'actual') {
          // actual模式：只用实际时间
          demurrageStartDate = params.calculationDates.ataDestPort ?? params.calculationDates.dischargeDate ?? null;
          demurrageStartDateSource = params.calculationDates.ataDestPort
            ? 'ata_dest_port'
            : params.calculationDates.dischargeDate
              ? (params.calculationDates.dischargeDateSource ?? 'discharged_time')
              : null;
        } else {
        // forecast模式：包含ETA
        demurrageStartDate =
          params.calculationDates.ataDestPort ??
          params.calculationDates.dischargeDate ??
          params.calculationDates.revisedEtaDestPort ??
          params.calculationDates.etaDestPort ??
          null;
        if (params.calculationDates.ataDestPort) {
          demurrageStartDateSource = 'ata_dest_port';
        } else if (params.calculationDates.dischargeDate) {
          demurrageStartDateSource = 'dest_port_unload_date';
        } else if (params.calculationDates.revisedEtaDestPort) {
          demurrageStartDateSource = 'revised_eta_dest_port';
        } else if (params.calculationDates.etaDestPort) {
          demurrageStartDateSource = 'eta_dest_port';
        } else {
          demurrageStartDateSource = null;
        }
      }
    }

    let computedLastFreeDate: Date | null = null;
    let lastFreeDateMode: 'actual' | 'forecast' = calculationMode;
    if (firstDemurrageStd && demurrageStartDate) {
      const freeDays = Math.max(0, firstDemurrageStd.freeDays ?? 0);
      const n = freeDays - 1;
      computedLastFreeDate = freePeriodUsesWorkingDays(firstDemurrageStd.freeDaysBasis)
        ? addWorkingDays(demurrageStartDate, n)
        : addDays(demurrageStartDate, n);
    }

    // 滞箱费最晚还箱日根据计算模式选择起算日：
    // - actual模式：使用实际提柜日
    // - forecast模式：使用计划提柜日
    let pickupBasisForDetention: Date | null;
    let lastReturnDateMode: 'actual' | 'forecast' = calculationMode;

  if (calculationMode === 'actual') {
    // actual模式：使用实际提柜日
    pickupBasisForDetention = params.calculationDates.pickupDateActual ?? null;
  } else {
    // forecast模式：使用计划提柜日
    pickupBasisForDetention = params.calculationDates.plannedPickupDate ?? null;
  }

    let computedLastReturnDate: Date | null = null;
    if (firstDetentionStd && pickupBasisForDetention) {
      const freeDays = Math.max(0, firstDetentionStd.freeDays ?? 0);
      const n = freeDays - 1;
      computedLastReturnDate = freePeriodUsesWorkingDays(firstDetentionStd.freeDaysBasis)
        ? addWorkingDays(pickupBasisForDetention, n)
        : addDays(pickupBasisForDetention, n);
    }

    // 2. 最晚提柜日：优先用本次计算值（与基础日期一致）
    const pickupDate =
      computedLastFreeDate ?? params.calculationDates.lastPickupDate;
    const lastReturnDate =
      params.calculationDates.lastReturnDate ?? computedLastReturnDate ?? null;
    // 滞箱费必须有实际提柜日才计算，不得用最晚提柜日（last_free_date）作为回退
    const detentionStartDate = params.calculationDates.pickupDateActual ?? null;
    const detentionStartDateSource = params.calculationDates.pickupDateActual
      ? 'process_trucking_transport.pickup_date'
      : null;

    // 3. 更新 params 用于后续计算（lastReturnDate 优先级：DB > 计算）
    const enhancedParams = {
      ...params,
      detentionStartDate: detentionStartDate ? toDateOnly(detentionStartDate) : null,
      detentionStartDateSource,
      calculationDates: {
        ...params.calculationDates,
        lastPickupDate: pickupDate ? toDateOnly(pickupDate) : params.calculationDates.lastPickupDate,
        lastPickupDateComputed: computedLastFreeDate ? toDateOnly(computedLastFreeDate) : null,
        lastPickupDateMode: pickupDate === computedLastFreeDate ? lastFreeDateMode : undefined,
        lastReturnDate: lastReturnDate ? toDateOnly(lastReturnDate) : null,
        lastReturnDateComputed: computedLastReturnDate ? toDateOnly(computedLastReturnDate) : null,
        lastReturnDateMode: computedLastReturnDate ? lastReturnDateMode : undefined
      }
    };

    const items: DemurrageItemResult[] = [];
    let totalAmount = 0;
    let currency = 'USD';

    const pickupDateActual = params.calculationDates.pickupDateActual;
    for (const std of standards) {
      const isDetention = isDetentionCharge(std);
      const isCombined = isCombinedDemurrageDetention(std);
      // 滞箱费及合并类型（Demurrage & Detention）：必须有实际提柜日才计算，无则跳过
      if ((isDetention || isCombined) && !pickupDateActual) continue;

      // 滞港费/堆存费：起算日按该标准的「计算方式」和计算模式；滞箱费：起算日=实际提柜日
      // Demurrage & Detention（合并费用项）：起算日=到港/卸船，截止日=还箱，整段作为单一计费区间
      let demurrageStartForStd: Date | null;
      let demurrageStartSource: string | null;

      if (isDetention || isCombined) {
        // 滞箱费/合并类型：起算日=实际提柜日（总是actual）
        demurrageStartForStd = enhancedParams.detentionStartDate;
        demurrageStartSource = enhancedParams.detentionStartDateSource;
      } else {
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
            demurrageStartForStd = params.calculationDates.ataDestPort ?? params.calculationDates.dischargeDate ?? null;
            demurrageStartSource = params.calculationDates.ataDestPort
              ? 'ata_dest_port'
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
              demurrageStartSource = 'ata_dest_port';
            } else if (params.calculationDates.dischargeDate) {
              demurrageStartSource = params.calculationDates.dischargeDateSource ?? 'discharged_time';
            } else if (params.calculationDates.revisedEtaDestPort) {
              demurrageStartSource = 'revised_eta_dest_port';
            } else if (params.calculationDates.etaDestPort) {
              demurrageStartSource = 'eta_dest_port';
            } else {
              demurrageStartSource = null;
            }
          }
        }
      }

      const rangeStart = isDetention ? enhancedParams.detentionStartDate : demurrageStartForStd;
      const rangeEnd = isDetention ? enhancedParams.detentionEndDate : enhancedParams.endDate;

      if (!rangeStart || !rangeEnd) {
        continue;
      }

      const freeDays = std.freeDays ?? 0;
      const ratePerDay = Number(std.ratePerDay ?? 0);
      const tiers = normalizeTiers(std.tiers) ?? (Array.isArray(std.tiers) ? (std.tiers as DemurrageTierDto[]) : null);
      const curr = std.currency ?? 'USD';
      currency = curr;

      const { lastFreeDate, chargeDays, totalAmount: amount, tierBreakdown } = calculateSingleDemurrage(
        rangeStart,
        rangeEnd,
        freeDays,
        ratePerDay,
        tiers,
        curr,
        std.freeDaysBasis
      );

      // 确定起算日和截止日的模式
      const startDateMode = isDetention
        ? 'actual'
        : demurrageStartSource?.includes('eta')
          ? 'forecast'
          : 'actual';
      const endDateMode = enhancedParams.endDateSource === '当前日期' ? 'actual' : startDateMode;

      items.push({
        standardId: std.id,
        chargeName: std.chargeName ?? (isCombined ? 'Demurrage & Detention' : '滞港费'),
        chargeTypeCode: std.chargeTypeCode ?? '',
        freeDays,
        freeDaysBasis: std.freeDaysBasis ?? undefined,
        calculationBasis: std.calculationBasis ?? undefined,
        calculationMode: isDetention ? 'actual' : calculationMode, // 滞箱费总是actual
        startDate: rangeStart,
        endDate: rangeEnd,
        startDateSource: isDetention ? enhancedParams.detentionStartDateSource : demurrageStartSource,
        endDateSource: isDetention ? enhancedParams.detentionEndDateSource : enhancedParams.endDateSource,
        startDateMode,
        endDateMode,
        lastFreeDate,
        lastFreeDateMode: isDetention ? 'actual' : lastFreeDateMode, // 滞箱费总是actual
        chargeDays,
        amount,
        currency: curr,
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
      return {
        result: null,
        message: '缺少起算日或截止日，无法计算',
        reason: 'missing_dates'
      };
    }

    // 4. 异步写回：仅在 actual 模式下写回，forecast 模式不写回数据库（仅用于预测/预警）
    if (calculationMode === 'actual') {
      this.writeBackComputedDatesIfNeeded(
        containerNumber,
        params.calculationDates.pickupDateActual,
        params.calculationDates.returnTime,
        computedLastFreeDate,
        computedLastReturnDate
      ).catch((err) => logger.warn('[Demurrage] writeBackComputedDates failed:', err));
    } else {
      logger.info(`[Demurrage] Forecast calculation for ${containerNumber} - skipping database write-back`);
    }

    const primaryStart = enhancedParams.startDate ?? enhancedParams.detentionStartDate;
    const primaryEnd = enhancedParams.endDate ?? enhancedParams.detentionEndDate;
    const primaryStartSource = enhancedParams.startDateSource ?? enhancedParams.detentionStartDateSource;
    const primaryEndSource = enhancedParams.endDateSource ?? enhancedParams.detentionEndDateSource;

    const formatDateForApi = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
    const calcDates = enhancedParams.calculationDates;

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
        plannedPickupDate: formatDateForApi((calcDates as { plannedPickupDate?: Date | null }).plannedPickupDate ?? null),
        lastPickupDateComputed: formatDateForApi((calcDates as { lastPickupDateComputed?: Date | null }).lastPickupDateComputed ?? null),
        lastPickupDateMode: calcDates.lastPickupDateMode,
        lastReturnDate: formatDateForApi(calcDates.lastReturnDate),
        lastReturnDateComputed: formatDateForApi((calcDates as { lastReturnDateComputed?: Date | null }).lastReturnDateComputed ?? null),
        lastReturnDateMode: calcDates.lastReturnDateMode,
        pickupDateActual: formatDateForApi(calcDates.pickupDateActual),
        returnTime: formatDateForApi(calcDates.returnTime),
        today: formatDateForApi(calcDates.today)!
      },
      matchedStandards: standards.map((s) => ({
        id: s.id,
        chargeName: s.chargeName ?? '滞港费',
        chargeTypeCode: s.chargeTypeCode ?? '',
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
        tiers: normalizeTiers(s.tiers) ?? (Array.isArray(s.tiers) ? (s.tiers as DemurrageTierDto[]) : undefined),
        currency: s.currency ?? 'USD'
      })),
      items,
      totalAmount,
      currency
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
          const n = await this.saveCalculationToRecords(result, isReturnedEmpty, destinationPort, logisticsStatus);
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

    const avgPerContainer = containerCountWithCharge > 0 ? totalAmount / containerCountWithCharge : 0;

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
  private async getSummaryFromRecords(
    containerNumbers: string[]
  ): Promise<{
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
      return (rows || []).map((r: { port: string; total_amount: number; container_count: number }) => ({
        port: String(r.port ?? '未指定目的港'),
        totalAmount: Number(r.total_amount ?? 0),
        containerCount: Number(r.container_count ?? 0)
      }));
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

      const cns = rows.map(
        (r: Record<string, unknown>) => String(r.containerNumber ?? r.container_number ?? '')
      );
      const missingPortCns = cns.filter(
        (cn, i) => !(rows[i]?.destinationPort ?? rows[i]?.destination_port)
      );
      const portMap =
        missingPortCns.length > 0 ? await this.getDestinationPortsForContainers(missingPortCns) : new Map<string, string>();
      const missingStatusCns = cns.filter(
        (cn, i) => !(rows[i]?.logisticsStatus ?? rows[i]?.logistics_status)
      );
      const statusMap =
        missingStatusCns.length > 0 ? await this.getLogisticsStatusForContainers(missingStatusCns) : new Map<string, string>();

      const items = rows.map((r: Record<string, unknown>, i: number) => {
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
          lastFreeDate: r.chargeEndDate ?? r.charge_end_date
            ? String(r.chargeEndDate ?? r.charge_end_date).slice(0, 10)
            : null,
          destinationPort: (fromRecord ? String(fromRecord) : portMap.get(cn)) ?? undefined,
          logisticsStatus: (fromRecordStatus ? String(fromRecordStatus) : statusMap.get(cn)) ?? undefined
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
  private async getContainerNumbersInDateRange(startDate?: string, endDate?: string): Promise<string[]> {
    if (!startDate || !endDate) {
      const rows = await this.containerRepo.query(
        'SELECT DISTINCT container_number FROM biz_containers'
      );
      return (rows || []).map((r: { container_number: string }) => r.container_number).filter(Boolean);
    }
    const { sql, params } = getDateRangeSubqueryRaw(startDate, endDate);
    const rows = await this.containerRepo.query(sql, params);
    return (rows || []).map((r: { container_number: string }) => r.container_number).filter(Boolean);
  }

  /**
   * 批量写回：对「last_free_date 为空且已到目的港」「已提柜但 last_return_date 为空」的货柜计算并写回
   * @param options.limitLastFree 最晚提柜日写回批次上限，默认 100
   * @param options.limitLastReturn 最晚还箱日写回批次上限，默认 100
   */
  async batchWriteBackComputedDates(options?: {
    limitLastFree?: number;
    limitLastReturn?: number;
  }): Promise<{ lastFreeWritten: number; lastReturnWritten: number; lastFreeProcessed: number; lastReturnProcessed: number }> {
    const limitLastFree = options?.limitLastFree ?? 100;
    const limitLastReturn = options?.limitLastReturn ?? 100;

    let lastFreeWritten = 0;
    let lastReturnWritten = 0;

    // 1. last_free_date 为空且已到目的港
    const noLastFreeSql = LastPickupSubqueryTemplates.NO_LAST_FREE_DATE_SUBQUERY;
    const lastFreeRows = await this.containerRepo.query(
      `SELECT container_number FROM (${noLastFreeSql}) t LIMIT ${Math.max(1, limitLastFree)}`
    );
    const lastFreeNumbers = (lastFreeRows || []).map((r: { container_number: string }) => r.container_number).filter(Boolean);

    for (const cn of lastFreeNumbers) {
      try {
        const { result } = await this.calculateForContainer(cn);
        if (result) lastFreeWritten++;
      } catch (e) {
        logger.warn(`[Demurrage] batchWriteBack last_free failed for ${cn}:`, e);
      }
    }

    // 2. 已提柜但 last_return_date 为空（与 LastReturnStatistics 目标集一致）
    const lastReturnRows = await this.containerRepo.query(`
      SELECT DISTINCT c.container_number
      FROM biz_containers c
      LEFT JOIN process_empty_return er ON er.container_number = c.container_number
      WHERE c.logistics_status IN ('picked_up', 'unloaded')
      AND (er.last_return_date IS NULL OR er.container_number IS NULL)
      AND NOT EXISTS (SELECT 1 FROM process_empty_return er2 WHERE er2.container_number = c.container_number AND er2.return_time IS NOT NULL)
      LIMIT ${Math.max(1, limitLastReturn)}
    `);
    const lastReturnNumbers = (lastReturnRows || []).map((r: { container_number: string }) => r.container_number).filter(Boolean);

    for (const cn of lastReturnNumbers) {
      try {
        const { result } = await this.calculateForContainer(cn);
        if (result) lastReturnWritten++;
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
   * 写回计算的最晚提柜日/最晚还箱日到 DB（当 DB 为空时）
   * 最晚提柜日：仅当无实际提柜日时写回（滞港费用）
   * 最晚还箱日：仅当有实际提柜日且无实际还箱日时写回（滞箱费用，必须以实际提柜日为起算，预测模式不写回）
   */
  private async writeBackComputedDatesIfNeeded(
    containerNumber: string,
    pickupDateActual: Date | null,
    returnTime: Date | null,
    computedLastFreeDate: Date | null,
    computedLastReturnDate: Date | null
  ): Promise<void> {
    // 最晚提柜日：无实际提柜日时才写回（滞港费免费期截止）
    if (!pickupDateActual && computedLastFreeDate) {
      const destPort = await this.portOpRepo.findOne({
        where: { containerNumber, portType: 'destination' },
        order: { portSequence: 'DESC' }
      });
      if (destPort && !destPort.lastFreeDate) {
        await this.portOpRepo.update({ id: destPort.id }, { lastFreeDate: computedLastFreeDate });
        logger.info(`[Demurrage] Wrote back last_free_date for ${containerNumber}`);
      }
    }

    // 最晚还箱日：必须有实际提柜日且无实际还箱日时写回（滞箱费最晚还箱日，预测模式使用计划提柜日不写回）
    if (returnTime) return; // 已还箱，不再写回最晚还箱日
    if (computedLastReturnDate && pickupDateActual) {
      let emptyReturn = await this.emptyReturnRepo.findOne({
        where: { containerNumber }
      });
      if (!emptyReturn) {
        emptyReturn = this.emptyReturnRepo.create({
          containerNumber,
          lastReturnDate: computedLastReturnDate
        });
        await this.emptyReturnRepo.save(emptyReturn);
        logger.info(`[Demurrage] Wrote back last_return_date for ${containerNumber} (insert)`);
      } else if (!emptyReturn.lastReturnDate) {
        await this.emptyReturnRepo.update(
          { containerNumber },
          { lastReturnDate: computedLastReturnDate }
        );
        logger.info(`[Demurrage] Wrote back last_return_date for ${containerNumber}`);
      }
    }
  }
}
