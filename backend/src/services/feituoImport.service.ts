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
import { logger } from '../utils/logger';
import { DemurrageService } from './demurrage.service';
import { getCoreFieldName } from '../constants/FeiTuoStatusMapping';
import { calculateLogisticsStatus } from '../utils/logisticsStatusMachine';
import { getGroupForColumn } from '../constants/FeituoFieldGroupMapping';

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

/** 解析日期 */
function parseDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  const s = String(val).trim().replace(/\//g, '-');
  const m = s.match(/^(\d{4})-?(\d{1,2})-?(\d{1,2})/);
  if (m) {
    const d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
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

/** 检测表类型：表一有 MBL Number，表二有 提单号+港口代码 */
function detectTableType(columns: string[]): 1 | 2 {
  const hasMbl = columns.some(c => c.includes('MBL Number') || c === 'MBL Number');
  const hasBill = columns.some(c => c === '提单号' || c.includes('提单号'));
  const hasPortCode = columns.some(c => c === '港口代码' || c.includes('港口代码'));
  if (hasBill && hasPortCode) return 2;
  if (hasMbl) return 1;
  return hasBill ? 2 : 1;
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

      try {
        if (tableType === 1) {
          await this.importTable1Row(batch.id, row, rawData, rawDataByGroup, t1Repo);
        } else {
          await this.importTable2Row(batch.id, row, rawData, rawDataByGroup, t2Repo);
        }
        successCount++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ row: i + 1, error: msg });
        logger.warn(`[FeituoImport] Row ${i + 1} failed:`, msg);
      }
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

  private async importTable1Row(
    batchId: number,
    row: FeituoRowData,
    rawData: Record<string, unknown>,
    rawDataByGroup: Record<string, Record<string, unknown>> | null,
    repo: ReturnType<typeof AppDataSource.getRepository<ExtFeituoImportTable1>>
  ): Promise<void> {
    const mbl = getVal(row, 'MBL Number', 'MBL Number（一）', 'MBLNumber', 'mbl_number');
    const containerNumber = getVal(row, '集装箱号', '集装箱号（一）', 'container_number');
    if (!containerNumber) throw new Error('缺少集装箱号');

    const rec = repo.create({
      batchId,
      mblNumber: mbl,
      containerNumber,
      rawData,
      rawDataByGroup
    });
    await repo.save(rec);

    await this.mergeTable1ToCore(row);
  }

  private async importTable2Row(
    batchId: number,
    row: FeituoRowData,
    rawData: Record<string, unknown>,
    rawDataByGroup: Record<string, Record<string, unknown>> | null,
    repo: ReturnType<typeof AppDataSource.getRepository<ExtFeituoImportTable2>>
  ): Promise<void> {
    const billNumber = getVal(row, '提单号', '提单号（一）', 'bill_number');
    const containerNumber = getVal(row, '集装箱号', '集装箱号（一）', 'container_number');
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
      rawDataByGroup
    });
    await repo.save(rec);

    await this.mergeTable2ToCore(row);
  }

  /** 表一合并到核心表 */
  private async mergeTable1ToCore(row: FeituoRowData): Promise<void> {
    const mbl = getVal(row, 'MBL Number', 'MBL Number（一）', 'MBLNumber') || getVal(row, '提单号');
    const containerNumber = getVal(row, '集装箱号', '集装箱号（一）', 'container_number');
    if (!containerNumber) return;

    const containerRepo = AppDataSource.getRepository(Container);
    const seaFreightRepo = AppDataSource.getRepository(SeaFreight);
    const portOpRepo = AppDataSource.getRepository(PortOperation);
    const truckRepo = AppDataSource.getRepository(TruckingTransport);
    const emptyRepo = AppDataSource.getRepository(EmptyReturn);
    const eventRepo = AppDataSource.getRepository(ContainerStatusEvent);
    const containerTypeRepo = AppDataSource.getRepository(ContainerType);

    const bl = mbl || `FEITUO_${containerNumber}`;

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
    }

    let sf = await seaFreightRepo.findOne({ where: { billOfLadingNumber: bl } });
    if (!sf) {
      sf = seaFreightRepo.create({
        billOfLadingNumber: bl,
        mblNumber: mbl,  // 飞驼的 MBL Number 写入 mbl_number 字段
        mblScac: getVal(row, '船公司SCAC'),
        shippingCompanyId: getVal(row, '船公司代码'),
        portOfLoading: getVal(row, '接货地名称（标准）', '接货地名称(标准)'),
        portOfDischarge: getVal(row, '交货地名称（标准）', '交货地名称(标准)'),
        vesselName: getVal(row, '船名'),
        voyageNumber: getVal(row, '航次'),
        routeCode: getVal(row, '航线代码'),
        shipmentDate: parseDate(getVal(row, '接货地实际离开时间')), // 出运日期
        actualLoadingDate: parseDate(getVal(row, '实际装船时间')), // 实际装船时间
        portOpenDate: parseDate(getVal(row, '开港时间')),
        portCloseDate: parseDate(getVal(row, '截港时间')),
        eta: parseDate(getVal(row, '交货地预计到达时间') || getVal(row, '目的地预计到达时间') || getVal(row, 5, '预计到达时间') || getVal(row, '预计到港日期')),
        ata: parseDate(getVal(row, '交货地实际到达时间') || getVal(row, '目的地实际到达时间') || getVal(row, 5, '实际到达时间') || getVal(row, '目的港到达日期')),
        imoNumber: getVal(row, 'imo'),
        mmsiNumber: getVal(row, 'mmsi'),
        flag: getVal(row, '船籍')
      });
      await seaFreightRepo.save(sf);
    } else {
      if (!sf.shipmentDate) sf.shipmentDate = parseDate(getVal(row, '接货地实际离开时间'));
      if (!sf.actualLoadingDate) sf.actualLoadingDate = parseDate(getVal(row, '实际装船时间'));
      if (!sf.mblNumber && mbl) sf.mblNumber = mbl;  // 更新 mbl_number
      if (!sf.eta) sf.eta = parseDate(getVal(row, '交货地预计到达时间') || getVal(row, '目的地预计到达时间') || getVal(row, 5, '预计到达时间'));
      if (!sf.ata) sf.ata = parseDate(getVal(row, '交货地实际到达时间') || getVal(row, '目的地实际到达时间') || getVal(row, 5, '实际到达时间'));
      await seaFreightRepo.save(sf);
    }

    // 更新备货单的预计出运日期 expectedShipDate
    const expectedShipDate = parseDate(getVal(row, '接货地实际离开时间') || getVal(row, '实际装船时间', '装船日期', '出运日期'));
    if (expectedShipDate) {
      const replenishmentRepo = AppDataSource.getRepository(ReplenishmentOrder);
      // 查找该货柜关联的备货单
      const orders = await replenishmentRepo.find({ where: { containerNumber } });
      for (const order of orders) {
        if (!order.expectedShipDate) {
          order.expectedShipDate = expectedShipDate;
          await replenishmentRepo.save(order);
        }
      }
    }

    if (!container.billOfLadingNumber) {
      container.billOfLadingNumber = bl;
      await containerRepo.save(container);
    }

    await this.upsertShippingCompanyWebsite(row);

    const destPort = getVal(row, '交货地名称（标准）') || getVal(row, 5, '地点CODE') || getVal(row, '交货地地点CODE');
    if (destPort) {
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
          portCode: getVal(row, '交货地地点CODE') || getVal(row, 5, '地点CODE') || destPort,
          portName: destPort,
          portSequence: 1
        });
      }
      po.etaDestPort = parseDate(getVal(row, '交货地预计到达时间') || getVal(row, '目的地预计到达时间') || getVal(row, 5, '预计到达时间') || getVal(row, '预计到港日期')) || po.etaDestPort;
      po.ataDestPort = parseDate(getVal(row, '交货地实际到达时间') || getVal(row, '目的地实际到达时间') || getVal(row, 5, '实际到达时间') || getVal(row, '目的港到达日期')) || po.ataDestPort;
      po.destPortUnloadDate = parseDate(getVal(row, '实际卸船时间', '目的港卸船/火车日期')) || po.destPortUnloadDate;
      po.gateInTerminal = getVal(row, '交货地码头名称') || getVal(row, 5, '码头名称') || po.gateInTerminal;
      await portOpRepo.save(po);
    }

    const pickupDate = parseDate(getVal(row, '提柜日期', '实际提箱日期'));
    if (pickupDate) {
      let tt = await truckRepo.findOne({ where: { containerNumber } });
      if (!tt) {
        tt = truckRepo.create({ containerNumber });
      }
      tt.pickupDate = pickupDate;
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

    await this.mergeStatusEvents(row, containerNumber, eventRepo, 1);
    
    // 处理发生地信息数组
    const places = this.parsePlaceArray(row);
    if (places.length > 0) {
      await this.processPlaceArray(containerNumber, places);
    }
    
    await this.recalculateStatus(containerNumber);
  }

  /** 表二合并到核心表 */
  private async mergeTable2ToCore(row: FeituoRowData): Promise<void> {
    const billNumber = getVal(row, '提单号', '提单号（一）') || `FEITUO_${getVal(row, '集装箱号', '集装箱号（一）')}`;
    const mblNumber = getVal(row, 'MBL Number', 'MBL Number（一）', 'MBLNumber');  // 获取 MBL
    const hblNumber = getVal(row, 'HBL Number', 'HBL Number（一）', 'HBLNumber');  // 获取 HBL
    const containerNumber = getVal(row, '集装箱号', '集装箱号（一）', 'container_number');
    if (!containerNumber) return;

    const containerRepo = AppDataSource.getRepository(Container);
    const seaFreightRepo = AppDataSource.getRepository(SeaFreight);
    const portOpRepo = AppDataSource.getRepository(PortOperation);
    const truckRepo = AppDataSource.getRepository(TruckingTransport);
    const emptyRepo = AppDataSource.getRepository(EmptyReturn);
    const eventRepo = AppDataSource.getRepository(ContainerStatusEvent);
    const containerTypeRepo = AppDataSource.getRepository(ContainerType);

    let container = await containerRepo.findOne({ where: { containerNumber } });
    if (!container) {
      const typeCode = normalizeContainerType(getVal(row, '箱型（飞驼标准）', '箱型', '箱型箱尺寸（标准化）'));
      const typeExists = await containerTypeRepo.exists({ where: { typeCode } });
      container = containerRepo.create({
        containerNumber,
        containerTypeCode: typeExists ? typeCode : '40HC',
        billOfLadingNumber: billNumber,
        logisticsStatus: 'not_shipped',
        isRolled: parseBool(getVal(row, '是否用柜', '是否甩柜'))
      });
      await containerRepo.save(container);
    }

    let sf = await seaFreightRepo.findOne({ where: { billOfLadingNumber: billNumber } });
    if (!sf) {
      sf = seaFreightRepo.create({
        billOfLadingNumber: billNumber,
        mblNumber: mblNumber,  // 写入 MBL Number
        hblNumber: hblNumber,  // 写入 HBL Number
        mblScac: getVal(row, '船公司SCAC'),
        shippingCompanyId: getVal(row, '船公司代码')
      });
      await seaFreightRepo.save(sf);
    } else {
      // 更新已存在的记录
      if (!sf.mblNumber && mblNumber) sf.mblNumber = mblNumber;
      if (!sf.hblNumber && hblNumber) sf.hblNumber = hblNumber;
      await seaFreightRepo.save(sf);
    }

    await this.upsertShippingCompanyWebsite(row);

    const portCode = getVal(row, '港口代码');
    const terminalCode = getVal(row, '码头代码');
    const terminalName = getVal(row, '码头名称');

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
        portCode: portCode || undefined,
        portName: getVal(row, '港口名'),
        portSequence: 1
      });
    }
    po.destPortUnloadDate = parseDate(getVal(row, '卸船时间')) || po.destPortUnloadDate;
    po.gateInTime = parseDate(getVal(row, '重箱进场时间')) || po.gateInTime;
    po.lastFreeDate = parseDate(getVal(row, '免费提箱截止日')) || po.lastFreeDate;
    po.availableTime = parseDate(getVal(row, '可提箱日期')) || po.availableTime;
    po.gateOutTime = parseDate(getVal(row, '实际提箱日期', '出场时间')) || po.gateOutTime;
    po.gateInTerminal = terminalCode || terminalName || po.gateInTerminal;
    await portOpRepo.save(po);

    const pickupDate = parseDate(getVal(row, '实际提箱日期'));
    if (pickupDate) {
      let tt = await truckRepo.findOne({ where: { containerNumber } });
      if (!tt) tt = truckRepo.create({ containerNumber });
      tt.pickupDate = pickupDate;
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

    await this.mergeStatusEvents(row, containerNumber, eventRepo, 2);
    await this.deriveStatusEventsFromTable2TimeFields(row, containerNumber, eventRepo);
    
    // 处理发生地信息数组
    const places = this.parsePlaceArray(row);
    if (places.length > 0) {
      await this.processPlaceArray(containerNumber, places);
    }
    
    await this.recalculateStatus(containerNumber);
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
   * 解析发生地信息数组
   * 飞驼Excel中发生地信息通过多列传输，列名如：发生地信息_地点CODE, 发生地信息_地点CODE_2
   */
  private parsePlaceArray(row: FeituoRowData): ExcelPlaceInfo[] {
    const places: ExcelPlaceInfo[] = [];
    const suffixes = ['', '_2', '_3', '_4', '_5', '_6', '_7', '_8', '_9', '_10'];
    
    for (let i = 0; i < suffixes.length; i++) {
      const suffix = suffixes[i];
      const code = getVal(row, `发生地信息_地点CODE${suffix}`);
      if (!code) break;
      
      places.push({
        code,
        nameEn: getVal(row, `发生地信息_地点名称英文（标准）${suffix}`) || undefined,
        nameCn: getVal(row, `发生地信息_地点名称中文（标准）${suffix}`) || undefined,
        placeType: getVal(row, `发生地信息_地点类型${suffix}`) || undefined,
        eta: parseDate(getVal(row, `发生地信息_预计到达时间${suffix}`)),
        ata: parseDate(getVal(row, `发生地信息_实际到达时间${suffix}`)),
        etd: parseDate(getVal(row, `发生地信息_预计离开时间${suffix}`)),
        atd: parseDate(getVal(row, `发生地信息_实际离开时间${suffix}`)),
        actualLoading: parseDate(getVal(row, `发生地信息_实际装船时间${suffix}`)),
        actualDischarge: parseDate(getVal(row, `发生地信息_实际卸船时间${suffix}`)),
        terminal: getVal(row, `发生地信息_码头名称${suffix}`) || undefined,
        sequence: i + 1,
      });
    }
    
    return places;
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
        location: getVal(row, group, '发生地') || undefined,
        terminal: getVal(row, group, '码头名称') || undefined,
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
    if (placeType.includes('目的地')) {
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
          containerNumber,
          portType,
          portSequence: place.sequence,
        });
      }
      
      // 写入公共字段
      portOp.portCode = place.code;
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
        portOp.etaDestPort = place.eta;
        portOp.ataDestPort = place.ata;
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
        rawData: { group: status.group, isEstimated: status.isEstimated }
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
      const portType = ['transit_arrival_date', 'atd_transit'].includes(fieldName) ? 'transit' : 'destination';
      const po = await poRepo
        .createQueryBuilder('p')
        .where('p.container_number = :cn', { cn: containerNumber })
        .andWhere('p.port_type = :pt', { pt: portType })
        .getOne();
      if (po) {
        const map: Record<string, keyof PortOperation> = {
          ata_dest_port: 'ataDestPort',
          eta_dest_port: 'etaDestPort',
          gate_in_time: 'gateInTime',
          gate_out_time: 'gateOutTime',
          dest_port_unload_date: 'destPortUnloadDate',
          available_time: 'availableTime',
          transit_arrival_date: 'transitArrivalDate',
          atd_transit: 'atdTransit'
        };
        const col = map[fieldName];
        if (col) {
          (po as any)[col] = occurredAt;
          await poRepo.save(po);
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
      if (result.status !== container.logisticsStatus) {
        container.logisticsStatus = result.status;
        await AppDataSource.getRepository(Container).save(container);
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
}

export const feituoImportService = new FeituoImportService();
