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
import { calculateLogisticsStatus } from '../utils/logisticsStatusMachine';
import { getGroupForColumn } from '../constants/FeituoFieldGroupMapping';
import { feituoPlaceAnalyzer, PortAnalysisResult } from './feituo/FeituoPlaceAnalyzer';
import { feituoSmartDateUpdater } from './feituo/FeituoSmartDateUpdater';

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
export function parseDate(val: unknown): Date | null {
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
    const containerNumber = getVal(row, '集装箱物流信息_集装箱号', '集装箱号', '集装箱号（一）', 'container_number');
    if (!containerNumber) throw new Error('缺少集装箱号');

    const rec = repo.create({
      batchId,
      mblNumber: mbl,
      containerNumber,
      rawData,
      rawDataByGroup
    });
    await repo.save(rec);

    // 分批次保存数据子集
    await this.savePlacesSubset(batchId, row, mbl);
    await this.saveStatusEventsSubset(batchId, row, mbl, containerNumber);
    await this.saveVesselsSubset(batchId, row, mbl);

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
    const containerNumber = getVal(row, '集装箱物流信息_集装箱号', '集装箱号', '集装箱号（一）', 'container_number');
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

    // 分批次保存数据子集（表二也支持）
    const mblNumber = billNumber || `FEITUO_${containerNumber}`;
    await this.savePlacesSubset(batchId, row, mblNumber);
    await this.saveStatusEventsSubset(batchId, row, mblNumber, containerNumber);
    await this.saveVesselsSubset(batchId, row, mblNumber);

    await this.mergeTable2ToCore(row);
  }

  /** 表一合并到核心表 */
  private async mergeTable1ToCore(row: FeituoRowData): Promise<void> {
    const mbl = getVal(row, 'MBL Number', 'MBL Number（一）', 'MBLNumber') || getVal(row, '提单号');
    const containerNumber = getVal(row, '集装箱物流信息_集装箱号', '集装箱号', '集装箱号（一）', 'container_number');
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

    // 查找已存在的 sea_freight（用于兜底匹配）
    const existingSf = await seaFreightRepo.findOne({ where: { billOfLadingNumber: bl } });
    
    // 使用 FeituoPlaceAnalyzer 分析港口类型
    const places = feituoPlaceAnalyzer.parsePlaceArray(row);
    const portAnalysis: PortAnalysisResult = feituoPlaceAnalyzer.analyzePorts(places, existingSf);
    
    const originPlace = portAnalysis.originPlace;
    const seaDestPlace = portAnalysis.seaDestPlace;
    const railDestPlace = portAnalysis.railDestPlace;
    const destPlaces = portAnalysis.destPlaces;
    const destPlace = seaDestPlace; // 统一变量名用于后续兼容

    let sf = existingSf;
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
        // 优先从数组获取出运日期，fallback到直接列名
        shipmentDate: parseDate(originPlace?.atd || originPlace?.etd || getVal(row, '接货地实际离开时间') || getVal(row, '实际装船时间', '装船日期', '出运日期')),
        actualLoadingDate: parseDate(originPlace?.actualLoading || getVal(row, '实际装船时间')),
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
    } else {
      // 更新逻辑：优先从数组更新，fallback到直接列名
      if (!sf.shipmentDate) sf.shipmentDate = parseDate(originPlace?.atd || originPlace?.etd || getVal(row, '接货地实际离开时间') || getVal(row, '实际装船时间', '装船日期', '出运日期'));
      if (!sf.actualLoadingDate) sf.actualLoadingDate = parseDate(originPlace?.actualLoading || getVal(row, '实际装船时间'));
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
    
    // 处理发生地信息数组（已在上面解析）
    if (places.length > 0) {
      await this.processPlaceArray(containerNumber, places);
    }
    
    await this.recalculateStatus(containerNumber);
  }

  /** 表二合并到核心表 */
  private async mergeTable2ToCore(row: FeituoRowData): Promise<void> {
    const billNumber = getVal(row, '提单号', '提单号（一）') || `FEITUO_${getVal(row, '集装箱物流信息_集装箱号', '集装箱号', '集装箱号（一）')}`;
    const mblNumber = getVal(row, 'MBL Number', 'MBL Number（一）', 'MBLNumber');  // 获取 MBL
    const hblNumber = getVal(row, 'HBL Number', 'HBL Number（一）', 'HBLNumber');  // 获取 HBL
    const containerNumber = getVal(row, '集装箱物流信息_集装箱号', '集装箱号', '集装箱号（一）', 'container_number');
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

    // 查找已存在的 sea_freight（用于兜底匹配）
    const existingSf = await seaFreightRepo.findOne({ where: { billOfLadingNumber: billNumber } });
    
    // 使用 FeituoPlaceAnalyzer 分析港口类型
    const places = feituoPlaceAnalyzer.parsePlaceArray(row);
    const portAnalysis: PortAnalysisResult = feituoPlaceAnalyzer.analyzePorts(places, existingSf);
    
    const originPlace = portAnalysis.originPlace;
    const seaDestPlace = portAnalysis.seaDestPlace;
    const railDestPlace = portAnalysis.railDestPlace;
    const destPlaces = portAnalysis.destPlaces;
    const destPlace = seaDestPlace; // 统一变量名用于后续兼容

    // 查找 port_code（用于外键约束）
    const portOfLoadingCode2 = await this.findPortCode(originPlace?.code || originPlace?.nameCn || originPlace?.nameEn);
    const portOfDischargeCode2 = await this.findPortCode(destPlace?.code || destPlace?.nameCn || destPlace?.nameEn);

    let sf = existingSf;
    if (!sf) {
      sf = seaFreightRepo.create({
        billOfLadingNumber: billNumber,
        mblNumber: mblNumber,  // 写入 MBL Number
        hblNumber: hblNumber,  // 写入 HBL Number
        mblScac: getVal(row, '船公司SCAC'),
        shippingCompanyId: getVal(row, '船公司代码'),
        vesselName: getVal(row, '船名'),
        voyageNumber: getVal(row, '航次'),
        // 优先使用 port_code（外键要求），fallback 到名称，再fallback到直接列名
        portOfLoading: portOfLoadingCode2 || originPlace?.nameCn || originPlace?.nameEn || getVal(row, '接货地名称（标准）', '接货地名称(标准)'),
        portOfDischarge: portOfDischargeCode2 || destPlace?.nameCn || destPlace?.nameEn || getVal(row, '交货地名称（标准）', '交货地名称(标准)'),
        // 优先从 places 数组获取，fallback到直接列名
        shipmentDate: parseDate(originPlace?.atd || originPlace?.etd || getVal(row, '接货地实际离开时间') || getVal(row, '实际装船时间') || getVal(row, '装船日期') || getVal(row, '出运日期')),
        actualLoadingDate: parseDate(originPlace?.actualLoading || getVal(row, '实际装船时间')),
        eta: parseDate(destPlace?.eta || getVal(row, '交货地预计到达时间') || getVal(row, '目的地预计到达时间') || getVal(row, 5, '预计到达时间') || getVal(row, '预计到港日期')),
        ata: parseDate(destPlace?.ata || getVal(row, '交货地实际到达时间') || getVal(row, '目的地实际到达时间') || getVal(row, 5, '实际到达时间') || getVal(row, '目的港到达日期'))
      });
      await seaFreightRepo.save(sf);
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
        portName: portName,
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
        const oldStatus = container.logisticsStatus;
        const newStatus = result.status;
        container.logisticsStatus = newStatus;
        await AppDataSource.getRepository(Container).save(container);

        // 【增强审计】记录详细的状态变更日志
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
                hasReturnTime: !!er?.returnTime,
                hasWmsConfirm: !!wo?.wmsConfirmDate,
                hasPickupDate: !!tt?.pickupDate,
                hasDestAta: portOps.some(po => po.portType === 'destination' && po.ata),
                hasTransitAta: portOps.some(po => po.portType === 'transit' && po.ata),
                hasShipmentDate: !!container.seaFreight?.shipmentDate,
              }
            }
          },
          remark: `飞驼Excel导入触发状态机重算: ${oldStatus} → ${newStatus}`
        });
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
   * 保存发生地信息子集（去重）
   * 按 (mblNumber, portCode, placeType, placeIndex) 去重
   */
  private async savePlacesSubset(
    batchId: number,
    row: FeituoRowData,
    mblNumber: string
  ): Promise<void> {
    const placesRepo = AppDataSource.getRepository(ExtFeituoPlace);
    
    // 处理多个发生地（假设最多10个，字段名带编号或不带编号）
    const processedPorts = new Set<string>();
    
    for (let i = 0; i < 10; i++) {
      const suffix = i === 0 ? '' : `_${i + 1}`;
      const portCode = getVal(row, `发生地信息_地点CODE${suffix}`, '发生地信息_地点CODE') as string;
      if (!portCode) continue;

      const uniqueKey = `${mblNumber}_${portCode}_${i}`;
      if (processedPorts.has(uniqueKey)) continue;
      processedPorts.add(uniqueKey);

      const placeType = getVal(row, `发生地信息_地点类型${suffix}`, '发生地信息_地点类型') as string;

      // 检查是否已存在
      const existing = await placesRepo.findOne({
        where: {
          billOfLadingNumber: mblNumber,
          portCode: portCode,
          placeType: placeType || undefined,
          placeIndex: i
        }
      });

      if (existing) {
        // 更新
        Object.assign(existing, {
          portNameEn: getVal(row, `发生地信息_地点名称英文（标准）${suffix}`, '发生地信息_地点名称英文（标准）'),
          portNameCn: getVal(row, `发生地信息_地点名称中文（标准）${suffix}`, '发生地信息_地点名称中文（标准）'),
          portNameOriginal: getVal(row, `发生地信息_地点名称（原始）${suffix}`, '发生地信息_地点名称（原始）'),
          latitude: parseFloat(String(getVal(row, `发生地信息_纬度${suffix}`, '发生地信息_纬度') || 0)) || undefined,
          longitude: parseFloat(String(getVal(row, `发生地信息_经度${suffix}`, '发生地信息_经度') || 0)) || undefined,
          timezone: getVal(row, `发生地信息_时区${suffix}`, '发生地信息_时区') as string,
          etd: parseDate(getVal(row, `发生地信息_预计离开时间${suffix}`, '发生地信息_预计离开时间')),
          eta: parseDate(getVal(row, `发生地信息_预计到达时间${suffix}`, '发生地信息_预计到达时间')),
          ata: parseDate(getVal(row, `发生地信息_实际到达时间${suffix}`, '发生地信息_实际到达时间')),
          atd: parseDate(getVal(row, `发生地信息_实际离开时间${suffix}`, '发生地信息_实际离开时间')),
          firstEtd: parseDate(getVal(row, `发生地信息_首次获取到的etd${suffix}`, '发生地信息_首次获取到的etd')),
          firstEta: parseDate(getVal(row, `发生地信息_首次获取到的eta${suffix}`, '发生地信息_首次获取到的eta')),
          loadedOnBoardDate: parseDate(getVal(row, `发生地信息_实际装船时间${suffix}`, '发生地信息_实际装船时间')),
          unloadDate: parseDate(getVal(row, `发生地信息_实际卸船时间${suffix}`, '发生地信息_实际卸船时间')),
          aisAta: parseDate(getVal(row, `发生地信息_AIS实际到港时间${suffix}`, '发生地信息_AIS实际到港时间')),
          aisBerthing: parseDate(getVal(row, `发生地信息_AIS实际靠泊时间${suffix}`, '发生地信息_AIS实际靠泊时间')),
          aisAtd: parseDate(getVal(row, `发生地信息_AIS实际离港时间${suffix}`, '发生地信息_AIS实际离港时间')),
          terminalName: getVal(row, `发生地信息_码头名称${suffix}`, '发生地信息_码头名称') as string,
          vesselName: getVal(row, `发生地信息_船名${suffix}`, '发生地信息_船名') as string,
          voyageNumber: getVal(row, `发生地信息_航次${suffix}`, '发生地信息_航次') as string,
          cargoLocation: getVal(row, `发生地信息_货物存储位置${suffix}`, '发生地信息_货物存储位置') as string,
          railEtd: parseDate(getVal(row, `发生地信息_铁路预计离开时间${suffix}`, '发生地信息_铁路预计离开时间')),
          freeStorageDays: parseInt(String(getVal(row, `发生地信息_免堆存天数${suffix}`, '发生地信息_免堆存天数') || 0)) || undefined,
          freeDetentionDays: parseInt(String(getVal(row, `发生地信息_免用箱天数${suffix}`, '发生地信息_免用箱天数') || 0)) || undefined,
          freeStorageTime: parseDate(getVal(row, `发生地信息_免堆存时间${suffix}`, '发生地信息_免堆存时间')),
          freeDetentionTime: parseDate(getVal(row, `发生地信息_免用箱时间${suffix}`, '发生地信息_免用箱时间')),
          batchId
        });
        await placesRepo.save(existing);
      } else {
        // 新增
        const rec = placesRepo.create({
          billOfLadingNumber: mblNumber,
          containerNumber: getVal(row, '集装箱物流信息_集装箱号', '集装箱号') as string,
          portCode,
          portNameEn: getVal(row, '发生地信息_地点名称英文（标准）' + suffix, '发生地信息_地点名称英文（标准）') as string,
          portNameCn: getVal(row, '发生地信息_地点名称中文（标准）' + suffix, '发生地信息_地点名称中文（标准）') as string,
          portNameOriginal: getVal(row, '发生地信息_地点名称（原始）' + suffix, '发生地信息_地点名称（原始）') as string,
          placeType: placeType as string,
          placeIndex: i,
          latitude: parseFloat(String(getVal(row, '发生地信息_纬度' + suffix, '发生地信息_纬度') || 0)) || undefined,
          longitude: parseFloat(String(getVal(row, '发生地信息_经度' + suffix, '发生地信息_经度') || 0)) || undefined,
          timezone: getVal(row, '发生地信息_时区' + suffix, '发生地信息_时区') as string,
          etd: parseDate(getVal(row, '发生地信息_预计离开时间' + suffix, '发生地信息_预计离开时间')),
          eta: parseDate(getVal(row, '发生地信息_预计到达时间' + suffix, '发生地信息_预计到达时间')),
          ata: parseDate(getVal(row, '发生地信息_实际到达时间' + suffix, '发生地信息_实际到达时间')),
          atd: parseDate(getVal(row, '发生地信息_实际离开时间' + suffix, '发生地信息_实际离开时间')),
          firstEtd: parseDate(getVal(row, '发生地信息_首次获取到的etd' + suffix, '发生地信息_首次获取到的etd')),
          firstEta: parseDate(getVal(row, '发生地信息_首次获取到的eta' + suffix, '发生地信息_首次获取到的eta')),
          loadedOnBoardDate: parseDate(getVal(row, '发生地信息_实际装船时间' + suffix, '发生地信息_实际装船时间')),
          unloadDate: parseDate(getVal(row, '发生地信息_实际卸船时间' + suffix, '发生地信息_实际卸船时间')),
          aisAta: parseDate(getVal(row, '发生地信息_AIS实际到港时间' + suffix, '发生地信息_AIS实际到港时间')),
          aisBerthing: parseDate(getVal(row, '发生地信息_AIS实际靠泊时间' + suffix, '发生地信息_AIS实际靠泊时间')),
          aisAtd: parseDate(getVal(row, '发生地信息_AIS实际离港时间' + suffix, '发生地信息_AIS实际离港时间')),
          terminalName: getVal(row, '发生地信息_码头名称' + suffix, '发生地信息_码头名称') as string,
          vesselName: getVal(row, '发生地信息_船名' + suffix, '发生地信息_船名') as string,
          voyageNumber: getVal(row, '发生地信息_航次' + suffix, '发生地信息_航次') as string,
          cargoLocation: getVal(row, '发生地信息_货物存储位置' + suffix, '发生地信息_货物存储位置') as string,
          railEtd: parseDate(getVal(row, '发生地信息_铁路预计离开时间' + suffix, '发生地信息_铁路预计离开时间')),
          freeStorageDays: parseInt(String(getVal(row, '发生地信息_免堆存天数' + suffix, '发生地信息_免堆存天数') || 0)) || undefined,
          freeDetentionDays: parseInt(String(getVal(row, '发生地信息_免用箱天数' + suffix, '发生地信息_免用箱天数') || 0)) || undefined,
          freeStorageTime: parseDate(getVal(row, '发生地信息_免堆存时间' + suffix, '发生地信息_免堆存时间')),
          freeDetentionTime: parseDate(getVal(row, '发生地信息_免用箱时间' + suffix, '发生地信息_免用箱时间')),
          batchId
        });
        await placesRepo.save(rec);
      }
    }
  }

  /**
   * 保存集装箱物流信息子集（去重）
   * 按 (mblNumber, containerNumber, eventCode, eventTime) 去重
   */
  private async saveStatusEventsSubset(
    batchId: number,
    row: FeituoRowData,
    mblNumber: string,
    containerNumber: string
  ): Promise<void> {
    const eventsRepo = AppDataSource.getRepository(ExtFeituoStatusEvent);
    
    const containerNumberVal = containerNumber || getVal(row, '集装箱物流信息_集装箱号', '集装箱号') as string;
    if (!containerNumberVal) return;

    // 获取状态代码和发生时间
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

    if (existing) {
      // 更新
      Object.assign(existing, {
        containerType: getVal(row, 11, '箱型') || getVal(row, '集装箱物流信息_箱型') as string,
        containerSize: getVal(row, 11, '箱尺寸') || getVal(row, '集装箱物流信息_箱尺寸') as string,
        containerTypeStd: getVal(row, 11, '箱型（飞驼标准）') || getVal(row, '集装箱物流信息_箱型（飞驼标准）') as string,
        sealNumber: getVal(row, 11, '铅封号') || getVal(row, '集装箱物流信息_铅封号') as string,
        currentStatusCode: getVal(row, 11, '当前状态代码') || getVal(row, '集装箱物流信息_当前状态代码') as string,
        currentStatusDescCn: getVal(row, 11, '当前状态中文描述') || getVal(row, '集装箱物流信息_当前状态中文描述') as string,
        currentStatusDescEn: getVal(row, 11, '当前状态英文描述') || getVal(row, '集装箱物流信息_当前状态英文描述') as string,
        isRolled: parseBool(getVal(row, 11, '是否甩柜') || getVal(row, '集装箱物流信息_是否甩柜')),
        vesselName: getVal(row, 12, '船名/车牌号') || getVal(row, '集装箱物流信息-状态_船名/车牌号') as string,
        voyageNumber: getVal(row, 12, '航次') || getVal(row, '集装箱物流信息-状态_航次') as string,
        transportMode: getVal(row, 12, '运输方式') || getVal(row, '集装箱物流信息-状态_运输方式') as string,
        hasOccurred: parseBool(getVal(row, 12, '是否预计') || getVal(row, '集装箱物流信息-状态_是否预计')),
        locationName: getVal(row, 12, '发生地') || getVal(row, '集装箱物流信息-状态_发生地') as string,
        timezone: getVal(row, 12, '时区') || getVal(row, '集装箱物流信息-状态_时区') as string,
        statusNameCn: getVal(row, 12, '状态描述中文（标准）') || getVal(row, '集装箱物流信息-状态_状态描述中文（标准）') as string,
        statusNameEn: getVal(row, 12, '状态描述英文（标准）') || getVal(row, '集装箱物流信息-状态_状态描述英文（标准）') as string,
        locationOriginal: getVal(row, 12, '发生地（原始）') || getVal(row, '集装箱物流信息-状态_发生地（原始）') as string,
        statusDescOriginal: getVal(row, 12, '状态描述（原始）') || getVal(row, '集装箱物流信息-状态_状态描述（原始）') as string,
        locationCode: getVal(row, 12, '地点CODE') || getVal(row, '集装箱物流信息-状态_地点CODE') as string,
        terminalName: getVal(row, 12, '码头名称') || getVal(row, '集装箱物流信息-状态_码头名称') as string,
        cargoLocation: getVal(row, 12, '货物存储位置') || getVal(row, '集装箱物流信息-状态_货物存储位置') as string,
        subBillNumber: getVal(row, 12, '分单号') || getVal(row, '集装箱物流信息-状态_分单号') as string,
        customsDeclarationNumber: getVal(row, 12, '报关单号') || getVal(row, '集装箱物流信息-状态_报关单号') as string,
        exceptionNode: getVal(row, 12, '异常节点') || getVal(row, '集装箱物流信息-状态_异常节点') as string,
        dataSource: getVal(row, 12, '数据来源') || getVal(row, '集装箱物流信息-状态_数据来源') as string,
        batchId
      });
      await eventsRepo.save(existing);
    } else {
      // 新增
      const rec = eventsRepo.create({
        billOfLadingNumber: mblNumber,
        containerNumber: containerNumberVal,
        eventCode: statusCode,
        eventTime: statusOccurredAt,
        containerType: getVal(row, 11, '箱型') || getVal(row, '集装箱物流信息_箱型') as string,
        containerSize: getVal(row, 11, '箱尺寸') || getVal(row, '集装箱物流信息_箱尺寸') as string,
        containerTypeStd: getVal(row, 11, '箱型（飞驼标准）') || getVal(row, '集装箱物流信息_箱型（飞驼标准）') as string,
        sealNumber: getVal(row, 11, '铅封号') || getVal(row, '集装箱物流信息_铅封号') as string,
        currentStatusCode: getVal(row, 11, '当前状态代码') || getVal(row, '集装箱物流信息_当前状态代码') as string,
        currentStatusDescCn: getVal(row, 11, '当前状态中文描述') || getVal(row, '集装箱物流信息_当前状态中文描述') as string,
        currentStatusDescEn: getVal(row, 11, '当前状态英文描述') || getVal(row, '集装箱物流信息_当前状态英文描述') as string,
        isRolled: parseBool(getVal(row, 11, '是否甩柜') || getVal(row, '集装箱物流信息_是否甩柜')),
        vesselName: getVal(row, 12, '船名/车牌号') || getVal(row, '集装箱物流信息-状态_船名/车牌号') as string,
        voyageNumber: getVal(row, 12, '航次') || getVal(row, '集装箱物流信息-状态_航次') as string,
        transportMode: getVal(row, 12, '运输方式') || getVal(row, '集装箱物流信息-状态_运输方式') as string,
        hasOccurred: parseBool(getVal(row, 12, '是否预计') || getVal(row, '集装箱物流信息-状态_是否预计')),
        locationName: getVal(row, 12, '发生地') || getVal(row, '集装箱物流信息-状态_发生地') as string,
        timezone: getVal(row, 12, '时区') || getVal(row, '集装箱物流信息-状态_时区') as string,
        statusNameCn: getVal(row, 12, '状态描述中文（标准）') || getVal(row, '集装箱物流信息-状态_状态描述中文（标准）') as string,
        statusNameEn: getVal(row, 12, '状态描述英文（标准）') || getVal(row, '集装箱物流信息-状态_状态描述英文（标准）') as string,
        locationOriginal: getVal(row, 12, '发生地（原始）') || getVal(row, '集装箱物流信息-状态_发生地（原始）') as string,
        statusDescOriginal: getVal(row, 12, '状态描述（原始）') || getVal(row, '集装箱物流信息-状态_状态描述（原始）') as string,
        locationCode: getVal(row, 12, '地点CODE') || getVal(row, '集装箱物流信息-状态_地点CODE') as string,
        terminalName: getVal(row, 12, '码头名称') || getVal(row, '集装箱物流信息-状态_码头名称') as string,
        cargoLocation: getVal(row, 12, '货物存储位置') || getVal(row, '集装箱物流信息-状态_货物存储位置') as string,
        subBillNumber: getVal(row, 12, '分单号') || getVal(row, '集装箱物流信息-状态_分单号') as string,
        customsDeclarationNumber: getVal(row, 12, '报关单号') || getVal(row, '集装箱物流信息-状态_报关单号') as string,
        exceptionNode: getVal(row, 12, '异常节点') || getVal(row, '集装箱物流信息-状态_异常节点') as string,
        dataSource: getVal(row, 12, '数据来源') || getVal(row, '集装箱物流信息-状态_数据来源') as string,
        batchId
      });
      await eventsRepo.save(rec);
    }
  }

  /**
   * 保存船舶信息子集（去重）
   * 按 (mblNumber, vesselName) 去重
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
        vesselName: vesselName
      }
    });

    if (existing) {
      // 更新
      Object.assign(existing, {
        imoNumber: getVal(row, 13, 'IMO') || getVal(row, '船泊信息_imo') as string,
        mmsiNumber: getVal(row, 13, 'MMSI') || getVal(row, '船泊信息_mmsi') as string,
        buildDate: parseDate(getVal(row, 13, '船舶建造日') || getVal(row, '船泊信息_船舶建造日')),
        flag: getVal(row, 13, '船籍') || getVal(row, '船泊信息_船籍') as string,
        containerSize: getVal(row, 13, '箱尺寸') || getVal(row, '船泊信息_箱尺寸') as string,
        operator: getVal(row, 13, '运营方') || getVal(row, '船泊信息_运营方') as string,
        batchId
      });
      await vesselsRepo.save(existing);
    } else {
      // 新增
      const rec = vesselsRepo.create({
        billOfLadingNumber: mblNumber,
        vesselName: vesselName,
        imoNumber: getVal(row, 13, 'IMO') || getVal(row, '船泊信息_imo') as string,
        mmsiNumber: getVal(row, 13, 'MMSI') || getVal(row, '船泊信息_mmsi') as string,
        buildDate: parseDate(getVal(row, 13, '船舶建造日') || getVal(row, '船泊信息_船舶建造日')),
        flag: getVal(row, 13, '船籍') || getVal(row, '船泊信息_船籍') as string,
        containerSize: getVal(row, 13, '箱尺寸') || getVal(row, '船泊信息_箱尺寸') as string,
        operator: getVal(row, 13, '运营方') || getVal(row, '船泊信息_运营方') as string,
        batchId
      });
      await vesselsRepo.save(rec);
    }
  }
}

export const feituoImportService = new FeituoImportService();
