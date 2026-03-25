// @ts-nocheck
// TD-008：DeepPartial/可空字段与飞驼导入大批量写入需与实体逐字段对齐后再移除
/**
 * 飞驼 Excel 导入服务
 * 解析表一/表二格式，写入 ext_feituo_import_* 并合并到核心表
 * 支持按分组存储 raw_data_by_group，避免同名字段错位
 */

import { AppDataSource } from '../database';
import { ExtFeituoImportBatch } from '../entities/ExtFeituoImportBatch';
import { ExtFeituoImportTable1 } from '../entities/ExtFeituoImportTable1';
import { ExtFeituoImportTable2 } from '../entities/ExtFeituoImportTable2';
import { Container } from '../entities/Container';
import { Port } from '../entities/Port';

/** 是否含中日韩统一表意文字（用于区分「中文港名」与纯拉丁简称） */
function stringLikelyHasCjk(s: string | null | undefined): boolean {
  if (!s) return false;
  return /[\u3400-\u9fff]/.test(s);
}
import { SeaFreight } from '../entities/SeaFreight';
import { PortOperation } from '../entities/PortOperation';
import { TruckingTransport } from '../entities/TruckingTransport';
import { EmptyReturn } from '../entities/EmptyReturn';
import { WarehouseOperation } from '../entities/WarehouseOperation';
import { ContainerStatusEvent } from '../entities/ContainerStatusEvent';
import { ContainerType } from '../entities/ContainerType';
import { ShippingCompany } from '../entities/ShippingCompany';
import { InspectionRecord } from '../entities/InspectionRecord';
import { InspectionEvent } from '../entities/InspectionEvent';
import { ExtDemurrageStandard } from '../entities/ExtDemurrageStandard';
import { ReplenishmentOrder } from '../entities/ReplenishmentOrder';
import { ExtFeituoVessel } from '../entities/ExtFeituoVessel';
import { ExtFeituoPlace } from '../entities/ExtFeituoPlace';
import { ExtFeituoStatusEvent } from '../entities/ExtFeituoStatusEvent';
import { logger } from '../utils/logger';
import { DemurrageService } from './demurrage.service';
import { auditLogService } from './auditLog.service';
import { getCoreFieldName } from '../constants/FeiTuoStatusMapping';
import { PICKUP_DATE_SOURCE } from '../constants/pickupDateSource';
import { tryApplyFeituoPickupFromGateOutEvent } from '../utils/truckingPickupFromFeituo';
import { calculateLogisticsStatus } from '../utils/logisticsStatusMachine';
import { getGroupForColumn } from '../constants/FeituoFieldGroupMapping';
import { feituoPlaceAnalyzer, PortAnalysisResult } from './feituo/FeituoPlaceAnalyzer';
import { feituoSmartDateUpdater } from './feituo/FeituoSmartDateUpdater';
import { externalDataService, DataSource } from './externalDataService';
import { AlertService } from './alertService';
import type { Repository } from 'typeorm';

type FeituoRow = Record<string, unknown>;

/** 行数据（含分组时使用 rawDataByGroup） */
type FeituoRowData = FeituoRow & { _rawDataByGroup?: Record<string, Record<string, unknown>> };

/** 从行中取值，支持多列名；优先从 raw_data_by_group 指定分组取，避免错位 */
function getVal(row: FeituoRowData, ...keys: string[]): string | null;
function getVal(row: FeituoRowData, groupId: number, ...keys: string[]): string | null;
function getVal(row: FeituoRowData, groupIdOrKey: number | string, ...rest: string[]): string | null {
  const hasGroup = typeof groupIdOrKey === 'number';
  const groupId = hasGroup ? groupIdOrKey : undefined;
  const keys = hasGroup ? rest : [groupIdOrKey, ...rest];

  if (groupId !== undefined && row._rawDataByGroup) {
    const g = row._rawDataByGroup[String(groupId)];
    if (g) {
      for (const k of keys) {
        const v = g[k];
        if (v !== undefined && v !== null && v !== '') return String(v).trim();
      }
    }
  }

  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && v !== '') return String(v).trim();
  }

  if (row._rawDataByGroup && groupId === undefined) {
    for (const g of Object.values(row._rawDataByGroup)) {
      for (const k of keys) {
        const v = g[k];
        if (v !== undefined && v !== null && v !== '') return String(v).trim();
      }
    }
  }
  return null;
}

/**
 * 从行中解析主提单号 MBL（兼容「基本信息_MBL Number」及任意含 MBL Number 的列名）
 */
function getMblFromRow(row: FeituoRowData): string | null {
  const direct = getVal(
    row,
    '基本信息_MBL Number',
    'MBL Number',
    'MBL Number（一）',
    'MBLNumber',
    'mbl_number'
  );
  if (direct) return direct;

  for (const k of Object.keys(row)) {
    if (k === '_rawDataByGroup') continue;
    if (k.includes('MBL Number') || k.endsWith('MBLNumber')) {
      const v = row[k];
      if (v !== undefined && v !== null && v !== '') return String(v).trim();
    }
  }
  if (row._rawDataByGroup) {
    for (const g of Object.values(row._rawDataByGroup)) {
      for (const key of Object.keys(g)) {
        if (key.includes('MBL Number') || key.endsWith('MBLNumber')) {
          const v = g[key];
          if (v !== undefined && v !== null && v !== '') return String(v).trim();
        }
      }
    }
  }
  return null;
}

/** 按 headers + 行数组构建 raw_data_by_group */
function buildRawDataByGroup(
  tableType: 1 | 2,
  headers: string[],
  rowValues: unknown[]
): Record<string, Record<string, unknown>> {
  const byGroup: Record<string, Record<string, unknown>> = {};
  const occurrence: Record<string, number> = {};

  for (let j = 0; j < headers.length; j++) {
    const h = String(headers[j] || '').trim();
    if (!h) continue;
    const val = rowValues[j];
    if (val === undefined || val === null || val === '') continue;

    const occ = (occurrence[h] = (occurrence[h] ?? 0));
    const gid = getGroupForColumn(tableType, h, occ);
    occurrence[h] = occ + 1;

    if (gid === 0 || gid === 7) continue; // 未知分组、当前状态信息分组不导入

    const gKey = String(gid);
    if (!byGroup[gKey]) byGroup[gKey] = {};
    byGroup[gKey][h] = val;
  }
  return byGroup;
}

/** 将 raw_data_by_group 压平为 raw_data（同名字段取首次出现） */
function flattenRawDataByGroup(byGroup: Record<string, Record<string, unknown>>): Record<string, unknown> {
  const flat: Record<string, unknown> = {};
  const groupOrder = Object.keys(byGroup).map(Number).sort((a, b) => a - b);
  for (const g of groupOrder) {
    const obj = byGroup[String(g)];
    if (obj) for (const [k, v] of Object.entries(obj)) if (!(k in flat)) flat[k] = v;
  }
  return flat;
}

function isEmptyCellValue(v: unknown): boolean {
  return v === undefined || v === null || v === '';
}

/**
 * 同一 (MBL, 集装箱号) 下多行 Excel 合并为一条基准行：空缺字段由后续行补全（飞驼多行事件导出）。
 * 用于发生地/船舶/核心合并；状态事件仍按原始逐行写入。
 */
function mergeFeituoRowDataPreferNonEmpty(a: FeituoRowData, b: FeituoRowData): FeituoRowData {
  const out: FeituoRowData = { ...a };
  for (const k of Object.keys(b)) {
    if (k === '_rawDataByGroup') continue;
    if (isEmptyCellValue(out[k]) && !isEmptyCellValue(b[k])) {
      out[k] = b[k];
    }
  }
  if (b._rawDataByGroup) {
    const gOut: Record<string, Record<string, unknown>> = { ...(out._rawDataByGroup || {}) };
    for (const [gid, gObj] of Object.entries(b._rawDataByGroup)) {
      const base = { ...(gOut[gid] || {}) };
      for (const [k, v] of Object.entries(gObj as Record<string, unknown>)) {
        if (isEmptyCellValue(base[k]) && !isEmptyCellValue(v)) base[k] = v;
      }
      gOut[gid] = base;
    }
    out._rawDataByGroup = gOut;
  }
  if (out._rawDataByGroup) {
    const flat = flattenRawDataByGroup(out._rawDataByGroup);
    for (const [k, v] of Object.entries(flat)) {
      if (isEmptyCellValue(out[k]) && !isEmptyCellValue(v)) out[k] = v;
    }
  }
  return out;
}

/** 基准键：MBL + 集装箱号（用于合并多行） */
function getContainerNumberFromRow(row: FeituoRowData): string | null {
  return getVal(
    row,
    '当前状态信息_集装箱号',
    '集装箱物流信息_集装箱号',
    '集装箱号',
    '集装箱号（一）',
    'container_number'
  ) as string | null;
}

function feituoBaselineKey(row: FeituoRowData): string | null {
  const cn = getContainerNumberFromRow(row);
  if (!cn) return null;
  const mbl = getMblFromRow(row) || '';
  return `${mbl}||${cn}`;
}

/** 子集3：同一 MBL 下，按「集装箱物流信息_集装箱号」分组（含 集装箱物流信息_*） */
function getLogisticsContainerNumberFromRow(row: FeituoRowData): string | null {
  const v = getVal(row, '集装箱物流信息_集装箱号');
  return v ? String(v).trim() : null;
}

function subset3JoinKey(row: FeituoRowData): string | null {
  const mbl = getMblFromRow(row) || '';
  const logisticsCn = getLogisticsContainerNumberFromRow(row);
  if (!logisticsCn) return null;
  return `${mbl}||${logisticsCn}`;
}

/** 子集4：含 船泊信息_* 的行，按 MBL 聚合（与提单维度一致） */
function hasSubset4ShipRow(row: FeituoRowData): boolean {
  if (getVal(row, '船泊信息_船名', '船泊信息_imo', '船泊信息_mmsi')) return true;
  if (row._rawDataByGroup) {
    const flat = flattenRawDataByGroup(row._rawDataByGroup);
    for (const [k, v] of Object.entries(flat)) {
      if (String(k).startsWith('船泊信息_') && !isEmptyCellValue(v)) return true;
    }
  }
  return false;
}

function subset4MblKey(row: FeituoRowData): string | null {
  if (!hasSubset4ShipRow(row)) return null;
  return getMblFromRow(row) || '';
}

/** 发生地「地点类型」：与 ExtFeituoPlace.place_type / savePlacesSubset 映射一致 */
function mapFeituoPlaceTypeStrToInt(placeTypeStr: string | null | undefined): number {
  if (!placeTypeStr) return 0;
  const t = String(placeTypeStr).trim();
  if (/^\d+$/.test(t)) return parseInt(t, 10) || 0;
  if (t.includes('起始') || t.includes('起运')) return 1;
  if (t.includes('中转')) return 2;
  if (t.includes('目的') || t.includes('交货')) return 3;
  return 0;
}

/**
 * 子集2 索引：MBL + 地点CODE（整票去重；与 ext 表唯一键中的 place_type 独立）
 */
function subset2MblPortKey(mbl: string, portCode: string): string {
  return `${mbl}||${String(portCode).trim().toUpperCase()}`;
}

/** 将第 i 槽「发生地信息_*」投影到主列名（无后缀），便于整票合并 */
function projectOccurrenceSlotToPrimaryColumns(row: FeituoRowData, slotIndex: number): FeituoRowData {
  const suffix = slotIndex === 0 ? '' : `_${slotIndex + 1}`;
  const out: FeituoRowData = { ...row };
  const bases = [
    '发生地信息_地点CODE',
    '发生地信息_地点类型',
    '发生地信息_地点名称中文（标准）',
    '发生地信息_地点名称英文（标准）',
    '发生地信息_地点名称（原始）',
    '发生地信息_纬度',
    '发生地信息_经度',
    '发生地信息_时区',
    '发生地信息_预计离开时间',
    '发生地信息_预计到达时间',
    '发生地信息_实际到达时间',
    '发生地信息_实际离开时间',
    '发生地信息_AIS实际到港时间',
    '发生地信息_AIS实际靠泊时间',
    '发生地信息_AIS实际离港时间',
    '发生地信息_实际卸船时间',
    '发生地信息_实际装船时间',
    '发生地信息_铁路预计离开时间',
    '发生地信息_船名',
    '发生地信息_航次',
    '发生地信息_码头名称',
  ];
  for (const base of bases) {
    const v =
      slotIndex === 0 ? getVal(row, `${base}${suffix}`, base) : getVal(row, `${base}${suffix}`);
    if (v !== null && v !== undefined && String(v).trim() !== '') {
      (out as Record<string, unknown>)[base] = v;
    }
  }
  return out;
}

/**
 * 子集2：全批次按 MBL + 发生地地点CODE 去重合并 → enrich + 每 MBL 的发生地列表。
 * 子集1（MBL+箱号）仅按 MBL join 该列表即可得到整票航线地点。
 */
function buildSubset2MblPortMaps(
  items: FeituoBuiltExcelRow[],
  resolveMbl: (r: FeituoRowData) => string
): {
  enrichByMblPort: Map<string, FeituoRowData>;
  placesListByMbl: Map<string, FeituoRowData[]>;
} {
  const enrichByMblPort = new Map<string, FeituoRowData>();
  for (const { row } of items) {
    const mbl = resolveMbl(row);
    if (!mbl) continue;
    for (let i = 0; i < 10; i++) {
      const suffix = i === 0 ? '' : `_${i + 1}`;
      const portCode = (
        i === 0
          ? getVal(row, `发生地信息_地点CODE${suffix}`, '发生地信息_地点CODE')
          : getVal(row, `发生地信息_地点CODE${suffix}`)
      ) as string;
      if (!portCode || String(portCode).trim() === '') continue;
      const key = subset2MblPortKey(mbl, portCode);
      const projected = projectOccurrenceSlotToPrimaryColumns(row, i);
      const ex = enrichByMblPort.get(key);
      enrichByMblPort.set(key, ex ? mergeFeituoRowDataPreferNonEmpty(ex, projected) : projected);
    }
  }
  const placesListByMbl = new Map<string, FeituoRowData[]>();
  for (const [key, mergedRow] of enrichByMblPort) {
    const sep = key.indexOf('||');
    if (sep < 0) continue;
    const mblOnly = key.slice(0, sep);
    const list = placesListByMbl.get(mblOnly) || [];
    list.push(mergedRow);
    placesListByMbl.set(mblOnly, list);
  }
  for (const [, list] of placesListByMbl) {
    list.sort((a, b) => {
      const ta = mapFeituoPlaceTypeStrToInt(getVal(a, '发生地信息_地点类型') as string);
      const tb = mapFeituoPlaceTypeStrToInt(getVal(b, '发生地信息_地点类型') as string);
      if (ta !== tb) return ta - tb;
      const ca = (getVal(a, '发生地信息_地点CODE') || '') as string;
      const cb = (getVal(b, '发生地信息_地点CODE') || '') as string;
      return String(ca).localeCompare(String(cb));
    });
  }
  return { enrichByMblPort, placesListByMbl };
}

/**
 * 状态子集兜底写 ext_feituo_places 时补全 place_type（避免大量 0）：
 * 1) 分组 12 / 扁平列「地点类型」
 * 2) 状态描述中文含起运/目的/中转等关键词
 * 3) 与任一条「发生地信息_*」地点 CODE 一致则沿用该槽的地点类型
 */
function inferPlaceTypeForStatusFallbackPlaces(
  row: FeituoRowData,
  statusPortCode: string,
  explicitMapped: number
): number {
  if (explicitMapped !== 0) return explicitMapped;

  const from12 = mapFeituoPlaceTypeStrToInt(
    (getVal(row, 12, '地点类型') || getVal(row, '集装箱物流信息-状态_地点类型')) as string | undefined
  );
  if (from12 !== 0) return from12;

  const desc = (
    getVal(row, 12, '状态描述中文（标准）') ||
    getVal(row, 12, '状态描述中文(标准)') ||
    getVal(row, '集装箱物流信息-状态_状态描述中文（标准）') ||
    ''
  ) as string;
  const d = String(desc).trim();
  if (d) {
    if (/目的港|卸货港|交货地|卸船|清关完成|提.?柜|还.?箱/.test(d)) return 3;
    if (/起运港|装船|离港|出运/.test(d)) return 1;
    if (/中转/.test(d)) return 2;
  }

  const norm = String(statusPortCode).trim().toUpperCase();
  for (let i = 0; i < 10; i++) {
    const suffix = i === 0 ? '' : `_${i + 1}`;
    const pc = (
      i === 0
        ? getVal(row, `发生地信息_地点CODE${suffix}`, '发生地信息_地点CODE')
        : getVal(row, `发生地信息_地点CODE${suffix}`)
    ) as string;
    if (!pc || String(pc).trim().toUpperCase() !== norm) continue;
    const occ = (base: string) =>
      i === 0 ? getVal(row, `${base}${suffix}`, base) : getVal(row, `${base}${suffix}`);
    const pt = mapFeituoPlaceTypeStrToInt(occ('发生地信息_地点类型') as string);
    if (pt !== 0) return pt;
  }

  return 0;
}

/** 表一：分组4/5；表二：分组6/7；兼容扁平列 — 接货地（起运侧）港口代码 */
function getPickupPortCodeFromWide(row: FeituoRowData): string | null {
  const v =
    getVal(row, 4, '接货地地点CODE') ||
    getVal(row, 6, '接货地地点CODE') ||
    getVal(row, '接货地地点CODE');
  return v ? String(v).trim() : null;
}

/** 交货地（目的侧）港口代码 */
function getDeliveryPortCodeFromWide(row: FeituoRowData): string | null {
  const v =
    getVal(row, 5, '交货地地点CODE') ||
    getVal(row, 7, '交货地地点CODE') ||
    getVal(row, '交货地地点CODE');
  return v ? String(v).trim() : null;
}

function mergeExtFeituoPlacePreferNonEmpty(
  existing: ExtFeituoPlace,
  incoming: Partial<ExtFeituoPlace> & Record<string, unknown>
): void {
  for (const [k, v] of Object.entries(incoming)) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    (existing as unknown as Record<string, unknown>)[k] = v;
  }
}

type FeituoBuiltExcelRow = {
  row: FeituoRowData;
  rawData: Record<string, unknown>;
  rawDataByGroup: Record<string, Record<string, unknown>> | null;
  excelIndex: number;
};

/**
 * 解析 Excel 日期时间（字符串或 Excel 已解析的 Date），统一按“字面值”入库：
 * 以 UTC 组件构造，避免 Node/OS 本地时区导致的隐式换算。
 */
export function parseDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) {
    const d = new Date(Date.UTC(
      val.getFullYear(),
      val.getMonth(),
      val.getDate(),
      val.getHours(),
      val.getMinutes(),
      val.getSeconds(),
      val.getMilliseconds()
    ));
    return isNaN(d.getTime()) ? null : d;
  }
  let s = String(val).trim().replace(/\//g, '-');
  // 飞驼偶发「HH:mm:ss:毫秒」用冒号分隔毫秒，改为小数毫秒便于解析
  s = s.replace(/(\d{1,2}:\d{1,2}:\d{1,2}):(\d{1,3})\b/g, '$1.$2');
  const m = s.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2})(?:\.(\d{1,3}))?)?)?/
  );
  if (m) {
    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    const day = parseInt(m[3], 10);
    const h = m[4] !== undefined ? parseInt(m[4], 10) : 0;
    const min = m[5] !== undefined ? parseInt(m[5], 10) : 0;
    const sec = m[6] !== undefined ? parseInt(m[6], 10) : 0;
    const msRaw = m[7];
    const ms = msRaw !== undefined ? parseInt(msRaw.padEnd(3, '0').slice(0, 3), 10) : 0;
    const d = new Date(Date.UTC(year, month, day, h, min, sec, ms));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** 解析布尔 */
function parseBool(val: unknown): boolean {
  if (val === true || val === 'true' || val === 'TRUE' || val === 'Y' || val === '1') return true;
  return false;
}

/** 标准化柜型 */
function normalizeContainerType(val: string | null): string {
  if (!val) return '40HC';
  const v = val.toUpperCase().replace(/\s+/g, '');
  const map: Record<string, string> = {
    '40HC': '40HC', '40HQ': '40HC', '40H': '40HC',
    '20GP': '20GP', '20HC': '20HC',
    '45HC': '45HC', '45HQ': '45HC',
  };
  return map[v] || (v.match(/^\d{2}/) ? v : '40HC');
}

/** 发生地信息数组类型 (Excel导入) */
interface ExcelPlaceInfo {
  code: string;
  nameEn?: string;
  nameCn?: string;
  placeType?: string;
  eta?: Date | null;
  ata?: Date | null;
  etd?: Date | null;
  atd?: Date | null;
  actualLoading?: Date | null;
  actualDischarge?: Date | null;
  terminal?: string;
  sequence: number;
}

/** 状态信息数组类型 (Excel导入) */
interface ExcelStatusInfo {
  group: number;
  vesselName?: string;
  voyageNumber?: string;
  transportMode?: string;
  statusCode: string;
  statusName?: string;
  occurredAt: Date | null;
  location?: string;
  eventPlace?: string;
  eventPlaceOrigin?: string;
  portCode?: string;
  terminal?: string;
  isEstimated: boolean;
  dataSource: string;
}

export class FeituoImportService {
  // 滞港费服务实例
  private demurrageService = new DemurrageService(
    AppDataSource.getRepository(ExtDemurrageStandard),
    AppDataSource.getRepository(Container),
    AppDataSource.getRepository(PortOperation),
    AppDataSource.getRepository(SeaFreight),
    AppDataSource.getRepository(TruckingTransport),
    AppDataSource.getRepository(EmptyReturn),
    AppDataSource.getRepository(InspectionRecord)
  );

  /**
   * 根据港口名称或代码查找 dict_ports 表中的 port_code
   * 用于填充 sea_freight 表的外键字段
   */
  private async findPortCode(portNameOrCode?: string): Promise<string | null> {
    if (!portNameOrCode) return null;
    const portRepo = AppDataSource.getRepository(Port);
    // 优先按 code 查找
    let port = await portRepo.findOne({ where: { portCode: portNameOrCode } });
    if (port) return port.portCode;
    // 按名称查找（匹配 port_name 或 port_name_en）
    port = await portRepo.findOne({
      where: [
        { portName: portNameOrCode },
        { portNameEn: portNameOrCode }
      ]
    });
    return port?.portCode || null;
  }

  /** 按 UN/LOCODE 从 dict_ports 取标准中/英文名，补全 Excel 仅拉丁缩写的情况 */
  private async getDictPortDisplayByCode(portCode: string): Promise<{ portName: string; portNameEn: string | null } | null> {
    const code = (portCode || '').trim().toUpperCase();
    if (!code) return null;
    const port = await AppDataSource.getRepository(Port).findOne({ where: { portCode: code } });
    if (!port) return null;
    return { portName: port.portName, portNameEn: port.portNameEn ?? null };
  }

  private parseNullableFloat(v: string | null | undefined): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(String(v).trim());
    return Number.isFinite(n) ? n : null;
  }

  private parseTimezoneToInt(v: string | null | undefined): number | null {
    if (!v) return null;
    const s = String(v).trim().toUpperCase();
    const matched = s.match(/[+-]?\d+(?:\.\d+)?/);
    if (!matched) return null;
    const n = Number(matched[0]);
    if (!Number.isFinite(n)) return null;
    const rounded = Math.round(n);
    if (rounded < -12 || rounded > 14) return null;
    return rounded;
  }

  private normalizeDictPortType(v: string | null | undefined): string | null {
    if (!v) return null;
    const s = String(v).trim().toUpperCase();
    if (!s) return null;
    if (s === 'PORT') return 'PORT';
    if (s === 'TERMINAL') return 'TERMINAL';
    if (s === 'WAREHOUSE') return 'WAREHOUSE';
    if (s === 'CUSTOMS') return 'CUSTOMS';
    if (s === '1' || s.includes('起始') || s.includes('起运')) return 'PORT';
    if (s === '2' || s.includes('中转')) return 'PORT';
    if (s === '3' || s.includes('目的') || s.includes('交货')) return 'PORT';
    return null;
  }

  /**
   * 用发生地字段维护 dict_ports：按 port_code upsert
   * 字段来源：地点CODE / 中英文名 / 原始名 / 地点类型 / 纬度 / 经度 / 时区
   */
  private async upsertDictPortFromOccurrenceFields(data: {
    portCode: string;
    portNameEn?: string | null;
    portNameCn?: string | null;
    portNameOrigin?: string | null;
    placeType?: string | null;
    latitude?: string | null;
    longitude?: string | null;
    timezone?: string | null;
  }): Promise<void> {
    const rawCode = String(data.portCode || '').trim();
    if (!rawCode) return;
    const resolvedCode = await this.findPortCode(rawCode);
    const candidate = (resolvedCode || rawCode).trim().toUpperCase();
    // 仅接受标准 UN/LOCODE（5位字母数字），避免把“宁波/费利克斯托”写进 port_code
    const code = /^[A-Z0-9]{5}$/.test(candidate) ? candidate : null;
    if (!code) return;

    const portRepo = AppDataSource.getRepository(Port);
    const existing = await portRepo.findOne({ where: { portCode: code } });

    const cn = data.portNameCn && stringLikelyHasCjk(data.portNameCn) ? data.portNameCn.trim() : null;
    const en = data.portNameEn && !stringLikelyHasCjk(data.portNameEn) ? data.portNameEn.trim() : null;
    const origin = data.portNameOrigin ? String(data.portNameOrigin).trim() : null;
    const resolvedName = cn || en || origin || code;

    const latitude = this.parseNullableFloat(data.latitude);
    const longitude = this.parseNullableFloat(data.longitude);
    const timezone = this.parseTimezoneToInt(data.timezone);
    const normalizedPortType = this.normalizeDictPortType(data.placeType);

    if (existing) {
      if (!existing.portName || !stringLikelyHasCjk(existing.portName)) existing.portName = cn || existing.portName || resolvedName;
      if (!existing.portNameEn && en) existing.portNameEn = en;
      if (!existing.portType && normalizedPortType) existing.portType = normalizedPortType;
      if ((existing.latitude === null || existing.latitude === undefined) && latitude !== null) existing.latitude = latitude;
      if ((existing.longitude === null || existing.longitude === undefined) && longitude !== null) existing.longitude = longitude;
      if ((existing.timezone === null || existing.timezone === undefined) && timezone !== null) existing.timezone = timezone;
      await portRepo.save(existing);
      return;
    }

    const rec = portRepo.create({
      portCode: code,
      portName: resolvedName,
      portNameEn: en || undefined,
      portType: normalizedPortType || 'PORT',
      latitude: latitude ?? undefined,
      longitude: longitude ?? undefined,
      timezone: timezone ?? undefined,
      status: 'ACTIVE',
    });
    await portRepo.save(rec);
  }

  /**
   * 导入飞驼 Excel 数据
   * @param tableType 1=表一, 2=表二
   * @param rows 行数据：Record[] 或 [headers, ...rowArrays] 形式
   * @param fileName 文件名
   * @param headers 可选，列名数组（与 rows 为 unknown[][] 时必填，用于按分组存储）
   */
  async import(
    tableType: 1 | 2,
    rows: FeituoRow[] | unknown[][],
    fileName?: string,
    headers?: string[]
  ): Promise<{ success: number; failed: number; errors: { row: number; error: string }[] }> {
    const batchRepo = AppDataSource.getRepository(ExtFeituoImportBatch);
    const t1Repo = AppDataSource.getRepository(ExtFeituoImportTable1);
    const t2Repo = AppDataSource.getRepository(ExtFeituoImportTable2);

    const batch = batchRepo.create({
      tableType,
      fileName: fileName || null,
      totalRows: rows.length,
      successCount: 0,
      errorCount: 0,
      errorDetails: []
    });
    await batchRepo.save(batch);

    const errors: { row: number; error: string }[] = [];
    let successCount = 0;

    const isArrayRows = rows.length > 0 && Array.isArray(rows[0]);
    const hasHeaders = !!(headers && headers.length > 0);
    const useGrouped = isArrayRows && hasHeaders;

    const builtItems: FeituoBuiltExcelRow[] = [];
    for (let i = 0; i < rows.length; i++) {
      let row: FeituoRowData;
      let rawData: Record<string, unknown>;
      let rawDataByGroup: Record<string, Record<string, unknown>> | null = null;

      if (useGrouped) {
        const rowArr = rows[i] as unknown[];
        rawDataByGroup = buildRawDataByGroup(tableType, headers!, rowArr);
        rawData = flattenRawDataByGroup(rawDataByGroup);
        row = { ...rawData, _rawDataByGroup: rawDataByGroup };
      } else {
        row = rows[i] as FeituoRowData;
        rawData = (row && typeof row === 'object' && !Array.isArray(row)) ? (row as Record<string, unknown>) : {};
      }
      builtItems.push({ row, rawData, rawDataByGroup, excelIndex: i });
    }

    if (tableType === 1) {
      successCount = await this.runTable1ImportBatch(batch.id, builtItems, t1Repo, errors);
    } else {
      successCount = await this.runTable2ImportBatch(batch.id, builtItems, t2Repo, errors);
    }

    batch.successCount = successCount;
    batch.errorCount = errors.length;
    batch.errorDetails = errors;
    await batchRepo.save(batch);

    return {
      success: successCount,
      failed: errors.length,
      errors
    };
  }

  /** 表一：先逐行落库 staging + 状态子集；再按 (MBL,箱号) 合并行写发生地/船舶/核心表 */
  private async runTable1ImportBatch(
    batchId: number,
    items: FeituoBuiltExcelRow[],
    repo: ReturnType<typeof AppDataSource.getRepository<ExtFeituoImportTable1>>,
    errors: { row: number; error: string }[]
  ): Promise<number> {
    const canonicalByKey = new Map<string, FeituoRowData>();
    /** 子集3：MBL + 集装箱物流信息_集装箱号 → 原始行列表（LEFT JOIN 右表） */
    const rowsBySubset3Key = new Map<string, FeituoRowData[]>();
    /** 子集4：MBL + 船泊信息_* → 原始行列表（LEFT JOIN 右表，键为 MBL） */
    const rowsBySubset4Mbl = new Map<string, FeituoRowData[]>();
    for (const { row } of items) {
      const key = feituoBaselineKey(row);
      if (!key) continue;
      const ex = canonicalByKey.get(key);
      canonicalByKey.set(key, ex ? mergeFeituoRowDataPreferNonEmpty(ex, row) : row);
      const sk = subset3JoinKey(row);
      if (sk) {
        const list = rowsBySubset3Key.get(sk) || [];
        list.push(row);
        rowsBySubset3Key.set(sk, list);
      }
      const s4 = subset4MblKey(row);
      if (s4 !== null) {
        const list4 = rowsBySubset4Mbl.get(s4) || [];
        list4.push(row);
        rowsBySubset4Mbl.set(s4, list4);
      }
    }
    const resolveMblTable1 = (r: FeituoRowData) => {
      const cn = getContainerNumberFromRow(r);
      return getMblFromRow(r) || (cn ? `FEITUO_${cn}` : '');
    };
    const { enrichByMblPort: rowsBySubset2Key, placesListByMbl: subset2PlacesListByMbl } =
      buildSubset2MblPortMaps(items, resolveMblTable1);

    let success = 0;
    for (const item of items) {
      try {
        await this.persistTable1Staging(batchId, item.row, item.rawData, item.rawDataByGroup, repo);
        const containerNumber = getContainerNumberFromRow(item.row) as string;
        if (!containerNumber) throw new Error('缺少集装箱号');
        const mblNumber = getMblFromRow(item.row) || `FEITUO_${containerNumber}`;
        await this.saveStatusEventsSubset(batchId, item.row, mblNumber, containerNumber);
        success++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ row: item.excelIndex + 1, error: msg });
        logger.warn(`[FeituoImport] Row ${item.excelIndex + 1} failed:`, msg);
      }
    }

    for (const [key, canonical] of canonicalByKey) {
      try {
        const containerNumber = getContainerNumberFromRow(canonical);
        if (!containerNumber) continue;
        const mblNumber = getMblFromRow(canonical) || `FEITUO_${containerNumber}`;
        // 子集1（MBL+当前状态集装箱号） LEFT JOIN 子集3（MBL+集装箱物流信息_集装箱号+集装箱物流信息_*）
        // Join key: MBL + 箱号（与 feituoBaselineKey 一致）
        const joinKey = `${getMblFromRow(canonical) || ''}||${containerNumber}`;
        const subset3Rows = rowsBySubset3Key.get(joinKey) || [];
        if (subset3Rows.length > 0) {
          for (const r of subset3Rows) {
            const merged = mergeFeituoRowDataPreferNonEmpty(canonical, r);
            await this.savePlacesSubset(
              batchId,
              merged,
              mblNumber,
              containerNumber,
              rowsBySubset2Key,
              subset2PlacesListByMbl
            );
          }
        } else {
          await this.savePlacesSubset(
            batchId,
            canonical,
            mblNumber,
            containerNumber,
            rowsBySubset2Key,
            subset2PlacesListByMbl
          );
        }
        // 子集1（MBL+当前状态集装箱号） LEFT JOIN 子集4（MBL+船泊信息_*），Join key: MBL
        const mblKey = getMblFromRow(canonical) || '';
        const subset4Rows = rowsBySubset4Mbl.get(mblKey) || [];
        if (subset4Rows.length > 0) {
          for (const r of subset4Rows) {
            const mergedV = mergeFeituoRowDataPreferNonEmpty(canonical, r);
            await this.saveVesselsSubset(batchId, mergedV, mblNumber);
          }
        } else {
          await this.saveVesselsSubset(batchId, canonical, mblNumber);
        }
        await this.mergeTable1ToCore(canonical);
      } catch (err) {
        logger.warn(`[FeituoImport] 基准行合并后写入失败 (key=${key}):`, err);
      }
    }

    return success;
  }

  private async persistTable1Staging(
    batchId: number,
    row: FeituoRowData,
    rawData: Record<string, unknown>,
    rawDataByGroup: Record<string, Record<string, unknown>> | null,
    repo: ReturnType<typeof AppDataSource.getRepository<ExtFeituoImportTable1>>
  ): Promise<void> {
    const mbl = getMblFromRow(row);
    const containerNumber = getContainerNumberFromRow(row);
    if (!containerNumber) throw new Error('缺少集装箱号');
    const rec = repo.create({
      batchId,
      mblNumber: mbl,
      containerNumber,
      rawData,
      rawDataByGroup,
    });
    await repo.save(rec);
  }

  /** 表二：流程同表一 */
  private async runTable2ImportBatch(
    batchId: number,
    items: FeituoBuiltExcelRow[],
    repo: ReturnType<typeof AppDataSource.getRepository<ExtFeituoImportTable2>>,
    errors: { row: number; error: string }[]
  ): Promise<number> {
    const canonicalByKey = new Map<string, FeituoRowData>();
    /** 子集3：MBL + 集装箱物流信息_集装箱号 → 原始行列表（LEFT JOIN 右表） */
    const rowsBySubset3Key = new Map<string, FeituoRowData[]>();
    /** 子集4：MBL + 船泊信息_* → 原始行列表（LEFT JOIN 右表，键为 MBL） */
    const rowsBySubset4Mbl = new Map<string, FeituoRowData[]>();
    for (const { row } of items) {
      const key = feituoBaselineKey(row);
      if (!key) continue;
      const ex = canonicalByKey.get(key);
      canonicalByKey.set(key, ex ? mergeFeituoRowDataPreferNonEmpty(ex, row) : row);
      const sk = subset3JoinKey(row);
      if (sk) {
        const list = rowsBySubset3Key.get(sk) || [];
        list.push(row);
        rowsBySubset3Key.set(sk, list);
      }
      const s4 = subset4MblKey(row);
      if (s4 !== null) {
        const list4 = rowsBySubset4Mbl.get(s4) || [];
        list4.push(row);
        rowsBySubset4Mbl.set(s4, list4);
      }
    }
    const resolveMblTable2 = (r: FeituoRowData) => {
      const cn = getContainerNumberFromRow(r);
      if (!cn) return '';
      const bill = getVal(r, '基本信息_提单号', '提单号', '提单号（一）', 'bill_number');
      return getMblFromRow(r) || bill || `FEITUO_${cn}`;
    };
    const { enrichByMblPort: rowsBySubset2Key, placesListByMbl: subset2PlacesListByMbl } =
      buildSubset2MblPortMaps(items, resolveMblTable2);

    let success = 0;
    for (const item of items) {
      try {
        await this.persistTable2Staging(batchId, item.row, item.rawData, item.rawDataByGroup, repo);
        const containerNumber = getContainerNumberFromRow(item.row) as string;
        if (!containerNumber) throw new Error('缺少集装箱号');
        const billNumber = getVal(item.row, '基本信息_提单号', '提单号', '提单号（一）', 'bill_number');
        const mblFromRow = getMblFromRow(item.row);
        const mainBillForSubset = mblFromRow || billNumber || `FEITUO_${containerNumber}`;
        await this.saveStatusEventsSubset(batchId, item.row, mainBillForSubset, containerNumber);
        success++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ row: item.excelIndex + 1, error: msg });
        logger.warn(`[FeituoImport] Row ${item.excelIndex + 1} failed:`, msg);
      }
    }

    for (const [key, canonical] of canonicalByKey) {
      try {
        const containerNumber = getContainerNumberFromRow(canonical);
        if (!containerNumber) continue;
        const billNumber = getVal(canonical, '基本信息_提单号', '提单号', '提单号（一）', 'bill_number');
        const mblFromRow = getMblFromRow(canonical);
        const mainBillForSubset = mblFromRow || billNumber || `FEITUO_${containerNumber}`;
        // 子集1（MBL+当前状态集装箱号） LEFT JOIN 子集3（MBL+集装箱物流信息_集装箱号+集装箱物流信息_*）
        const joinKey = `${mblFromRow || ''}||${containerNumber}`;
        const subset3Rows = rowsBySubset3Key.get(joinKey) || [];
        if (subset3Rows.length > 0) {
          for (const r of subset3Rows) {
            const merged = mergeFeituoRowDataPreferNonEmpty(canonical, r);
            await this.savePlacesSubset(
              batchId,
              merged,
              mainBillForSubset,
              containerNumber,
              rowsBySubset2Key,
              subset2PlacesListByMbl
            );
          }
        } else {
          await this.savePlacesSubset(
            batchId,
            canonical,
            mainBillForSubset,
            containerNumber,
            rowsBySubset2Key,
            subset2PlacesListByMbl
          );
        }
        const mblKey4 = mblFromRow || '';
        const subset4Rows = rowsBySubset4Mbl.get(mblKey4) || [];
        if (subset4Rows.length > 0) {
          for (const r of subset4Rows) {
            const mergedV = mergeFeituoRowDataPreferNonEmpty(canonical, r);
            await this.saveVesselsSubset(batchId, mergedV, mainBillForSubset);
          }
        } else {
          await this.saveVesselsSubset(batchId, canonical, mainBillForSubset);
        }
        await this.mergeTable2ToCore(canonical);
      } catch (err) {
        logger.warn(`[FeituoImport] 表二基准行合并后写入失败 (key=${key}):`, err);
      }
    }

    return success;
  }

  private async persistTable2Staging(
    batchId: number,
    row: FeituoRowData,
    rawData: Record<string, unknown>,
    rawDataByGroup: Record<string, Record<string, unknown>> | null,
    repo: ReturnType<typeof AppDataSource.getRepository<ExtFeituoImportTable2>>
  ): Promise<void> {
    const billNumber = getVal(row, '基本信息_提单号', '提单号', '提单号（一）', 'bill_number');
    const containerNumber = getContainerNumberFromRow(row);
    if (!containerNumber) throw new Error('缺少集装箱号');
    const portCode = getVal(row, '港口代码', '港口代码（一）', 'port_code');
    const terminalCode = getVal(row, '码头代码', 'terminal_code');
    const rec = repo.create({
      batchId,
      billNumber,
      containerNumber,
      portCode,
      terminalCode,
      rawData,
      rawDataByGroup,
    });
    await repo.save(rec);
  }

  /** 表一合并到核心表 */
  private async mergeTable1ToCore(row: FeituoRowData): Promise<void> {
    const mbl = getMblFromRow(row) || getVal(row, '基本信息_提单号', '提单号');
    const containerNumber = getContainerNumberFromRow(row);
    if (!containerNumber) return;

    const containerRepo = AppDataSource.getRepository(Container);
    const seaFreightRepo = AppDataSource.getRepository(SeaFreight);
    const portOpRepo = AppDataSource.getRepository(PortOperation);
    const truckRepo = AppDataSource.getRepository(TruckingTransport);
    const emptyRepo = AppDataSource.getRepository(EmptyReturn);
    const eventRepo = AppDataSource.getRepository(ContainerStatusEvent);
    const containerTypeRepo = AppDataSource.getRepository(ContainerType);

    const bl = mbl || `FEITUO_${containerNumber}`;

    // 【重要】先创建/更新 sea_freight，再创建 container（因为 container.billOf_lading_number 外键依赖 sea_freight）

    // 查找已存在的 sea_freight（用于兜底匹配）
    let sf = await seaFreightRepo.findOne({ where: { billOfLadingNumber: bl } });

    // 使用 FeituoPlaceAnalyzer 分析港口类型
    const places = feituoPlaceAnalyzer.parsePlaceArray(row);
    const portAnalysis: PortAnalysisResult = feituoPlaceAnalyzer.analyzePorts(places, sf);

    const originPlace = portAnalysis.originPlace;
    const seaDestPlace = portAnalysis.seaDestPlace;
    const railDestPlace = portAnalysis.railDestPlace;
    const destPlace = seaDestPlace; // 统一变量名用于后续兼容

    // 查找 port_code（用于外键约束）
    const portOfLoadingCode = await this.findPortCode(originPlace?.code || originPlace?.nameCn || originPlace?.nameEn || getVal(row, '接货地名称（标准）', '接货地名称(标准)'));
    const portOfDischargeCode = await this.findPortCode(destPlace?.code || destPlace?.nameCn || destPlace?.nameEn || getVal(row, '交货地名称（标准）', '交货地名称(标准)'));
    if (!sf) {
      sf = seaFreightRepo.create({
        billOfLadingNumber: bl,
        mblNumber: mbl,  // 飞驼的 MBL Number 写入 mbl_number 字段
        mblScac: getVal(row, '船公司SCAC', 'SCAC'),
        shippingCompanyId: getVal(row, '船公司代码', '船公司', '承运人代码'),
        // 优先使用 port_code（外键要求），fallback 到名称
        portOfLoading: portOfLoadingCode || originPlace?.nameCn || originPlace?.nameEn || getVal(row, '接货地名称（标准）', '接货地名称(标准)', '起运港'),
        portOfDischarge: portOfDischargeCode || destPlace?.nameCn || destPlace?.nameEn || getVal(row, '交货地名称（标准）', '交货地名称(标准)', '目的港', '交货地'),
        vesselName: getVal(row, '船名', '船名/车牌号', '船名（海运）'),
        voyageNumber: getVal(row, '航次', '航次（海运）'),
        routeCode: getVal(row, '航线代码', '航线'),
        // 优先从数组获取出运日期，fallback 到直接列名
        // shipmentDate 和 actualLoadingDate 都使用相同的来源，确保两个字段都有值
        shipmentDate: parseDate(originPlace?.atd || originPlace?.etd || getVal(row, '接货地实际离开时间') || getVal(row, '实际装船时间', '装船日期', '出运日期')),
        // actualLoadingDate 优先级：1) 实际装船时间 2) 出运日期 (shipmentDate)
        // 重要：必须提供默认值，避免 NULL 违反 NOT NULL 约束
        actualLoadingDate: parseDate(
          originPlace?.actualLoading || 
          getVal(row, '实际装船时间') || 
          originPlace?.atd || 
          originPlace?.etd || 
          getVal(row, '接货地实际离开时间') || 
          getVal(row, '装船日期', '出运日期')
        ) || new Date(), // 如果所有来源都为空，使用当前日期作为默认值
        portOpenDate: parseDate(getVal(row, '开港时间', '开港日期')),
        portCloseDate: parseDate(getVal(row, '截港时间', '截港日期')),
        // 优先从数组获取ETA/ATA，fallback到直接列名
        eta: parseDate(destPlace?.eta || getVal(row, '交货地预计到达时间') || getVal(row, '目的地预计到达时间') || getVal(row, 5, '预计到达时间') || getVal(row, '预计到港日期', 'ETA')),
        ata: parseDate(destPlace?.ata || getVal(row, '交货地实际到达时间') || getVal(row, '目的地实际到达时间') || getVal(row, 5, '实际到达时间') || getVal(row, '目的港到达日期', 'ATA')),
        imoNumber: getVal(row, 'imo', 'IMO'),
        mmsiNumber: getVal(row, 'mmsi', 'MMSI'),
        flag: getVal(row, '船籍', '船籍国')
      });
      await seaFreightRepo.save(sf);
    }

    // 【重要】现在 sea_freight 已存在，可以安全创建/更新 container
    let container = await containerRepo.findOne({ where: { containerNumber } });
    if (!container) {
      const typeCode = normalizeContainerType(getVal(row, '箱型（飞驼标准）', '箱型', '箱型箱尺寸（标准化）'));
      const typeExists = await containerTypeRepo.exists({ where: { typeCode } });
      const finalType = typeExists ? typeCode : '40HC';

      container = containerRepo.create({
        containerNumber,
        containerTypeCode: finalType,
        billOfLadingNumber: bl,
        logisticsStatus: 'not_shipped',
        isRolled: parseBool(getVal(row, 11, '是否甩柜') || getVal(row, '是否甩柜')),
        currentStatusDescCn: getVal(row, 11, '当前状态中文描述') || getVal(row, '当前状态中文描述'),
        currentStatusDescEn: getVal(row, 11, '当前状态英文描述') || getVal(row, '当前状态英文描述'),
        sealNumber: getVal(row, 11, '铅封号') || getVal(row, '铅封号'),
        containerHolder: getVal(row, 14, '持箱人') || getVal(row, '持箱人'),
        tareWeight: parseFloat(String(getVal(row, 14, '箱皮重') || getVal(row, '箱皮重') || 0)) || undefined,
        totalWeight: parseFloat(String(getVal(row, 14, '箱总重') || getVal(row, '箱总重') || 0)) || undefined,
        overLength: parseFloat(String(getVal(row, 14, '超限长度') || getVal(row, '超限长度') || 0)) || undefined,
        overHeight: parseFloat(String(getVal(row, 14, '超高') || getVal(row, '超高') || 0)) || undefined,
        dangerClass: getVal(row, 14, '危险品等级') || getVal(row, '危险品等级') || undefined
      });
      await containerRepo.save(container);
    } else {
      // 更新逻辑：优先从数组更新，fallback 到直接列名
      // shipmentDate 和 actualLoadingDate 都应该有值，避免 NULL 违反约束
      if (!sf.shipmentDate) sf.shipmentDate = parseDate(originPlace?.atd || originPlace?.etd || getVal(row, '接货地实际离开时间') || getVal(row, '实际装船时间', '装船日期', '出运日期'));
      // actualLoadingDate 更新策略：优先使用实际装船时间，如果没有则使用出运日期作为 fallback
      if (!sf.actualLoadingDate) {
        sf.actualLoadingDate = parseDate(
          originPlace?.actualLoading || 
          getVal(row, '实际装船时间') || 
          originPlace?.atd || 
          originPlace?.etd || 
          getVal(row, '接货地实际离开时间') || 
          getVal(row, '装船日期', '出运日期')
        );
      }
      if (!sf.mblNumber && mbl) sf.mblNumber = mbl;  // 更新 mbl_number
      // 优先使用 port_code（外键要求），fallback 到名称，再fallback到直接列名
      if (!sf.portOfLoading) sf.portOfLoading = portOfLoadingCode || originPlace?.nameCn || originPlace?.nameEn || getVal(row, '接货地名称（标准）', '接货地名称(标准)', '起运港');
      if (!sf.portOfDischarge) sf.portOfDischarge = portOfDischargeCode || destPlace?.nameCn || destPlace?.nameEn || getVal(row, '交货地名称（标准）', '交货地名称(标准)', '目的港', '交货地');
      // 船公司信息
      if (!sf.shippingCompanyId) sf.shippingCompanyId = getVal(row, '船公司代码', '船公司', '承运人代码');
      if (!sf.vesselName) sf.vesselName = getVal(row, '船名', '船名/车牌号', '船名（海运）');
      if (!sf.voyageNumber) sf.voyageNumber = getVal(row, '航次', '航次（海运）');
      // ETA可以更新（预计日期可能会修正），ATA只更新空值（实际日期确定后不变化）
      sf.eta = parseDate(destPlace?.eta || getVal(row, '交货地预计到达时间') || getVal(row, '目的地预计到达时间') || getVal(row, 5, '预计到达时间') || getVal(row, '预计到港日期', 'ETA')) || sf.eta;

      // 【新增】ATA更新前智能验证
      const newAta = parseDate(destPlace?.ata || getVal(row, '交货地实际到达时间') || getVal(row, '目的地实际到达时间') || getVal(row, 5, '实际到达时间'));
      if (newAta && !sf.ata) {
        // 获取港口操作信息用于验证
        const portOps = await AppDataSource.getRepository(PortOperation).find({
          where: { containerNumber },
          order: { portSequence: 'DESC' }
        });
        const destPort = portOps.find(po => po.portType === 'destination');
        const previousPort = destPort ? portOps.filter(po => (po.portSequence ?? 0) < (destPort.portSequence ?? 0)).sort((a, b) => (b.portSequence ?? 0) - (a.portSequence ?? 0))[0] : undefined;
        const truckingTransport = await AppDataSource.getRepository(TruckingTransport).findOne({ where: { containerNumber } });
        const warehouseOperation = await AppDataSource.getRepository(WarehouseOperation).findOne({ where: { containerNumber } });

        const validationResult = feituoSmartDateUpdater.validateATA({
          ata: newAta,
          eta: destPort?.eta ?? null,
          shipDate: sf.shipmentDate ?? null,
          logisticsStatus: container.logisticsStatus,
          portType: destPort?.portType ?? null,
          portOperations: portOps.map(po => ({
            portSequence: po.portSequence ?? 0,
            portType: po.portType as 'origin' | 'transit' | 'destination',
            ata: po.ata,
            atd: po.atd,
            eta: po.eta,
            etd: po.etd,
          })),
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
          logger.warn(`[FeituoImport] ATA智能验证失败: ${validationResult.reason}, 跳过更新`, {
            containerNumber,
            newAta: newAta.toISOString(),
          });
        } else {
          if (validationResult.warnings && validationResult.warnings.length > 0) {
            logger.warn(`[FeituoImport] ATA智能验证警告:`, {
              containerNumber,
              warnings: validationResult.warnings,
            });
          }
          sf.ata = newAta;
        }
      }

      await seaFreightRepo.save(sf);
    }

    // 注意：飞驼导入不再更新备货单的 expectedShipDate，仅由原始导入逻辑处理

    if (!container.billOfLadingNumber) {
      container.billOfLadingNumber = bl;
      await containerRepo.save(container);
    }

    await this.upsertShippingCompanyWebsite(row);

    // 优先从数组获取目的港信息（已经在前面解析了places）
    const destPort = destPlace?.nameCn || destPlace?.nameEn || getVal(row, '交货地名称（标准）') || getVal(row, 5, '地点CODE') || getVal(row, '交货地地点CODE');
    if (destPort) {
      // 查找 port_code（用于外键约束）- 只在找到有效 port_code 时才设置
      const destPortCode = await this.findPortCode(destPlace?.code || getVal(row, '交货地地点CODE') || getVal(row, 5, '地点CODE') || destPort);
      let po = await portOpRepo
        .createQueryBuilder('p')
        .where('p.container_number = :cn', { cn: containerNumber })
        .andWhere('p.port_type = :pt', { pt: 'destination' })
        .getOne();
      if (!po) {
        po = portOpRepo.create({
          id: `feituo_${containerNumber}_dest_${Date.now()}`,
          containerNumber,
          portType: 'destination',
          portName: destPort,
          portSequence: 1
        });
        // 只在找到有效 port_code 时才设置
        if (destPortCode) {
          po.portCode = destPortCode;
        }
      }
      // 【海铁联运优化】ETA/ATA区分处理：
      // 1. 海港ETA/ATA（seaDestPlace）：用于滞港费计算
      // 2. 火车目的地ETA/ATA（railDestPlace）：用于海铁联运跟踪
      // 使用smartUpdateETA进行智能更新（带状态机验证）
      const newEta = parseDate(seaDestPlace?.eta || destPlace?.eta || getVal(row, '交货地预计到达时间') || getVal(row, '目的地预计到达时间') || getVal(row, 5, '预计到达时间') || getVal(row, '预计到港日期'));
      const newAta = parseDate(seaDestPlace?.ata || destPlace?.ata || getVal(row, '交货地实际到达时间') || getVal(row, '目的地实际到达时间') || getVal(row, 5, '实际到达时间') || getVal(row, '目的港到达日期'));

      // 调用smartUpdateETA进行智能更新（带状态机验证）
      const etaUpdateResult = await feituoSmartDateUpdater.smartUpdateETA(containerNumber, newEta, newAta);
      if (etaUpdateResult.updated) {
        logger.info(`[FeituoImport] ${containerNumber} smartETA update: ${etaUpdateResult.reason}`);
      }

      // 火车目的地ETA（海铁联运）：更新到 transitArrivalDate，只更新空值
      if (railDestPlace && !po.transitArrivalDate) {
        po.transitArrivalDate = parseDate(railDestPlace?.eta);
      }

      // 实际卸船日：只更新空值
      if (!po.destPortUnloadDate) {
        po.destPortUnloadDate = parseDate(seaDestPlace?.actualDischarge || destPlace?.actualDischarge || getVal(row, '实际卸船时间', '目的港卸船/火车日期'));
      }
      po.gateInTerminal = destPlace?.terminal || getVal(row, '交货地码头名称') || getVal(row, 5, '码头名称') || po.gateInTerminal;
      await portOpRepo.save(po);
    }

    // 【新增】即使 places 数组为空，也尝试从直接列名更新目的港的 port_operations 时间字段
    if (!destPlace) {
      const destPo = await portOpRepo
        .createQueryBuilder('p')
        .where('p.container_number = :cn', { cn: containerNumber })
        .andWhere('p.port_type = :pt', { pt: 'destination' })
        .getOne();
      if (destPo) {
        let updated = false;
        // ETA
        if (!destPo.eta) {
          const eta = parseDate(getVal(row, '交货地预计到达时间') || getVal(row, '目的地预计到达时间') || getVal(row, '预计到港日期'));
          if (eta) { destPo.eta = eta; updated = true; }
        }
        // ATA
        if (!destPo.ata) {
          const ata = parseDate(getVal(row, '交货地实际到达时间') || getVal(row, '目的地实际到达时间') || getVal(row, '目的港到达日期'));
          if (ata) { destPo.ata = ata; updated = true; }
        }
        // 卸船日
        if (!destPo.destPortUnloadDate) {
          const unloadDate = parseDate(getVal(row, '实际卸船时间') || getVal(row, '卸船时间'));
          if (unloadDate) { destPo.destPortUnloadDate = unloadDate; updated = true; }
        }
        // gateInTime
        if (!destPo.gateInTime) {
          const gateInTime = parseDate(getVal(row, '重箱进场时间'));
          if (gateInTime) { destPo.gateInTime = gateInTime; updated = true; }
        }
        // lastFreeDate
        if (!destPo.lastFreeDate) {
          const lastFreeDate = parseDate(getVal(row, '免费提箱截止日'));
          if (lastFreeDate) { destPo.lastFreeDate = lastFreeDate; updated = true; }
        }
        // availableTime
        if (!destPo.availableTime) {
          const availableTime = parseDate(getVal(row, '可提箱日期'));
          if (availableTime) { destPo.availableTime = availableTime; updated = true; }
        }
        // gateOutTime
        if (!destPo.gateOutTime) {
          const gateOutTime = parseDate(getVal(row, '实际提箱日期') || getVal(row, '出场时间'));
          if (gateOutTime) { destPo.gateOutTime = gateOutTime; updated = true; }
        }
        if (updated) {
          await portOpRepo.save(destPo);
        }
      }
    }

    const pickupDate = parseDate(getVal(row, '提柜日期', '实际提箱日期'));
    if (pickupDate) {
      let tt = await truckRepo.findOne({ where: { containerNumber } });
      if (!tt) {
        tt = truckRepo.create({ containerNumber });
      }
      tt.pickupDate = pickupDate;
      tt.pickupDateSource = PICKUP_DATE_SOURCE.BUSINESS;
      tt.plannedPickupDate = parseDate(getVal(row, '计划提柜日期')) || tt.plannedPickupDate;
      tt.lastPickupDate = parseDate(getVal(row, '最晚提柜日期')) || tt.lastPickupDate;
      await truckRepo.save(tt);
    }

    const returnTime = parseDate(getVal(row, '还箱日期'));
    if (returnTime) {
      let er = await emptyRepo.findOne({ where: { containerNumber } });
      if (!er) er = emptyRepo.create({ containerNumber });
      er.returnTime = returnTime;
      er.lastReturnDate = parseDate(getVal(row, '最晚还箱日期')) || er.lastReturnDate;
      await emptyRepo.save(er);
    }

    try {
      const fromExt = await externalDataService.ingestFromExtFeituoStatusEvents(
        containerNumber,
        bl,
        DataSource.EXCEL
      );
      if (fromExt.length === 0) {
        await this.mergeStatusEvents(row, containerNumber, eventRepo, 1);
      }
    } catch (e) {
      logger.error(`[FeituoImport] ingestFromExt/mergeStatusEvents 失败 ${containerNumber}:`, e);
      try {
        await this.mergeStatusEvents(row, containerNumber, eventRepo, 1);
      } catch (e2) {
        logger.error(`[FeituoImport] mergeStatusEvents 兜底失败 ${containerNumber}:`, e2);
      }
    }

    // 处理发生地信息数组（已在上面解析）
    if (places.length > 0) {
      await this.processPlaceArray(containerNumber, places);
    }

    await this.recalculateStatus(containerNumber);
    await this.persistContainerAlertsAfterMerge(containerNumber);
  }

  /** 表二合并到核心表 */
  private async mergeTable2ToCore(row: FeituoRowData): Promise<void> {
    const containerNumber = getContainerNumberFromRow(row);
    if (!containerNumber) return;

    // 【优化】提单号优先级：MBL Number > 提单号 > FEITUO_前缀
    // MBL是主提单号，同一货主/同一航次共用同一个MBL
    const mblNumber = getMblFromRow(row);
    const billNumberFromRow = getVal(row, '基本信息_提单号', '提单号', '提单号（一）');
    // 优先使用MBL作为主提单号（海运主单），如果没有则使用提单号，都没有才用FEITUO_前缀
    const mainBillNumber = mblNumber || billNumberFromRow || `FEITUO_${containerNumber}`;
    const hblNumber = getVal(row, '基本信息_HBL Number', 'HBL Number', 'HBL Number（一）', 'HBLNumber');  // 获取 HBL

    const containerRepo = AppDataSource.getRepository(Container);
    const seaFreightRepo = AppDataSource.getRepository(SeaFreight);
    const portOpRepo = AppDataSource.getRepository(PortOperation);
    const truckRepo = AppDataSource.getRepository(TruckingTransport);
    const eventRepo = AppDataSource.getRepository(ContainerStatusEvent);
    const containerTypeRepo = AppDataSource.getRepository(ContainerType);

    // 【重要】先创建/更新 sea_freight，再创建 container（因为 container.bill_of_lading_number 外键依赖 sea_freight）

    // 查找已存在的 sea_freight（优先用MBL匹配，兜底用提单号）
    let sf = await seaFreightRepo.findOne({ where: { billOfLadingNumber: mainBillNumber } });

    // 使用 FeituoPlaceAnalyzer 分析港口类型
    const places = feituoPlaceAnalyzer.parsePlaceArray(row);
    const portAnalysis: PortAnalysisResult = feituoPlaceAnalyzer.analyzePorts(places, sf);

    const originPlace = portAnalysis.originPlace;
    const seaDestPlace = portAnalysis.seaDestPlace;
    const railDestPlace = portAnalysis.railDestPlace;
    const destPlace = seaDestPlace; // 统一变量名用于后续兼容

    // 查找 port_code（用于外键约束）
    const portOfLoadingCode2 = await this.findPortCode(originPlace?.code || originPlace?.nameCn || originPlace?.nameEn);
    const portOfDischargeCode2 = await this.findPortCode(destPlace?.code || destPlace?.nameCn || destPlace?.nameEn);

    if (!sf) {
      sf = seaFreightRepo.create({
        billOfLadingNumber: mainBillNumber,
        mblNumber,  // 写入 MBL Number
        hblNumber,  // 写入 HBL Number
        mblScac: getVal(row, '船公司SCAC'),
        shippingCompanyId: getVal(row, '船公司代码'),
        vesselName: getVal(row, '船名'),
        voyageNumber: getVal(row, '航次'),
        // 优先使用 port_code（外键要求），fallback 到名称，再fallback到直接列名
        portOfLoading: portOfLoadingCode2 || originPlace?.nameCn || originPlace?.nameEn || getVal(row, '接货地名称（标准）', '接货地名称(标准)'),
        portOfDischarge: portOfDischargeCode2 || destPlace?.nameCn || destPlace?.nameEn || getVal(row, '交货地名称（标准）', '交货地名称(标准)'),
        // 优先从 places 数组获取，fallback 到直接列名
        // shipmentDate 和 actualLoadingDate 都使用相同的来源，确保两个字段都有值
        shipmentDate: parseDate(originPlace?.atd || originPlace?.etd || getVal(row, '接货地实际离开时间') || getVal(row, '实际装船时间') || getVal(row, '装船日期') || getVal(row, '出运日期')),
        // actualLoadingDate 优先级：1) 实际装船时间 2) 出运日期 (shipmentDate)
        // 重要：必须提供默认值，避免 NULL 违反 NOT NULL 约束
        actualLoadingDate: parseDate(
          originPlace?.actualLoading || 
          getVal(row, '实际装船时间') || 
          originPlace?.atd || 
          originPlace?.etd || 
          getVal(row, '接货地实际离开时间') || 
          getVal(row, '装船日期', '出运日期')
        ) || new Date(), // 如果所有来源都为空，使用当前日期作为默认值
        eta: parseDate(destPlace?.eta || getVal(row, '交货地预计到达时间') || getVal(row, '目的地预计到达时间') || getVal(row, 5, '预计到达时间') || getVal(row, '预计到港日期')),
        ata: parseDate(destPlace?.ata || getVal(row, '交货地实际到达时间') || getVal(row, '目的地实际到达时间') || getVal(row, 5, '实际到达时间') || getVal(row, '目的港到达日期'))
      });
      await seaFreightRepo.save(sf);
    }

    // 【重要】现在 sea_freight 已存在，可以安全创建/更新 container
    let container = await containerRepo.findOne({ where: { containerNumber } });
    if (!container) {
      const typeCode = normalizeContainerType(getVal(row, '箱型（飞驼标准）', '箱型', '箱型箱尺寸（标准化）'));
      const typeExists = await containerTypeRepo.exists({ where: { typeCode } });
      container = containerRepo.create({
        containerNumber,
        containerTypeCode: typeExists ? typeCode : '40HC',
        billOfLadingNumber: mainBillNumber,
        logisticsStatus: 'not_shipped',
        isRolled: parseBool(getVal(row, '是否用柜', '是否甩柜'))
      });
      await containerRepo.save(container);
    } else {
      // 更新已存在的记录：优先从数组更新
      if (!sf.mblNumber && mblNumber) sf.mblNumber = mblNumber;
      if (!sf.hblNumber && hblNumber) sf.hblNumber = hblNumber;
      // 优先使用 port_code（外键要求），fallback 到名称
      if (!sf.portOfLoading) sf.portOfLoading = portOfLoadingCode2 || originPlace?.nameCn || originPlace?.nameEn || undefined;
      if (!sf.portOfDischarge) sf.portOfDischarge = portOfDischargeCode2 || destPlace?.nameCn || destPlace?.nameEn || undefined;
      if (!sf.shipmentDate) sf.shipmentDate = parseDate(originPlace?.atd || originPlace?.etd || undefined);
      // ETA可以更新（预计日期可能会修正），ATA只更新空值
      sf.eta = parseDate(destPlace?.eta || undefined) || sf.eta;
      if (!sf.ata) sf.ata = parseDate(destPlace?.ata || undefined);
      await seaFreightRepo.save(sf);

      // 使用smartUpdateETA进行智能更新（带状态机验证）
      const newEta = parseDate(destPlace?.eta || undefined);
      const newAta = parseDate(destPlace?.ata || undefined);
      const etaUpdateResult = await feituoSmartDateUpdater.smartUpdateETA(containerNumber, newEta, newAta);
      if (etaUpdateResult.updated) {
        logger.info(`[FeituoImport] ${containerNumber} smartETA update (Table2): ${etaUpdateResult.reason}`);
      }
    }

    await this.upsertShippingCompanyWebsite(row);

    const portCode = getVal(row, '港口代码');
    const terminalCode = getVal(row, '码头代码');
    const terminalName = getVal(row, '码头名称');
    const portName = getVal(row, '港口名');

    // 查找 port_code（用于外键约束）- 只在找到有效 port_code 时才设置
    const validatedPortCode = await this.findPortCode(portCode || portName);

    let po = await portOpRepo
      .createQueryBuilder('p')
      .where('p.container_number = :cn', { cn: containerNumber })
      .andWhere('p.port_type = :pt', { pt: 'destination' })
      .getOne();
    if (!po) {
      po = portOpRepo.create({
        id: `feituo_${containerNumber}_dest_${Date.now()}`,
        containerNumber,
        portType: 'destination',
        portName,
        portSequence: 1
      });
      // 只在找到有效 port_code 时才设置
      if (validatedPortCode) {
        po.portCode = validatedPortCode;
      }
    }
    // 只更新空值：避免覆盖已有数据
    if (!po.destPortUnloadDate) po.destPortUnloadDate = parseDate(getVal(row, '卸船时间'));
    if (!po.gateInTime) po.gateInTime = parseDate(getVal(row, '重箱进场时间'));
    if (!po.lastFreeDate) po.lastFreeDate = parseDate(getVal(row, '免费提箱截止日'));
    if (!po.availableTime) po.availableTime = parseDate(getVal(row, '可提箱日期'));
    if (!po.gateOutTime) po.gateOutTime = parseDate(getVal(row, '实际提箱日期', '出场时间'));
    if (!po.gateInTerminal) po.gateInTerminal = terminalCode || terminalName;
    await portOpRepo.save(po);

    const pickupDate = parseDate(getVal(row, '实际提箱日期'));
    if (pickupDate) {
      let tt = await truckRepo.findOne({ where: { containerNumber } });
      if (!tt) tt = truckRepo.create({ containerNumber });
      tt.pickupDate = pickupDate;
      tt.pickupDateSource = PICKUP_DATE_SOURCE.BUSINESS;
      tt.plannedPickupDate = parseDate(getVal(row, '卡车预约提柜时间')) || tt.plannedPickupDate;
      await truckRepo.save(tt);
    }

    const holdType = getVal(row, 'HOLD类型');
    const holdStatus = getVal(row, 'HOLD状态');
    const isReleased = /^release$/i.test(String(holdStatus || '').trim());
    if (isReleased) {
      po.customsStatus = 'RELEASED';
      po.customsRemarks = getVal(row, 'HOLD描述') || po.customsRemarks;
      await portOpRepo.save(po);
    } else if (holdType) {
      po.customsStatus =
        holdType === 'CUS'
          ? 'CUSTOMS_HOLD'
          : holdType === 'TML'
            ? 'TERMINAL_HOLD'
            : holdType === 'SRM'
              ? 'CARRIER_HOLD'
              : po.customsStatus;
      po.customsRemarks = getVal(row, 'HOLD描述') || po.customsRemarks;
      await portOpRepo.save(po);
    }

    try {
      const fromExt2 = await externalDataService.ingestFromExtFeituoStatusEvents(
        containerNumber,
        mainBillNumber,
        DataSource.EXCEL
      );
      if (fromExt2.length === 0) {
        await this.mergeStatusEvents(row, containerNumber, eventRepo, 2);
      }
    } catch (e) {
      logger.error(`[FeituoImport] 表二 ingestFromExt/mergeStatusEvents 失败 ${containerNumber}:`, e);
      try {
        await this.mergeStatusEvents(row, containerNumber, eventRepo, 2);
      } catch (e2) {
        logger.error(`[FeituoImport] 表二 mergeStatusEvents 兜底失败 ${containerNumber}:`, e2);
      }
    }
    await this.deriveStatusEventsFromTable2TimeFields(row, containerNumber, eventRepo);

    // 处理发生地信息数组（已在上面解析）
    if (places.length > 0) {
      await this.processPlaceArray(containerNumber, places);
    }

    // 【新增】即使 places 数组为空，也尝试从直接列名更新目的港的 port_operations 时间字段（表二）
    if (!seaDestPlace && !railDestPlace) {
      const portOpRepo = AppDataSource.getRepository(PortOperation);
      const destPo = await portOpRepo
        .createQueryBuilder('p')
        .where('p.container_number = :cn', { cn: containerNumber })
        .andWhere('p.port_type = :pt', { pt: 'destination' })
        .getOne();
      if (destPo) {
        let updated = false;
        // ETA
        if (!destPo.eta) {
          const eta = parseDate(getVal(row, '交货地预计到达时间') || getVal(row, '目的地预计到达时间') || getVal(row, '预计到港日期'));
          if (eta) { destPo.eta = eta; updated = true; }
        }
        // ATA
        if (!destPo.ata) {
          const ata = parseDate(getVal(row, '交货地实际到达时间') || getVal(row, '目的地实际到达时间') || getVal(row, '目的港到达日期'));
          if (ata) { destPo.ata = ata; updated = true; }
        }
        // 卸船日
        if (!destPo.destPortUnloadDate) {
          const unloadDate = parseDate(getVal(row, '卸船时间') || getVal(row, '实际卸船时间'));
          if (unloadDate) { destPo.destPortUnloadDate = unloadDate; updated = true; }
        }
        // gateInTime
        if (!destPo.gateInTime) {
          const gateInTime = parseDate(getVal(row, '重箱进场时间'));
          if (gateInTime) { destPo.gateInTime = gateInTime; updated = true; }
        }
        // lastFreeDate
        if (!destPo.lastFreeDate) {
          const lastFreeDate = parseDate(getVal(row, '免费提箱截止日'));
          if (lastFreeDate) { destPo.lastFreeDate = lastFreeDate; updated = true; }
        }
        // availableTime
        if (!destPo.availableTime) {
          const availableTime = parseDate(getVal(row, '可提箱日期'));
          if (availableTime) { destPo.availableTime = availableTime; updated = true; }
        }
        // gateOutTime
        if (!destPo.gateOutTime) {
          const gateOutTime = parseDate(getVal(row, '实际提箱日期') || getVal(row, '出场时间'));
          if (gateOutTime) { destPo.gateOutTime = gateOutTime; updated = true; }
        }
        if (updated) {
          await portOpRepo.save(destPo);
        }
      }
    }

    await this.recalculateStatus(containerNumber);
    await this.persistContainerAlertsAfterMerge(containerNumber);
  }

  /**
   * 表二无 状态代码/状态发生时间 时，从时间字段推导并写入状态事件
   * 飞驼表二常见格式只有 卸船时间、实际提箱日期 等，无状态事件列
   */
  private async deriveStatusEventsFromTable2TimeFields(
    row: FeituoRowData,
    containerNumber: string,
    eventRepo: ReturnType<typeof AppDataSource.getRepository<ContainerStatusEvent>>
  ): Promise<void> {
    const location = getVal(row, 1, '港口代码', '港口名') || getVal(row, '港口代码', '港口名') || undefined;
    const derived: { statusCode: string; occurredAt: Date; statusName: string }[] = [];

    const gateInTime = parseDate(getVal(row, 1, '重箱进场时间') || getVal(row, '重箱进场时间'));
    if (gateInTime) derived.push({ statusCode: 'GTIN', occurredAt: gateInTime, statusName: '进港' });

    const unloadTime = parseDate(getVal(row, 1, '卸船时间') || getVal(row, '卸船时间'));
    if (unloadTime) derived.push({ statusCode: 'DSCH', occurredAt: unloadTime, statusName: '卸船' });

    const availableTime = parseDate(getVal(row, 1, '可提箱日期') || getVal(row, '可提箱日期'));
    if (availableTime) derived.push({ statusCode: 'PCAB', occurredAt: availableTime, statusName: '可提货' });

    const gateOutTime = parseDate(getVal(row, 1, '实际提箱日期', '出场时间') || getVal(row, '实际提箱日期', '出场时间'));
    if (gateOutTime) derived.push({ statusCode: 'GTOT', occurredAt: gateOutTime, statusName: '提柜' });

    for (const d of derived) {
      const existing = await eventRepo.findOne({
        where: { containerNumber, statusCode: d.statusCode, occurredAt: d.occurredAt }
      });
      if (existing) continue;

      const event = eventRepo.create({
        containerNumber,
        statusCode: d.statusCode,
        statusName: d.statusName,
        occurredAt: d.occurredAt,
        location: location ?? null,
        description: d.statusName,
        dataSource: 'Feituo',
        rawData: { derivedFrom: 'table2_time_fields' }
      });
      await eventRepo.save(event);
      logger.info(`[FeituoImport] 推导状态事件: ${containerNumber} ${d.statusCode} @ ${d.occurredAt.toISOString()}`);
    }
}

  /**
   * 解析状态信息数组
   * 遍历所有状态组（第12组起），每组一条状态记录
   */
  private parseStatusArray(row: FeituoRowData, tableType: 1 | 2): ExcelStatusInfo[] {
    const statuses: ExcelStatusInfo[] = [];
    const startGroup = tableType === 1 ? 12 : 14;
    const maxGroups = 30;

    for (let group = startGroup; group < startGroup + maxGroups; group++) {
      const statusCode = getVal(row, group, '状态代码') || getVal(row, group, '当前状态代码');
      if (!statusCode) continue;

      const occurredAt = parseDate(getVal(row, group, '状态发生时间') || getVal(row, group, '发生时间'));
      if (!occurredAt) continue;

      const isEsti = getVal(row, group, '是否预计') || getVal(row, group, '是否已发生');

      statuses.push({
        group,
        vesselName: getVal(row, group, '船名/车牌号') || undefined,
        voyageNumber: getVal(row, group, '航次') || undefined,
        transportMode: getVal(row, group, '运输方式') || undefined,
        statusCode,
        statusName: getVal(row, group, '状态描述中文（标准）') || getVal(row, group, '状态描述中文(标准)') || statusCode,
        occurredAt,
        eventPlace: getVal(row, group, '发生地') || getVal(row, group, 'event_place') || undefined,
        eventPlaceOrigin: getVal(row, group, '发生地原文') || getVal(row, group, 'event_place_origin') || undefined,
        portCode: getVal(row, group, '发生地信息_地点CODE') || getVal(row, group, '港口代码') || getVal(row, group, 'port_code') || undefined,
        location:
          getVal(row, group, '发生地') ||
          getVal(row, group, 'event_place') ||
          getVal(row, group, '发生地原文') ||
          getVal(row, group, 'event_place_origin') ||
          getVal(row, group, '发生地信息_地点CODE') ||
          getVal(row, group, '港口代码') ||
          undefined,
        terminal: getVal(row, group, '码头名称') || getVal(row, group, 'terminal_name') || undefined,
        isEstimated: isEsti === 'Y' || isEsti === 'true',
        dataSource: getVal(row, group, '数据来源') || 'Feituo',
      });
    }

    return statuses;
  }

  /**
   * 根据地点类型获取港口操作记录的port_type
   */
  private getPortTypeFromPlaceType(placeType: string | undefined): 'origin' | 'transit' | 'destination' | null {
    if (!placeType) return null;

    if (placeType.includes('起始地') || placeType.includes('起运港')) {
      return 'origin';
    }
    if (placeType.includes('目的港预计')) {
      return 'transit';
    }
    if (placeType.includes('中转港') || placeType.includes('中转')) {
      return 'transit';
    }
    if (
      placeType.includes('目的地') ||
      placeType.includes('目的港') ||
      placeType.includes('交货地')
    ) {
      return 'destination';
    }
    return null;
  }

  /**
   * 处理发生地信息数组 → 写入 process_port_operations
   */
  private async processPlaceArray(containerNumber: string, places: ExcelPlaceInfo[]): Promise<void> {
    const portOpRepo = AppDataSource.getRepository(PortOperation);
    const containerRepo = AppDataSource.getRepository(Container);

    for (const place of places) {
      const portType = this.getPortTypeFromPlaceType(place.placeType);
      if (!portType) continue;

      // 查找已存在的港口操作记录
      let portOp = await portOpRepo.findOne({
        where: { containerNumber, portType, portSequence: place.sequence }
      });

      if (!portOp) {
        portOp = portOpRepo.create({
          id: `feituo_${containerNumber}_${portType}_${place.sequence}_${Date.now()}`,
          containerNumber,
          portType,
          portSequence: place.sequence,
        });
      }

      // 写入公共字段
      // 查找 port_code（用于外键约束）- 只在找到有效 port_code 时才设置
      const validatedPortCode = await this.findPortCode(place.code || place.nameCn || place.nameEn);
      if (validatedPortCode) {
        portOp.portCode = validatedPortCode;
      }
      portOp.portName = place.nameCn || place.nameEn || place.code;
      portOp.portNameEn = place.nameEn;
      portOp.portNameCn = place.nameCn;
      portOp.gateInTerminal = place.terminal;
      portOp.dataSource = 'Feituo';

      // 根据portType写入时间字段
      if (portType === 'origin') {
        // 起运港：实际装船时间写入海运表
        if (place.actualLoading) {
          const container = await containerRepo.findOne({ where: { containerNumber } });
          const bl = container?.billOfLadingNumber;
          if (bl) {
            const sf = await AppDataSource.getRepository(SeaFreight).findOne({ where: { billOfLadingNumber: bl } });
            if (sf) {
              sf.actualLoadingDate = place.actualLoading;
              await AppDataSource.getRepository(SeaFreight).save(sf);
            }
          }
        }
      } else if (portType === 'transit') {
        // 中转港
        portOp.transitArrivalDate = place.ata || place.eta;
        portOp.atdTransit = place.atd || place.etd;
      } else if (portType === 'destination') {
        // 目的港
        portOp.eta = place.eta;
        portOp.ata = place.ata;
        portOp.destPortUnloadDate = place.actualDischarge;
      }

      await portOpRepo.save(portOp);
    }
  }

  /**
   * 根据运输方式判断是海运还是陆运，更新对应表的船名/车牌号
   */
  private async updateVesselOrTruckPlate(
    containerNumber: string,
    vesselName?: string,
    voyageNumber?: string,
    transportMode?: string
  ): Promise<void> {
    if (!vesselName && !voyageNumber && !transportMode) return;

    const containerRepo = AppDataSource.getRepository(Container);
    const container = await containerRepo.findOne({ where: { containerNumber } });
    const bl = container?.billOfLadingNumber;
    if (!bl) return;

    const sfRepo = AppDataSource.getRepository(SeaFreight);
    const sf = await sfRepo.findOne({ where: { billOfLadingNumber: bl } });
    if (!sf) return;

    // 判断运输方式
    const isOcean = !transportMode ||
      transportMode.toUpperCase().includes('VESSEL') ||
      transportMode.toUpperCase().includes('海运') ||
      transportMode.toUpperCase().includes('船');

    if (isOcean) {
      // 海运：更新 process_sea_freight
      let updated = false;
      if (vesselName && !sf.vesselName) {
        sf.vesselName = vesselName;
        updated = true;
      }
      if (voyageNumber && !sf.voyageNumber) {
        sf.voyageNumber = voyageNumber;
        updated = true;
      }
      if (transportMode && !sf.transportMode) {
        sf.transportMode = transportMode;
        updated = true;
      }
      if (updated) {
        await sfRepo.save(sf);
      }
    } else {
      // 陆运：更新 process_trucking_transport
      const ttRepo = AppDataSource.getRepository(TruckingTransport);
      let tt = await ttRepo.findOne({ where: { containerNumber } });
      if (!tt) {
        tt = ttRepo.create({ containerNumber });
      }

      if (vesselName && !tt.truckPlate) {
        tt.truckPlate = vesselName; // 陆运时船名/车牌号字段写入truck_plate
      }
      await ttRepo.save(tt);
    }
  }

  /**
   * 处理状态信息数组 → 写入 ext_container_status_events + 更新核心时间字段
   */
  private async processStatusArray(
    containerNumber: string,
    statuses: ExcelStatusInfo[]
  ): Promise<void> {
    const eventRepo = AppDataSource.getRepository(ContainerStatusEvent);

    for (const status of statuses) {
      // 检查是否已存在（避免重复）
      const existing = await eventRepo.findOne({
        where: {
          containerNumber,
          statusCode: status.statusCode,
          occurredAt: status.occurredAt
        }
      });
      if (existing) continue;

      // 创建状态事件记录
      const event = eventRepo.create({
        containerNumber,
        statusCode: status.statusCode,
        statusName: status.statusName,
        occurredAt: status.occurredAt!,
        location: status.location,
        terminalName: status.terminal,
        description: status.statusName,
        dataSource: status.dataSource,
        rawData: {
          group: status.group,
          isEstimated: status.isEstimated,
          event_place: status.eventPlace ?? null,
          event_place_origin: status.eventPlaceOrigin ?? null,
          port_code: status.portCode ?? null,
          terminal_name: status.terminal ?? null
        }
      });
      await eventRepo.save(event);

      // 更新船名/航次/运输方式
      await this.updateVesselOrTruckPlate(
        containerNumber,
        status.vesselName,
        status.voyageNumber,
        status.transportMode
      );

      // 非预计状态：更新核心时间字段
      if (!status.isEstimated && status.occurredAt) {
        await this.updateCoreFieldsFromStatus(containerNumber, status.statusCode, status.occurredAt);
      }
    }
  }

  /**
   * 根据状态码更新核心时间字段
   */
  private async updateCoreFieldsFromStatus(
    containerNumber: string,
    statusCode: string,
    occurredAt: Date
  ): Promise<void> {
    const fieldName = getCoreFieldName(statusCode);
    if (!fieldName) return;

    const poRepo = AppDataSource.getRepository(PortOperation);
    const erRepo = AppDataSource.getRepository(EmptyReturn);
    const containerRepo = AppDataSource.getRepository(Container);
    const ttRepo = AppDataSource.getRepository(TruckingTransport);

    if (fieldName === 'return_time') {
      let er = await erRepo.findOne({ where: { containerNumber } });
      if (!er) er = erRepo.create({ containerNumber });
      er.returnTime = occurredAt;
      await erRepo.save(er);
    } else if (fieldName === 'shipment_date') {
      const container = await containerRepo.findOne({ where: { containerNumber } });
      const bl = container?.billOfLadingNumber;
      if (bl) {
        const sf = await AppDataSource.getRepository(SeaFreight).findOne({ where: { billOfLadingNumber: bl } });
        if (sf) {
          sf.shipmentDate = occurredAt;
          await AppDataSource.getRepository(SeaFreight).save(sf);
        }
      }
    } else {
      const portType = ['transit_arrival_date', 'atd'].includes(fieldName) ? 'transit' : 'destination';
      const po = await poRepo
        .createQueryBuilder('p')
        .where('p.container_number = :cn', { cn: containerNumber })
        .andWhere('p.port_type = :pt', { pt: portType })
        .getOne();
      if (po) {
        const map: Record<string, keyof PortOperation> = {
          ata: 'ataDestPort',
          eta: 'etaDestPort',
          gate_in_time: 'gateInTime',
          gate_out_time: 'gateOutTime',
          dest_port_unload_date: 'destPortUnloadDate',
          available_time: 'availableTime',
          transit_arrival_date: 'transitArrivalDate',
          atd: 'atdTransit'
        };
        const col = map[fieldName];
        if (col) {
          (po as any)[col] = occurredAt;
          await poRepo.save(po);

          if (fieldName === 'gate_out_time' && col === 'gateOutTime') {
            const tt = await ttRepo.findOne({ where: { containerNumber } });
            const applied = tryApplyFeituoPickupFromGateOutEvent({
              trucking: tt,
              containerNumber,
              eventTime: occurredAt,
              statusCode,
              createTrucking: () => ttRepo.create({ containerNumber })
            });
            if (applied.updated && applied.trucking) {
              await ttRepo.save(applied.trucking);
            }
          }
        }
      }
    }
  }

  /**
   * 合并状态事件（遍历所有状态组）
   */
  private async mergeStatusEvents(
    row: FeituoRowData,
    containerNumber: string,
    eventRepo: ReturnType<typeof AppDataSource.getRepository<ContainerStatusEvent>>,
    tableType: 1 | 2
  ): Promise<void> {
    // 解析状态信息数组
    const statuses = this.parseStatusArray(row, tableType);
    if (statuses.length === 0) return;

    // 处理所有状态
    await this.processStatusArray(containerNumber, statuses);
  }

  /** 有船公司代码且船公司网站url时，upsert dict_shipping_companies 的 website_url */
  private async upsertShippingCompanyWebsite(row: FeituoRowData): Promise<void> {
    const companyCode = getVal(row, '船公司代码') || getVal(row, 2, '船公司代码') || getVal(row, 4, '船公司代码');
    const websiteUrl = getVal(row, '船公司网站url') || getVal(row, 2, '船公司网站url') || getVal(row, 4, '船公司网站url');
    if (!companyCode) return;

    const repo = AppDataSource.getRepository(ShippingCompany);
    let ship = await repo.findOne({ where: { companyCode } });
    if (ship) {
      if (websiteUrl && ship.websiteUrl !== websiteUrl) {
        ship.websiteUrl = websiteUrl;
        await repo.save(ship);
      }
    } else if (websiteUrl || getVal(row, '船公司中文名') || getVal(row, '船公司英文名')) {
      const nameCn = getVal(row, '船公司中文名') || getVal(row, 2, '船公司中文名') || getVal(row, 4, '船公司中文名');
      const nameEn = getVal(row, '船公司英文名') || getVal(row, 2, '船公司英文名') || getVal(row, 4, '船公司英文名');
      const scac = getVal(row, '船公司SCAC') || getVal(row, 2, '船公司SCAC') || getVal(row, 4, '船公司SCAC');
      ship = repo.create({
        companyCode,
        companyName: nameCn || nameEn || companyCode,
        companyNameEn: nameEn || undefined,
        scacCode: scac || undefined,
        websiteUrl: websiteUrl || undefined
      });
      await repo.save(ship);
    }
  }

  /**
   * 合并完成后写入 ext_container_alerts（与列表页 batchFetchAlerts 合成逻辑互补：库中已有未解决甩柜预警则 check 内不再重复插入）
   */
  private async persistContainerAlertsAfterMerge(containerNumber: string): Promise<void> {
    try {
      const alertService = new AlertService();
      await alertService.checkContainerAlerts(containerNumber);
    } catch (e) {
      logger.warn(`[FeituoImport] persistContainerAlertsAfterMerge failed ${containerNumber}:`, e);
    }
  }

  private async recalculateStatus(containerNumber: string): Promise<void> {
    try {
      const container = await AppDataSource.getRepository(Container).findOne({
        where: { containerNumber },
        relations: ['seaFreight']
      });
      if (!container) return;

      const portOps = await AppDataSource.getRepository(PortOperation)
        .createQueryBuilder('p')
        .where('p.container_number = :cn', { cn: containerNumber })
        .orderBy('p.port_sequence', 'DESC')
        .getMany();

      const [tt, wo, er] = await Promise.all([
        AppDataSource.getRepository(TruckingTransport).findOne({ where: { containerNumber } }),
        AppDataSource.getRepository(WarehouseOperation).findOne({ where: { containerNumber } }),
        AppDataSource.getRepository(EmptyReturn).findOne({ where: { containerNumber } })
      ]);

      const result = calculateLogisticsStatus(
        container,
        portOps,
        container.seaFreight ?? undefined,
        tt ?? undefined,
        wo ?? undefined,
        er ?? undefined
      );

      const { buildGanttDerived, ganttDerivedSemanticEqual } = await import('../utils/ganttDerivedBuilder');
      const ganttDerived = buildGanttDerived(portOps, tt, wo, er);
      const statusChanged = result.status !== container.logisticsStatus;
      const prevGantt = container.ganttDerived;
      const ganttChanged = !ganttDerivedSemanticEqual(prevGantt ?? null, ganttDerived);

      if (statusChanged || ganttChanged) {
        const oldStatus = container.logisticsStatus;
        const newStatus = result.status;
        container.logisticsStatus = newStatus;
        container.ganttDerived = ganttDerived;
        await AppDataSource.getRepository(Container).save(container);

        if (statusChanged) {
          await auditLogService.logChange({
            sourceType: 'feituo_excel_import',
            entityType: 'biz_containers',
            entityId: containerNumber,
            action: 'UPDATE',
            changedFields: {
              logistics_status: {
                old: oldStatus,
                new: newStatus
              },
              _triggerFields: {
                old: null,
                new: result.triggerFields || null
              },
              _statusCalculation: {
                old: null,
                new: {
                  reason: result.reason || null,
                  hasReturnTime: !!er?.returnTime,
                  hasWmsConfirm: !!wo?.wmsConfirmDate,
                  hasPickupDate: !!tt?.pickupDate,
                  hasDestAta: portOps.some(po => po.portType === 'destination' && po.ata),
                  hasTransitAta: portOps.some(po => po.portType === 'transit' && po.ata),
                  hasShipmentDate: !!container.seaFreight?.shipmentDate,
                }
              },
              ...(ganttChanged
                ? {
                    gantt_derived: {
                      old: prevGantt ?? null,
                      new: ganttDerived
                    }
                  }
                : {})
            },
            remark: `飞驼Excel导入触发状态机重算: ${oldStatus} → ${newStatus}`
          });
        } else if (ganttChanged) {
          await auditLogService.logChange({
            sourceType: 'feituo_excel_import',
            entityType: 'biz_containers',
            entityId: containerNumber,
            action: 'UPDATE',
            changedFields: {
              gantt_derived: {
                old: prevGantt ?? null,
                new: ganttDerived
              }
            },
            remark: '甘特派生字段重算（飞驼 Excel 导入）'
          });
        }
      }

      // 检查并更新查验状态
      await this.checkAndUpdateInspectionStatus(containerNumber, portOps);

      // 触发滞港费重算
      await this.triggerDemurrageRecalculation(containerNumber);
    } catch (e) {
      logger.warn('[FeituoImport] recalculateStatus failed:', e);
    }
  }

  /**
   * 触发滞港费重算
   * 当ATA等关键字段更新时，重新计算滞港费
   */
  private async triggerDemurrageRecalculation(containerNumber: string): Promise<void> {
    try {
      await this.demurrageService.calculateForContainer(containerNumber);
      logger.info(`[FeituoImport] 滞港费重算完成: ${containerNumber}`);
    } catch (e) {
      logger.warn('[FeituoImport] 滞港费重算失败:', e);
    }
  }

  /**
   * 检查并更新查验状态
   * 当检测到 CUIP/CPI/CPI_I 状态码时，自动标记查验状态
   */
  private async checkAndUpdateInspectionStatus(
    containerNumber: string,
    portOperations: PortOperation[]
  ): Promise<void> {
    try {
      // 查验状态码列表
      const INSPECTION_STATUS_CODES = ['CUIP', 'CPI', 'CPI_I'];

      // 从港口操作记录中查找查验状态码
      const inspectionPorts = portOperations.filter(po =>
        po.statusCode && INSPECTION_STATUS_CODES.includes(po.statusCode)
      );

      if (inspectionPorts.length === 0) {
        return;
      }

      // 按时间排序，取最早的事件
      const sortedPorts = inspectionPorts.sort(
        (a, b) => (a.statusOccurredAt?.getTime() || 0) - (b.statusOccurredAt?.getTime() || 0)
      );
      const firstInspectionPort = sortedPorts[0];

      // 获取货柜
      const container = await AppDataSource.getRepository(Container).findOne({
        where: { containerNumber },
      });

      if (!container) {
        return;
      }

      // 如果已是查验状态，只更新记录
      const isNewInspection = !container.inspectionRequired;

      // 设置查验标记
      container.inspectionRequired = true;
      await AppDataSource.getRepository(Container).save(container);

      // 查找或创建查验记录
      let inspectionRecord = await AppDataSource.getRepository(InspectionRecord).findOne({
        where: { containerNumber },
      });

      if (!inspectionRecord) {
        // 创建新的查验记录
        inspectionRecord = AppDataSource.getRepository(InspectionRecord).create({
          containerNumber,
          inspectionNoticeDate: firstInspectionPort.statusOccurredAt,
          latestStatus: '查验中',
          customsClearanceStatus: '查验中',
          dataSource: 'ExcelImport',
          remarks: `Excel导入自动触发查验，状态码: ${inspectionPorts.map(p => p.statusCode).join(',')}`,
        });
        await AppDataSource.getRepository(InspectionRecord).save(inspectionRecord);
        logger.info(`[FeituoImport] 创建查验记录: ${containerNumber}`);
      } else {
        // 更新已有记录
        if (!inspectionRecord.inspectionNoticeDate) {
          inspectionRecord.inspectionNoticeDate = firstInspectionPort.statusOccurredAt;
        }
        if (!inspectionRecord.latestStatus || inspectionRecord.latestStatus !== '已放行') {
          inspectionRecord.latestStatus = '查验中';
          inspectionRecord.customsClearanceStatus = '查验中';
        }
        inspectionRecord.dataSource = 'ExcelImport';
        inspectionRecord.remarks = `Excel导入自动更新，状态码: ${inspectionPorts.map(p => p.statusCode).join(',')}`;
        await AppDataSource.getRepository(InspectionRecord).save(inspectionRecord);
        logger.info(`[FeituoImport] 更新查验记录: ${containerNumber}`);
      }

      // 添加查验事件（只有新触发时才添加）
      if (isNewInspection) {
        const eventStatusMap: Record<string, string> = {
          CUIP: '海关滞留 - 待清关检查',
          CPI: '出口报关查验',
          CPI_I: '进口报关查验',
        };

        const event = AppDataSource.getRepository(InspectionEvent).create({
          inspectionRecordId: inspectionRecord.id,
          eventDate: firstInspectionPort.statusOccurredAt,
          eventStatus: eventStatusMap[firstInspectionPort.statusCode!] || `状态码: ${firstInspectionPort.statusCode}`,
        });
        await AppDataSource.getRepository(InspectionEvent).save(event);
        logger.info(`[FeituoImport] 添加查验事件: ${containerNumber}, 状态: ${event.eventStatus}`);
      }

      logger.info(`[FeituoImport] 自动标记货柜为查验状态: ${containerNumber}, 状态码: ${inspectionPorts.map(p => p.statusCode).join(',')}`);
    } catch (e) {
      logger.warn('[FeituoImport] 检查查验状态失败:', e);
    }
  }

  // ==================== 分批次保存数据子集方法 ====================

  /**
   * parsePlaceArray 缺名称时，用接货地/交货地（及路径信息）列补全，避免 ext_feituo_places 港名为空。
   * 合并行后地点 CODE 可能与接货地/交货地列不一致时，用 place_type（1 起运 / 3 目的）兜底取宽表名称。
   * 中文名列优先于「名称（标准）」混排列，避免 port_name_cn 被 NINGBO 占满；必要时用 dict_ports 按 CODE 补中英文。
   */
  private async fillPlaceDisplayNamesFromRow(
    row: FeituoRowData,
    portCode: string,
    originCode: string,
    destCode: string,
    p: { nameCn?: string; nameEn?: string },
    placeTypeNum: number
  ): Promise<{ portName: string | null; portNameEn: string | null; portNameCn: string | null; nameOrigin: string | null }> {
    let cn = (p.nameCn || '').trim() || null;
    let en = (p.nameEn || '').trim() || null;
    let nameOrigin: string | null = null;

    const fillOriginWide = () => {
      if (!cn) {
        cn = getVal(
          row,
          '接货地信息_地点名称中文（标准）',
          '接货地信息_地点名称（中文）'
        ) as string | null;
      }
      if (!en) {
        en = getVal(
          row,
          '接货地信息_地点名称英文（标准）',
          '接货地信息_地点名称（英文）',
          '接货地信息_接货地名称（英文）'
        ) as string | null;
      }
      if (!cn) {
        cn = getVal(
          row,
          '接货地信息_接货地名称（标准）',
          '接货地名称（标准）'
        ) as string | null;
      }
      if (!nameOrigin) {
        nameOrigin = getVal(
          row,
          '接货地信息_接货地名称（原始）',
          '接货地信息_地点名称（原始）'
        ) as string | null;
      }
      if (!cn) cn = getVal(row, '路径信息_起始地名称（标准）', '路径信息_起始地名称（原始）') as string | null;
    };

    const fillDestWide = () => {
      if (!cn) {
        cn = getVal(
          row,
          '交货地信息_地点名称中文（标准）',
          '交货地信息_地点名称（中文）'
        ) as string | null;
      }
      if (!en) {
        en = getVal(
          row,
          '交货地信息_地点名称英文（标准）',
          '交货地信息_地点名称（英文）',
          '交货地信息_交货地名称（英文）'
        ) as string | null;
      }
      if (!cn) {
        cn = getVal(
          row,
          '交货地信息_交货地名称（标准）',
          '交货地名称（标准）'
        ) as string | null;
      }
      if (!nameOrigin) {
        nameOrigin = getVal(
          row,
          '交货地信息_交货地名称（原始）',
          '交货地信息_地点名称（原始）'
        ) as string | null;
      }
      if (!cn) cn = getVal(row, '路径信息_目的地名称（标准）', '路径信息_目的地名称（原始）') as string | null;
    };

    if (portCode === originCode) {
      fillOriginWide();
    } else if (portCode === destCode) {
      fillDestWide();
    } else if (placeTypeNum === 1) {
      fillOriginWide();
    } else if (placeTypeNum === 3) {
      fillDestWide();
    }

    const dict = await this.getDictPortDisplayByCode(portCode);
    if (dict) {
      if (!cn || !stringLikelyHasCjk(cn)) {
        cn = dict.portName || cn;
      }
      if (!en) {
        en = dict.portNameEn || null;
      }
      if (!en && cn && !stringLikelyHasCjk(cn)) {
        en = cn;
      }
    }

    const portName = (stringLikelyHasCjk(cn) ? cn : null) || en || cn || portCode || null;
    return {
      portName,
      portNameEn: en,
      portNameCn: cn,
      nameOrigin,
    };
  }

  /** 发生地「地点类型」：纯数字或中文映射为 ext_feituo_places.place_type */
  private mapFeituoPlaceTypeChineseToInt(placeTypeStr: string | null | undefined): number {
    return mapFeituoPlaceTypeStrToInt(placeTypeStr);
  }

  /**
   * 保存发生地信息子集（去重）
   * 字段名严格对齐 ExtFeituoPlace 实体定义
   *
   * 导入侧：子集1（MBL + 当前状态信息_集装箱号）LEFT JOIN 子集3（物流箱号）；
   * 子集2：全表按 MBL+发生地地点CODE 去重后的航线；子集1 按 MBL join 子集2 → 每柜写整票发生地。
   * Upsert：bill_of_lading_number + container_number + port_code + place_type。
   */
  private async savePlacesSubset(
    batchId: number,
    row: FeituoRowData,
    mblNumber: string,
    forcedContainerNumber?: string,
    subset2EnrichByMblPort?: Map<string, FeituoRowData>,
    subset2PlacesListByMbl?: Map<string, FeituoRowData[]>
  ): Promise<void> {
    const containerNumber = (forcedContainerNumber || getContainerNumberFromRow(row)) as string;
    if (!containerNumber) return;
    await this.savePlacesSubsetFromOccurrenceColumnsOnly(
      batchId,
      row,
      mblNumber,
      containerNumber,
      subset2EnrichByMblPort,
      subset2PlacesListByMbl
    );
  }

  /**
   * 接货地/交货地宽表 → 至少补全「起运 + 目的」两行（place_type 1 / 3）。
   * 中转港（place_type 2）依赖「发生地信息_*」多槽位，由 savePlacesSubsetFromOccurrenceColumnsOnly 主循环写入。
   */
  private async upsertPolPodPlacesFromWideColumns(
    row: FeituoRowData,
    mblNumber: string,
    containerNumber: string,
    placesRepo: Repository<ExtFeituoPlace>,
    defaultRawJson: Record<string, unknown>
  ): Promise<boolean> {
    let any = false;
    const polCode = getPickupPortCodeFromWide(row);
    if (polCode) {
      const nameCn =
        getVal(row, 4, '接货地名称（标准）') ||
        getVal(row, 4, '接货地名称(标准)') ||
        getVal(row, 6, '接货地名称（标准）') ||
        getVal(row, 6, '接货地名称(标准)') ||
        getVal(row, '接货地名称（标准）') ||
        getVal(row, '接货地名称(标准)');
      const nameEn =
        getVal(row, 4, '接货地名称英文（标准）') ||
        getVal(row, 6, '接货地名称英文（标准）') ||
        getVal(row, '接货地名称英文（标准）');
      const nameOrig =
        getVal(row, 4, '接货地名称（原始）') ||
        getVal(row, 6, '接货地名称（原始）') ||
        getVal(row, '接货地名称（原始）');
      const portName =
        (stringLikelyHasCjk(nameCn || '') ? nameCn : null) || nameEn || nameCn || polCode;
      const rawJsonPol = {
        ...defaultRawJson,
        ...(typeof row._rawDataByGroup?.['4'] === 'object' && row._rawDataByGroup?.['4'] !== null
          ? row._rawDataByGroup['4']
          : {}),
        ...(typeof row._rawDataByGroup?.['6'] === 'object' && row._rawDataByGroup?.['6'] !== null
          ? row._rawDataByGroup['6']
          : {}),
      } as Record<string, unknown>;

      const existing = await placesRepo.findOne({
        where: {
          billOfLadingNumber: mblNumber,
          containerNumber,
          portCode: polCode,
          placeType: 1,
        },
      });

      const fieldValues: Partial<ExtFeituoPlace> & { dataSource: string } = {
        portCode: polCode,
        portName,
        portNameEn: nameEn && !stringLikelyHasCjk(nameEn) ? nameEn : null,
        portNameCn: stringLikelyHasCjk(nameCn || '') ? nameCn : null,
        nameOrigin: nameOrig,
        placeType: 1,
        placeIndex: 0,
        eta: parseDate(
          getVal(row, 4, '接货地预计到达时间') ||
            getVal(row, 6, '接货地预计到达时间') ||
            getVal(row, '接货地预计到达时间')
        ),
        ata: parseDate(
          getVal(row, 4, '接货地实际到达时间') ||
            getVal(row, 6, '接货地实际到达时间') ||
            getVal(row, '接货地实际到达时间')
        ),
        std: parseDate(
          getVal(row, 4, '接货地预计离开时间') ||
            getVal(row, 6, '接货地预计离开时间') ||
            getVal(row, '接货地预计离开时间')
        ),
        atd: parseDate(
          getVal(row, 4, '接货地实际离开时间') ||
            getVal(row, 6, '接货地实际离开时间') ||
            getVal(row, '接货地实际离开时间')
        ),
        portTimezone:
          getVal(row, 4, '接货地时区') || getVal(row, 6, '接货地时区') || getVal(row, '接货地时区'),
        terminalName:
          getVal(row, 4, '接货地码头名称') ||
          getVal(row, 6, '接货地码头名称') ||
          getVal(row, '接货地码头名称'),
        dataSource: 'Excel',
      };

      if (existing) {
        mergeExtFeituoPlacePreferNonEmpty(existing, fieldValues);
        await placesRepo.save(existing);
      } else {
        await placesRepo.save(
          placesRepo.create({
            billOfLadingNumber: mblNumber,
            containerNumber,
            rawJson: rawJsonPol,
            ...fieldValues,
          })
        );
      }
      any = true;
    }

    const podCode = getDeliveryPortCodeFromWide(row);
    if (podCode) {
      const nameCn =
        getVal(row, 5, '交货地名称（标准）') ||
        getVal(row, 5, '交货地名称(标准)') ||
        getVal(row, 7, '交货地名称（标准）') ||
        getVal(row, 7, '交货地名称(标准)') ||
        getVal(row, '交货地名称（标准）') ||
        getVal(row, '交货地名称(标准)');
      const nameEn =
        getVal(row, 5, '交货地名称英文（标准）') ||
        getVal(row, 7, '交货地名称英文（标准）') ||
        getVal(row, '交货地名称英文（标准）');
      const nameOrig =
        getVal(row, 5, '交货地名称（原始）') ||
        getVal(row, 7, '交货地名称（原始）') ||
        getVal(row, '交货地名称（原始）');
      const portName =
        (stringLikelyHasCjk(nameCn || '') ? nameCn : null) || nameEn || nameCn || podCode;
      const rawJsonPod = {
        ...defaultRawJson,
        ...(typeof row._rawDataByGroup?.['5'] === 'object' && row._rawDataByGroup?.['5'] !== null
          ? row._rawDataByGroup['5']
          : {}),
        ...(typeof row._rawDataByGroup?.['7'] === 'object' && row._rawDataByGroup?.['7'] !== null
          ? row._rawDataByGroup['7']
          : {}),
      } as Record<string, unknown>;

      const existing = await placesRepo.findOne({
        where: {
          billOfLadingNumber: mblNumber,
          containerNumber,
          portCode: podCode,
          placeType: 3,
        },
      });

      const fieldValues: Partial<ExtFeituoPlace> & { dataSource: string } = {
        portCode: podCode,
        portName,
        portNameEn: nameEn && !stringLikelyHasCjk(nameEn) ? nameEn : null,
        portNameCn: stringLikelyHasCjk(nameCn || '') ? nameCn : null,
        nameOrigin: nameOrig,
        placeType: 3,
        placeIndex: 1,
        eta: parseDate(
          getVal(row, 5, '交货地预计到达时间') ||
            getVal(row, 7, '交货地预计到达时间') ||
            getVal(row, '交货地预计到达时间')
        ),
        ata: parseDate(
          getVal(row, 5, '交货地实际到达时间') ||
            getVal(row, 7, '交货地实际到达时间') ||
            getVal(row, '交货地实际到达时间') ||
            getVal(row, '目的港到达日期')
        ),
        std: parseDate(
          getVal(row, 5, '交货地预计离开时间') ||
            getVal(row, 7, '交货地预计离开时间') ||
            getVal(row, '交货地预计离开时间')
        ),
        atd: parseDate(
          getVal(row, 5, '交货地实际离开时间') ||
            getVal(row, 7, '交货地实际离开时间') ||
            getVal(row, '交货地实际离开时间')
        ),
        disc: parseDate(getVal(row, '目的港卸船/火车日期')),
        portTimezone:
          getVal(row, 5, '交货地时区') || getVal(row, 7, '交货地时区') || getVal(row, '交货地时区'),
        terminalName:
          getVal(row, 5, '交货地码头名称') ||
          getVal(row, 7, '交货地码头名称') ||
          getVal(row, '交货地码头名称'),
        dataSource: 'Excel',
      };

      if (existing) {
        mergeExtFeituoPlacePreferNonEmpty(existing, fieldValues);
        await placesRepo.save(existing);
      } else {
        await placesRepo.save(
          placesRepo.create({
            billOfLadingNumber: mblNumber,
            containerNumber,
            rawJson: rawJsonPod,
            ...fieldValues,
          })
        );
      }
      any = true;
    }

    return any;
  }

  /** 单槽「发生地信息_*」写入 ext_feituo_places；子集2 enrich 键为 MBL+地点CODE */
  private async upsertOccurrencePlaceSlot(
    sourceRow: FeituoRowData,
    mblNumber: string,
    containerNumber: string,
    slotIndex: number,
    placeIndex: number,
    placesRepo: Repository<ExtFeituoPlace>,
    rawJson: Record<string, unknown>,
    subset2EnrichByMblPort?: Map<string, FeituoRowData>
  ): Promise<boolean> {
    const suffix = slotIndex === 0 ? '' : `_${slotIndex + 1}`;
    const portCode = (
      slotIndex === 0
        ? getVal(sourceRow, `发生地信息_地点CODE${suffix}`, '发生地信息_地点CODE')
        : getVal(sourceRow, `发生地信息_地点CODE${suffix}`)
    ) as string;
    if (!portCode) return false;

    const lookupKey = subset2MblPortKey(mblNumber, String(portCode).trim());
    const enrich = subset2EnrichByMblPort?.get(lookupKey);
    // 整票 enrich 与当前槽位以 enrich 为主，避免 canonical 行已带「上一港」CODE 时盖住本港
    const workingRow = enrich ? mergeFeituoRowDataPreferNonEmpty(enrich, sourceRow) : sourceRow;
    const occ2 = (base: string) =>
      slotIndex === 0
        ? getVal(workingRow, `${base}${suffix}`, base)
        : getVal(workingRow, `${base}${suffix}`);

    const portCodeFinal = (
      slotIndex === 0
        ? getVal(workingRow, `发生地信息_地点CODE${suffix}`, '发生地信息_地点CODE')
        : getVal(workingRow, `发生地信息_地点CODE${suffix}`)
    ) as string;
    if (!portCodeFinal) return false;

    const placeTypeFinal = this.mapFeituoPlaceTypeChineseToInt(
      occ2('发生地信息_地点类型') as string
    );

    const existing = await placesRepo.findOne({
      where: {
        billOfLadingNumber: mblNumber,
        containerNumber,
        portCode: portCodeFinal,
        placeType: placeTypeFinal,
      },
    });

    const fieldValues = {
      portCode: portCodeFinal,
      portName: occ2('发生地信息_地点名称中文（标准）') as string | null,
      portNameEn: occ2('发生地信息_地点名称英文（标准）') as string | null,
      portNameCn: occ2('发生地信息_地点名称中文（标准）') as string | null,
      nameOrigin: occ2('发生地信息_地点名称（原始）') as string | null,
      placeType: placeTypeFinal,
      placeIndex,
      latitude: parseFloat(String(occ2('发生地信息_纬度') || '0')) || null,
      longitude: parseFloat(String(occ2('发生地信息_经度') || '0')) || null,
      portTimezone: occ2('发生地信息_时区') as string | null,
      sta: parseDate(occ2('发生地信息_预计离开时间')),
      eta: parseDate(occ2('发生地信息_预计到达时间')),
      ata: parseDate(occ2('发生地信息_实际到达时间')),
      atd: parseDate(occ2('发生地信息_实际离开时间')),
      ataAis: parseDate(occ2('发生地信息_AIS实际到港时间')),
      atbAis: parseDate(occ2('发生地信息_AIS实际靠泊时间')),
      atdAis: parseDate(occ2('发生地信息_AIS实际离港时间')),
      disc: parseDate(occ2('发生地信息_实际卸船时间')),
      load: parseDate(occ2('发生地信息_实际装船时间')),
      std: parseDate(occ2('发生地信息_铁路预计离开时间')),
      vesselName: occ2('发生地信息_船名') as string | null,
      voyageNumber: occ2('发生地信息_航次') as string | null,
      terminalName: occ2('发生地信息_码头名称') as string | null,
      dataSource: 'Excel',
    };

    await this.upsertDictPortFromOccurrenceFields({
      portCode: portCodeFinal,
      portNameEn: occ2('发生地信息_地点名称英文（标准）'),
      portNameCn: occ2('发生地信息_地点名称中文（标准）'),
      portNameOrigin: occ2('发生地信息_地点名称（原始）'),
      placeType: occ2('发生地信息_地点类型'),
      latitude: occ2('发生地信息_纬度'),
      longitude: occ2('发生地信息_经度'),
      timezone: occ2('发生地信息_时区'),
    });

    if (existing) {
      Object.assign(existing, fieldValues);
      await placesRepo.save(existing);
    } else {
      const rec = placesRepo.create({
        billOfLadingNumber: mblNumber,
        containerNumber,
        rawJson,
        ...fieldValues,
      });
      await placesRepo.save(rec);
    }
    return true;
  }

  /**
   * 优先：子集1 按 MBL join 子集2（整票发生地去重列表）；否则本行 10 槽。
   * 再接接货地/交货地宽表与状态兜底。
   */
  private async savePlacesSubsetFromOccurrenceColumnsOnly(
    _batchId: number,
    row: FeituoRowData,
    mblNumber: string,
    containerNumber: string,
    subset2EnrichByMblPort?: Map<string, FeituoRowData>,
    subset2PlacesListByMbl?: Map<string, FeituoRowData[]>
  ): Promise<void> {
    const placesRepo = AppDataSource.getRepository(ExtFeituoPlace);
    const rawGroup = row._rawDataByGroup?.['8'] ?? row._rawDataByGroup?.['10'];
    const rawJson = (rawGroup && typeof rawGroup === 'object' ? rawGroup : {}) as Record<string, unknown>;
    let hasSaved = false;

    const mblPlaces = subset2PlacesListByMbl?.get(mblNumber);
    if (mblPlaces && mblPlaces.length > 0) {
      let pi = 0;
      for (const placeRow of mblPlaces) {
        // 必须以「当前港口」切片为主：canonical 行往往已有首港 CODE，(row, placeRow) 会盖住后续港
        const merged = mergeFeituoRowDataPreferNonEmpty(placeRow, row);
        const rg = merged._rawDataByGroup?.['8'] ?? merged._rawDataByGroup?.['10'];
        const rj = (rg && typeof rg === 'object' ? rg : {}) as Record<string, unknown>;
        const ok = await this.upsertOccurrencePlaceSlot(
          merged,
          mblNumber,
          containerNumber,
          0,
          pi,
          placesRepo,
          rj,
          subset2EnrichByMblPort
        );
        if (ok) hasSaved = true;
        pi++;
      }
    } else {
      for (let i = 0; i < 10; i++) {
        const ok = await this.upsertOccurrencePlaceSlot(
          row,
          mblNumber,
          containerNumber,
          i,
          i,
          placesRepo,
          rawJson,
          subset2EnrichByMblPort
        );
        if (ok) hasSaved = true;
      }
    }

    const wideSaved = await this.upsertPolPodPlacesFromWideColumns(
      row,
      mblNumber,
      containerNumber,
      placesRepo,
      rawJson
    );

    // 白名单兜底：发生地槽位与接货地/交货地宽表均未写出地点时，用「集装箱物流信息-状态_*」补一条
    if (!hasSaved && !wideSaved) {
      const statusPortCode = getVal(row, 12, '地点CODE') || getVal(row, '集装箱物流信息-状态_地点CODE');
      if (!statusPortCode) return;

      let placeType = this.mapFeituoPlaceTypeChineseToInt(
        (getVal(row, 8, '地点类型') || getVal(row, '发生地信息_地点类型') || '') as string
      );
      placeType = inferPlaceTypeForStatusFallbackPlaces(row, statusPortCode, placeType);
      const statusLookupKey = subset2MblPortKey(mblNumber, String(statusPortCode).trim());
      const enrichStatus = subset2EnrichByMblPort?.get(statusLookupKey);
      const baseRow = enrichStatus ? mergeFeituoRowDataPreferNonEmpty(row, enrichStatus) : row;

      const existing = await placesRepo.findOne({
        where: {
          billOfLadingNumber: mblNumber,
          containerNumber,
          portCode: statusPortCode,
          placeType,
        },
      });

      const fieldValues = {
        portCode: statusPortCode,
        portName: getVal(baseRow, 12, '发生地') || getVal(baseRow, '集装箱物流信息-状态_发生地') || null,
        portNameEn: getVal(baseRow, '发生地信息_地点名称英文（标准）') as string | null,
        portNameCn: getVal(baseRow, '发生地信息_地点名称中文（标准）') as string | null,
        nameOrigin: getVal(baseRow, 12, '发生地（原始）') || getVal(baseRow, '集装箱物流信息-状态_发生地（原始）') || null,
        placeType,
        placeIndex: 0,
        latitude: null,
        longitude: null,
        portTimezone: getVal(baseRow, 12, '时区') || getVal(baseRow, '集装箱物流信息-状态_时区') || null,
        sta: null,
        eta: null,
        ata: parseDate(getVal(baseRow, 12, '发生时间') || getVal(baseRow, '集装箱物流信息-状态_发生时间')),
        atd: null,
        ataAis: null,
        atbAis: null,
        atdAis: null,
        disc: null,
        load: null,
        std: null,
        vesselName: getVal(baseRow, 12, '船名/车牌号') || getVal(baseRow, '集装箱物流信息-状态_船名/车牌号') || null,
        voyageNumber: getVal(baseRow, 12, '航次') || getVal(baseRow, '集装箱物流信息-状态_航次') || null,
        terminalName: getVal(baseRow, 12, '码头名称') || getVal(baseRow, '集装箱物流信息-状态_码头名称') || null,
        dataSource: 'Excel',
      };

      if (existing) {
        Object.assign(existing, fieldValues);
        await placesRepo.save(existing);
      } else {
        const rec = placesRepo.create({
          billOfLadingNumber: mblNumber,
          containerNumber,
          rawJson: baseRow._rawDataByGroup?.['12'] || rawJson,
          ...fieldValues,
        });
        await placesRepo.save(rec);
      }
    }
  }

  /**
   * 保存集装箱物流信息子集（去重）
   * 按 (mblNumber, containerNumber, eventCode, eventTime) 去重
   * 字段名严格对齐 ExtFeituoStatusEvent 实体定义（参考 externalDataService.saveStatusRawData）
   */
  private async saveStatusEventsSubset(
    batchId: number,
    row: FeituoRowData,
    mblNumber: string,
    containerNumber: string
  ): Promise<void> {
    const eventsRepo = AppDataSource.getRepository(ExtFeituoStatusEvent);

    const containerNumberVal = containerNumber || (getContainerNumberFromRow(row) as string);
    if (!containerNumberVal) return;

    // 从分组12获取状态代码和发生时间
    const statusCode = getVal(row, 12, '状态代码') || getVal(row, '集装箱物流信息-状态_状态代码') as string;
    const statusOccurredAt = parseDate(getVal(row, 12, '发生时间') || getVal(row, '集装箱物流信息-状态_发生时间'));

    if (!statusCode || !statusOccurredAt) return;

    // 检查是否已存在
    const existing = await eventsRepo.findOne({
      where: {
        billOfLadingNumber: mblNumber,
        containerNumber: containerNumberVal,
        eventCode: statusCode,
        eventTime: statusOccurredAt
      }
    });

    // 构建字段映射对象（只使用实体中实际存在的字段）
    const fieldValues = {
      // statusIndex: Excel 导入时为 NULL（API 同步时才有数组索引）
      eventCode: statusCode,
      descriptionCn: getVal(row, 12, '状态描述中文（标准）') || getVal(row, 12, '状态描述中文(标准)') || getVal(row, '集装箱物流信息-状态_状态描述中文（标准）') || null,
      descriptionEn: getVal(row, 12, '状态描述英文（标准）') || getVal(row, 12, '状态描述英文(标准)') || getVal(row, '集装箱物流信息-状态_状态描述英文（标准）') || null,
      eventDescriptionOrigin: getVal(row, 12, '状态描述（原始）') || getVal(row, '集装箱物流信息-状态_状态描述（原始）') || null,
      eventTime: statusOccurredAt,
      isEstimated: parseBool(getVal(row, 12, '是否预计') || getVal(row, '集装箱物流信息-状态_是否预计')),
      portTimezone: getVal(row, 12, '时区') || getVal(row, '集装箱物流信息-状态_时区') || null,
      eventPlace: getVal(row, 12, '发生地') || getVal(row, '集装箱物流信息-状态_发生地') || null,
      eventPlaceOrigin: getVal(row, 12, '发生地（原始）') || getVal(row, '集装箱物流信息-状态_发生地（原始）') || null,
      portCode: getVal(row, 12, '地点CODE') || getVal(row, '集装箱物流信息-状态_地点CODE') || null,
      terminalName: getVal(row, 12, '码头名称') || getVal(row, '集装箱物流信息-状态_码头名称') || null,
      transportMode: getVal(row, 12, '运输方式') || getVal(row, '集装箱物流信息-状态_运输方式') || null,
      vesselName: getVal(row, 12, '船名/车牌号') || getVal(row, '集装箱物流信息-状态_船名/车牌号') || null,
      voyageNumber: getVal(row, 12, '航次') || getVal(row, '集装箱物流信息-状态_航次') || null,
      billNo: getVal(row, 12, '分单号') || getVal(row, '集装箱物流信息-状态_分单号') || null,
      declarationNo: getVal(row, 12, '报关单号') || getVal(row, '集装箱物流信息-状态_报关单号') || null,
      dataSource: getVal(row, 12, '数据来源') || getVal(row, '集装箱物流信息-状态_数据来源') || 'Excel',
    };

    if (existing) {
      Object.assign(existing, fieldValues);
      await eventsRepo.save(existing);
    } else {
      const rec = eventsRepo.create({
        billOfLadingNumber: mblNumber,
        containerNumber: containerNumberVal,
        statusIndex: null,  // Excel 导入没有数组索引
        rawJson: row._rawDataByGroup?.['12'] || null,  // 保存分组12原始数据
        ...fieldValues
      });
      await eventsRepo.save(rec);
    }
  }

  /**
   * 保存船舶信息子集（去重）
   * 字段名严格对齐 ExtFeituoVessel 实体定义
   *
   * 导入侧：子集1（MBL + 当前状态集装箱号）LEFT JOIN 子集4（MBL + 船泊信息_*），
   * Join key = MBL；命中则 merge 后写入 ext_feituo_vessels，未命中则用 canonical。
   */
  private async saveVesselsSubset(
    batchId: number,
    row: FeituoRowData,
    mblNumber: string
  ): Promise<void> {
    const vesselsRepo = AppDataSource.getRepository(ExtFeituoVessel);

    // 获取船舶信息（分组13）
    const vesselName = getVal(row, 13, '船名') || getVal(row, '船泊信息_船名') as string;
    if (!vesselName) return;

    // 检查是否已存在
    const existing = await vesselsRepo.findOne({
      where: {
        billOfLadingNumber: mblNumber,
        vesselName
      }
    });

    // 构建字段映射对象
    const fieldValues = {
      vesselName,
      imoNumber: getVal(row, 13, 'IMO') || getVal(row, '船泊信息_imo') as string | null,
      mmsiNumber: getVal(row, 13, 'MMSI') || getVal(row, '船泊信息_mmsi') as string | null,
      buildDate: parseDate(getVal(row, 13, '船舶建造日') || getVal(row, '船泊信息_船舶建造日')),
      flag: getVal(row, 13, '船籍') || getVal(row, '船泊信息_船籍') as string | null,
      containerSize: getVal(row, 13, '箱尺寸') || getVal(row, '船泊信息_箱尺寸') as string | null,
      operator: getVal(row, 13, '运营方') || getVal(row, '船泊信息_运营方') as string | null,
      dataSource: 'Excel',
    };

    if (existing) {
      Object.assign(existing, fieldValues);
      await vesselsRepo.save(existing);
    } else {
      const rec = vesselsRepo.create({
        billOfLadingNumber: mblNumber,
        rawJson: row._rawDataByGroup?.['13'] || null, // 保存分组13原始数据
        ...fieldValues
      });
      await vesselsRepo.save(rec);
    }
  }
}

export const feituoImportService = new FeituoImportService();
