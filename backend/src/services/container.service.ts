/**
 * 货柜服务层
 * Container Service
 * 负责处理货柜相关的复杂业务逻辑
 */

import { In, Repository } from 'typeorm';
import { AppDataSource } from '../database';
import { Container } from '../entities/Container';
import { AlertLevel, AlertType, ContainerAlert } from '../entities/ContainerAlert';
import { ContainerStatusEvent } from '../entities/ContainerStatusEvent';
import { Country } from '../entities/Country';
import { CustomsBroker } from '../entities/CustomsBroker';
import { EmptyReturn } from '../entities/EmptyReturn';
import { ExtDemurrageRecord } from '../entities/ExtDemurrageRecord';
import { ExtFeituoStatusEvent } from '../entities/ExtFeituoStatusEvent';
import { Port } from '../entities/Port';
import { PortOperation } from '../entities/PortOperation';
import { ReplenishmentOrder } from '../entities/ReplenishmentOrder';
import { SeaFreight } from '../entities/SeaFreight';
import { TruckingCompany } from '../entities/TruckingCompany';
import { TruckingPortMapping } from '../entities/TruckingPortMapping';
import { TruckingTransport } from '../entities/TruckingTransport';
import { Warehouse } from '../entities/Warehouse';
import { WarehouseOperation } from '../entities/WarehouseOperation';
import { WarehouseTruckingMapping } from '../entities/WarehouseTruckingMapping';
import { buildGanttDerived } from '../utils/ganttDerivedBuilder';
import { logger } from '../utils/logger';
import { calculateLogisticsStatus } from '../utils/logisticsStatusMachine';
import { getScopedCountryCode } from '../utils/requestContext';

interface ContainerWithStatus {
  container: Container;
  firstOrderNumber: string | null;
  orderInfo: ReplenishmentOrder | null;
  latestEvent: ContainerStatusEvent | null;
  latestPortOperation: PortOperation | null;
  currentPortType: 'transit' | 'destination' | 'origin' | null;
  seaFreight: SeaFreight | null;
  truckingTransport: TruckingTransport | null;
  warehouseOperation: WarehouseOperation | null;
  emptyReturn: EmptyReturn | null;
}

export class ContainerService {
  constructor(
    private containerRepository: Repository<Container>,
    private statusEventRepository: Repository<ContainerStatusEvent>,
    private portOperationRepository: Repository<PortOperation>,
    private seaFreightRepository: Repository<SeaFreight>,
    private truckingTransportRepository: Repository<TruckingTransport>,
    private warehouseOperationRepository: Repository<WarehouseOperation>,
    private emptyReturnRepository: Repository<EmptyReturn>,
    private orderRepository: Repository<ReplenishmentOrder>,
    private alertRepository: Repository<ContainerAlert>,
    // 字典表
    private customsBrokerRepository: Repository<CustomsBroker>,
    private truckingCompanyRepository: Repository<TruckingCompany>,
    private warehouseRepository: Repository<Warehouse>,
    private portRepository: Repository<Port>,
    private countryRepository: Repository<Country>,
    private demurrageRecordRepository: Repository<ExtDemurrageRecord>,
    // 映射表
    private truckingPortMappingRepository: Repository<TruckingPortMapping>,
    private warehouseTruckingMappingRepository: Repository<WarehouseTruckingMapping>
  ) {}

  /**
   * 为货柜列表添加扩展信息（优化版本）
   * 使用批量查询替代N+1查询，提升性能
   */
  async enrichContainersList(containers: Container[]): Promise<any[]> {
    const startTime = Date.now();

    // 批量查询优化：收集所有container_number
    const containerNumbers = containers.map((c) => c.containerNumber);

    // 批量查询所有相关数据
    const [
      ordersMap,
      eventsMap,
      portOperationsMap,
      truckingMap,
      warehouseMap,
      emptyReturnsMap,
      alertsMap,
      customsBrokersMap,
      truckingCompaniesMap,
      warehousesMap,
      countriesMap,
      portNameMap,
      costBreakdownMap
    ] = await Promise.all([
      this.batchFetchOrders(containerNumbers),
      this.batchFetchStatusEvents(containerNumbers),
      this.batchFetchPortOperations(containerNumbers),
      this.batchFetchTruckingTransports(containerNumbers),
      this.batchFetchWarehouseOperations(containerNumbers),
      this.batchFetchEmptyReturns(containerNumbers),
      this.batchFetchAlerts(containerNumbers),
      this.batchFetchCustomsBrokers(),
      this.batchFetchTruckingCompanies(),
      this.batchFetchWarehouses(),
      this.batchFetchCountries(),
      this.batchFetchPortNames(containerNumbers),
      this.batchFetchCostBreakdown(containerNumbers)
    ]);

    // 收集目的港和国家用于查询映射表
    const portCodesSet = new Set<string>();
    const countriesSet = new Set<string>();
    containers.forEach((container) => {
      const destPort = portOperationsMap.get(container.containerNumber)?.find(
        (op) => op.portType === 'destination'
      );
      if (destPort?.portCode) portCodesSet.add(destPort.portCode);
      const order = ordersMap.get(container.containerNumber);
      if (order?.sellToCountry) countriesSet.add(order.sellToCountry);
    });

    // 添加全局国别筛选到查询列表（用于静态映射关系查询）
    const scopedCountry = getScopedCountryCode();
    if (scopedCountry) {
      countriesSet.add(scopedCountry);
      logger.info(`[enrichContainersList] 添加全局国别筛选: ${scopedCountry}`);
    }

    // 调试日志：查看收集到的目的港和国家
    logger.info('[enrichContainersList] 收集的 portCodes:', Array.from(portCodesSet));
    logger.info('[enrichContainersList] 收集的 countries:', Array.from(countriesSet));

    // 批量查询候选车队（先查车队）
    const truckingByPortMap = await this.batchFetchCandidateTruckingByPort(
      Array.from(portCodesSet),
      Array.from(countriesSet)
    );

    // 调试日志：查看查询到的车队映射
    logger.info('[enrichContainersList] 查询到的 truckingByPortMap keys:', Array.from(truckingByPortMap.keys()));

    // 收集所有候选车队ID
    const truckingIdsSet = new Set<string>();
    truckingByPortMap.forEach((truckings) => {
      truckings.forEach((t) => truckingIdsSet.add(t.truckingCompanyId));
    });

    // 批量查询候选仓库（根据车队）
    const warehousesByTruckingMap = await this.batchFetchCandidateWarehousesByTrucking(
      Array.from(truckingIdsSet),
      Array.from(countriesSet)
    );

    const enrichedContainers = containers.map((container) => {
      try {
        const containerNumber = container.containerNumber;

        // 从批量查询结果中获取数据
        const orderInfo = ordersMap.get(containerNumber);
        const latestEvent = eventsMap.get(containerNumber);
        const portOperations = portOperationsMap.get(containerNumber) || [];
        const destPortOp = portOperations.find((op) => op.portType === 'destination');
        const destinationPortCode = container.seaFreight?.portOfDischarge || null;
        const destinationPortName = destinationPortCode
          ? portNameMap.get(destinationPortCode) || destinationPortCode
          : null;
        const truckingTransport = truckingMap.get(containerNumber);
        const warehouseOperation = warehouseMap.get(containerNumber);
        const emptyReturn = emptyReturnsMap.get(containerNumber);

        // 计算物流状态（参数顺序：container, portOperations, seaFreight, truckingTransport, warehouseOperation, emptyReturn）
        const logisticsResult = calculateLogisticsStatus(
          container,
          portOperations,
          container.seaFreight ?? undefined,
          truckingTransport ?? undefined,
          warehouseOperation ?? undefined,
          emptyReturn ?? undefined
        );

        const currentPortType = logisticsResult.currentPortType;
        const latestPortOperation = logisticsResult.latestPortOperation;
        const latestLogisticsStatus = logisticsResult.status;

        // 计算当前位置
        const currentLocation = this.calculateCurrentLocation(
          latestEvent ?? null,
          latestLogisticsStatus,
          latestPortOperation,
          currentPortType
        );

        // 获取供应商名称（从字典表）
        const customsBrokerCode =
          destPortOp?.customsBrokerCode || latestPortOperation?.customsBrokerCode;
        const truckingCompanyId = truckingTransport?.truckingCompanyId;
        const warehouseId = warehouseOperation?.warehouseId;
        // 获取销往国家代码，用于资源缺省约定
        const sellToCountry = orderInfo?.sellToCountry;

        // 资源缺省约定：无记录时使用 "{国家中文名}资源类型" 格式
        const getCountryName = (): string | null => {
          if (!sellToCountry) return null;
          const country = countriesMap.get(sellToCountry);
          return country?.nameCn || null;
        };

        const getCountryCurrency = (): string | null => {
          if (!sellToCountry) return null;
          const country = countriesMap.get(sellToCountry);
          return country?.currency || null;
        };

        // 清关行缺省约定
        const getCustomsBrokerName = (): string | null => {
          if (!customsBrokerCode) return null;
          const broker = customsBrokersMap.get(customsBrokerCode);
          if (broker?.brokerName) return broker.brokerName;
          const countryName = getCountryName();
          if (countryName) return `${countryName}清关行`;
          return customsBrokerCode;
        };

        // 车队缺省约定
        const getTruckingCompanyName = (): string | null => {
          if (!truckingCompanyId) return null;
          const company = truckingCompaniesMap.get(truckingCompanyId);
          if (company?.companyName) return company.companyName;
          const countryName = getCountryName();
          if (countryName) return `${countryName}车队`;
          return truckingCompanyId;
        };

        // 仓库缺省约定（warehouseId 优先，其次 actualWarehouse/plannedWarehouse）
        const getWarehouseName = (): string | null => {
          const codeOrName =
            warehouseId ||
            warehouseOperation?.actualWarehouse ||
            warehouseOperation?.plannedWarehouse;
          if (!codeOrName) return null;
          const warehouse = warehousesMap.get(codeOrName);
          if (warehouse?.warehouseName) return warehouse.warehouseName;
          const countryName = getCountryName();
          if (countryName) return `${countryName}仓库`;
          return codeOrName;
        };

        const getReturnTerminalName = (): string | null => {
          const name = emptyReturn?.returnTerminalName;
          const code = emptyReturn?.returnTerminalCode;
          if (name) return name;
          if (code) return code;
          return null;
        };

        const supplierNames = {
          customsBrokerName: getCustomsBrokerName(),
          truckingCompanyName: getTruckingCompanyName(),
          warehouseName: getWarehouseName(),
          returnTerminalName: getReturnTerminalName()
        };

        // 获取候选供应商（基于映射关系，用于甘特图显示可用选项）
        const destPortCode = destPortOp?.portCode || destinationPortCode;
        const mappingKey = destPortCode && sellToCountry ? `${destPortCode}:${sellToCountry}` : null;

        // 调试日志：单个货柜的映射情况
        logger.info(`[enrichContainersList] ${containerNumber}: destPortOp.portCode=${destPortOp?.portCode}, destPortCode=${destPortCode}, sellToCountry=${sellToCountry}, mappingKey=${mappingKey}`);

        // 候选车队列表（从映射表获取）
        const availableTruckingCompanies = mappingKey
          ? truckingByPortMap.get(mappingKey) || []
          : [];

        // 候选仓库列表（根据候选车队获取）
        const availableWarehouses: Array<{ warehouseCode: string; warehouseName: string; truckingCompanyId: string; isDefault: boolean }> = [];
        if (mappingKey) {
          const truckingList = truckingByPortMap.get(mappingKey) || [];
          const truckingIds = truckingList.map((t) => t.truckingCompanyId);
          const truckingCountryKey = (id: string) => `${id}:${sellToCountry}`;
          truckingIds.forEach((id) => {
            const warehouseList = warehousesByTruckingMap.get(truckingCountryKey(id)) || [];
            warehouseList.forEach((wh) => {
              if (!availableWarehouses.find((w) => w.warehouseCode === wh.warehouseCode)) {
                availableWarehouses.push(wh);
              }
            });
          });
          // 按 isDefault 排序
          availableWarehouses.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
        }

        // 调试日志：候选供应商数量
        logger.info(`[enrichContainersList] ${containerNumber}: availableTrucking=${availableTruckingCompanies.length}, availableWarehouses=${availableWarehouses.length}`);

        // 获取预警信息
        const alerts = alertsMap.get(containerNumber) || [];
        const alertCount = alerts.filter((alert) => !alert.resolved).length;
        const resolvedAlertCount = alerts.filter((alert) => alert.resolved).length;
        const hasResolvedAlerts = resolvedAlertCount > 0;
        const costBreakdown = costBreakdownMap.get(containerNumber) ?? null;

        // 甘特派生：始终以流程表即时计算（与 ganttDerivedBuilder 单一真相一致），不读可能过期的 gantt_derived 列
        const ganttDerived = buildGanttDerived(
          portOperations,
          truckingTransport ?? undefined,
          warehouseOperation ?? undefined,
          emptyReturn ?? undefined
        );

        return {
          ...container,
          orderNumber: orderInfo?.orderNumber ?? null,
          latestStatus: this.formatLatestStatus(latestEvent ?? null),
          location: currentLocation,
          lastUpdated: container.updatedAt,
          currentPortType,
          latestPortOperation: this.formatPortOperation(latestPortOperation),
          logisticsStatus: latestLogisticsStatus,
          ganttDerived,
          // 预警信息
          alerts: alerts.map((alert) => ({
            id: alert.id,
            type: alert.type,
            level: alert.level,
            message: alert.message,
            resolved: alert.resolved,
            createdAt: alert.createdAt,
            resolvedAt: alert.resolvedAt
          })),
          alertCount,
          resolvedAlertCount,
          hasResolvedAlerts,
          // 费用信息（来自 ext_demurrage_records）
          totalCost: costBreakdown?.total ?? null,
          costBreakdown,
          // 扩展字段（与列表表头绑定一致）
          // 始终使用目的港的ETA/ATA，不受中转港影响
          etaDestPort: this.toUtcDateString(destPortOp?.eta || container.seaFreight?.eta || null),
          etaCorrection: this.toUtcDateString(destPortOp?.etaCorrection || null),
          ataDestPort: this.toUtcDateString(destPortOp?.ata || null),
          customsStatus: destPortOp?.customsStatus || null,
          destinationPort: destinationPortCode,
          destinationPortName,
          billOfLadingNumber:
            container.seaFreight?.mblNumber || container.seaFreight?.billOfLadingNumber || null,
          mblNumber: container.seaFreight?.mblNumber || null,
          actualShipDate: this.toUtcDateString(
            orderInfo?.expectedShipDate || container.seaFreight?.shipmentDate || null
          ),
          sellToCountry: orderInfo?.sellToCountry || null,
          countryCurrency: getCountryCurrency(),
          customerName: orderInfo?.customerName || null,
          // 计划提柜日 / 实际提柜日 / 最晚提柜日 / 最晚还箱日 / 实际还箱日（列表表头用）
          // lastFreeDate 来自目的港港口操作，与 currentPortType 无关
          plannedPickupDate: this.toUtcDateString(truckingTransport?.plannedPickupDate || null),
          pickupDate: this.toUtcDateString(truckingTransport?.pickupDate || null),
          plannedDeliveryDate: this.toUtcDateString(truckingTransport?.plannedDeliveryDate || null),
          deliveryDate: this.toUtcDateString(truckingTransport?.deliveryDate || null),
          plannedReturnDate: this.toUtcDateString(emptyReturn?.plannedReturnDate || null),
          lastFreeDate: this.toUtcDateString(
            destPortOp?.lastFreeDate ?? latestPortOperation?.lastFreeDate ?? null
          ),
          lastReturnDate: this.toUtcDateString(emptyReturn?.lastReturnDate || null),
          returnTime: this.toUtcDateString(emptyReturn?.returnTime || null),
          // 供应商名称（用于甘特图三级展示）
          supplierNames,
          // 候选供应商（基于映射关系，用于甘特图显示可用选项）
          availableTruckingCompanies,
          availableWarehouses,
          // 关联数据（用于前端过滤与甘特图三级分组）
          portOperations,
          truckingTransports: truckingTransport ? [truckingTransport] : [],
          warehouseOperations: warehouseOperation ? [warehouseOperation] : [],
          emptyReturns: emptyReturn ? [emptyReturn] : [],
          // SeaFreight 用于详情
          seaFreight: container.seaFreight || null
        };
      } catch (error) {
        logger.warn(`[ContainerService] Failed to enrich ${container.containerNumber}:`, error);
        return { ...container, latestStatus: null, location: '-' };
      }
    });

    const endTime = Date.now();
    logger.info(
      `[enrichContainersList] Processed ${containers.length} containers in ${(endTime - startTime).toFixed(2)}ms`
    );

    return enrichedContainers;
  }

  private normalizeChargeMode(
    calculationMode?: string | null,
    chargeStatus?: string | null
  ): 'actual' | 'forecast' {
    const mode = String(calculationMode || '').toLowerCase();
    if (mode === 'actual' || mode === 'forecast') return mode;
    const status = String(chargeStatus || '').toUpperCase();
    return status === 'FINAL' ? 'actual' : 'forecast';
  }

  /** 统一输出日期字符串（YYYY-MM-DD），不做时区换算，按源数据日期展示 */
  private toUtcDateString(input?: Date | string | null): string | null {
    if (!input) return null;
    if (typeof input === 'string') {
      const match = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    }
    const d = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /**
   * 批量读取费用明细（滞港/滞箱/堆存等），按柜聚合到列表行
   */
  private async batchFetchCostBreakdown(containerNumbers: string[]) {
    const map = new Map<
      string,
      {
        currency: string;
        total: number;
        items: Array<{
          chargeType: string | null;
          chargeName: string | null;
          amount: number;
          mode: 'actual' | 'forecast';
        }>;
      }
    >();
    if (containerNumbers.length === 0) return map;

    const rows = await this.demurrageRecordRepository.find({
      where: { containerNumber: In(containerNumbers) },
      order: { computedAt: 'DESC', id: 'DESC' }
    });

    for (const row of rows) {
      const cn = row.containerNumber;
      if (!cn) continue;
      const amount = Number(row.chargeAmount ?? 0);
      const mode = this.normalizeChargeMode(row.calculationMode, row.chargeStatus);
      const current = map.get(cn) ?? {
        currency: row.currency || 'USD',
        total: 0,
        items: []
      };
      current.currency = current.currency || row.currency || 'USD';
      current.total += amount;
      current.items.push({
        chargeType: row.chargeType || null,
        chargeName: row.chargeName || null,
        amount,
        mode
      });
      map.set(cn, current);
    }

    for (const [, v] of map) {
      v.total = Math.round(v.total * 100) / 100;
    }
    return map;
  }

  /**
   * 按集装箱号返回与列表行完全一致的 enrich 数据，用于与前端/数据库核对
   */
  async getListRowByContainerNumber(containerNumber: string): Promise<any | null> {
    const container = await this.containerRepository.findOne({
      where: { containerNumber },
      relations: ['seaFreight']
    });
    if (!container) return null;
    const [row] = await this.enrichContainersList([container]);
    return row ?? null;
  }

  /**
   * 从流程表即时构建 gantt_derived（与 enrich / 详情 API 口径一致，不读库列）
   */
  async buildGanttDerivedForContainerNumber(containerNumber: string) {
    const [portOperations, truckingTransport, warehouseOperation, emptyReturn] = await Promise.all([
      this.portOperationRepository.find({
        where: { containerNumber },
        order: { portSequence: 'ASC' }
      }),
      this.truckingTransportRepository.findOne({ where: { containerNumber } }),
      this.warehouseOperationRepository.findOne({ where: { containerNumber } }),
      this.emptyReturnRepository.findOne({ where: { containerNumber } })
    ]);
    return buildGanttDerived(
      portOperations,
      truckingTransport ?? undefined,
      warehouseOperation ?? undefined,
      emptyReturn ?? undefined
    );
  }

  /**
   * 排产预览等：加载港口/海运/备货单
   */
  async getContainerByNumber(containerNumber: string): Promise<Container | null> {
    return this.containerRepository.findOne({
      where: { containerNumber },
      relations: ['portOperations', 'seaFreight', 'replenishmentOrders']
    });
  }

  /**
   * 为单个货柜添加扩展信息
   */
  private async enrichSingleContainer(container: Container): Promise<ContainerWithStatus> {
    // 并行查询所有相关数据
    const firstOrderNumber = await this.getFirstOrderNumberForContainer(container.containerNumber);
    const [
      orderInfo,
      latestEvent,
      portOperations,
      truckingTransport,
      warehouseOperation,
      emptyReturn
    ] = await Promise.allSettled([
      this.fetchOrderInfo(firstOrderNumber),
      this.fetchLatestStatusEvent(container.containerNumber),
      this.fetchPortOperations(container.containerNumber),
      this.fetchTruckingTransport(container.containerNumber),
      this.fetchWarehouseOperation(container.containerNumber),
      this.fetchEmptyReturn(container.containerNumber)
    ]);

    // 处理查询结果（SeaFreight 通过 Container.seaFreight 关联加载，process_sea_freight 表无 container_number）
    const orderInfoData = orderInfo.status === 'fulfilled' ? orderInfo.value : null;
    const latestEventData = latestEvent.status === 'fulfilled' ? latestEvent.value : null;
    const portOperationsData = portOperations.status === 'fulfilled' ? portOperations.value : [];
    let seaFreightData: SeaFreight | null = container.seaFreight ?? null;
    if (!seaFreightData && (container as any).bill_of_lading_number) {
      try {
        seaFreightData =
          (await this.seaFreightRepository.findOne({
            where: { billOfLadingNumber: (container as any).bill_of_lading_number }
          })) ?? null;
      } catch (_) {
        /* ignore */
      }
    }
    const truckingTransportData =
      truckingTransport.status === 'fulfilled' ? truckingTransport.value : null;
    const warehouseOperationData =
      warehouseOperation.status === 'fulfilled' ? warehouseOperation.value : null;
    const emptyReturnData = emptyReturn.status === 'fulfilled' ? emptyReturn.value : null;

    // 计算物流状态
    const result = calculateLogisticsStatus(
      container,
      portOperationsData,
      seaFreightData ?? undefined,
      truckingTransportData ?? undefined,
      warehouseOperationData ?? undefined,
      emptyReturnData ?? undefined
    );

    // 如果状态需要更新
    if (result.status !== container.logisticsStatus) {
      container.logisticsStatus = result.status;
      await this.containerRepository.save(container);
      logger.info(
        `[Container] ${container.containerNumber} Status update: ${result.status} (portType: ${result.currentPortType})`
      );
    }

    return {
      container,
      firstOrderNumber,
      orderInfo: orderInfoData,
      latestEvent: latestEventData,
      latestPortOperation: result.latestPortOperation,
      currentPortType: result.currentPortType,
      seaFreight: seaFreightData,
      truckingTransport: truckingTransportData,
      warehouseOperation: warehouseOperationData,
      emptyReturn: emptyReturnData
    };
  }

  /**
   * 获取货柜的所有状态事件
   */
  async getContainerStatusEvents(containerNumber: string): Promise<any[]> {
    const statusEvents: any[] = [];

    // 港口操作状态事件
    const portEvents = await this.getPortOperationEvents(containerNumber);
    statusEvents.push(...portEvents);

    // 拖卡运输状态事件
    const truckingEvents = await this.getTruckingEvents(containerNumber);
    statusEvents.push(...truckingEvents);

    // 仓库操作状态事件
    const warehouseEvents = await this.getWarehouseEvents(containerNumber);
    statusEvents.push(...warehouseEvents);

    // 还空箱状态事件
    const returnEvents = await this.getReturnEvents(containerNumber);
    statusEvents.push(...returnEvents);

    // 按时间倒序排序
    statusEvents.sort((a, b) => {
      const timeA = new Date(a.occurredAt).getTime();
      const timeB = new Date(b.occurredAt).getTime();
      return timeB - timeA;
    });

    return statusEvents;
  }

  /**
   * 获取港口操作状态事件
   */
  private async getPortOperationEvents(containerNumber: string): Promise<any[]> {
    const portOperations = await this.portOperationRepository
      .createQueryBuilder('po')
      .where('po.containerNumber = :containerNumber', { containerNumber })
      .getMany();

    const events: any[] = [];

    for (const po of portOperations) {
      // 预计到港时间
      if (po.eta) {
        events.push({
          id: `${po.id}-eta`,
          statusCode: 'ETA',
          occurredAt: po.eta,
          locationNameCn: po.portName || '目的港',
          locationNameEn: po.portName || 'Destination Port',
          locationCode: po.portCode,
          description: `预计到港时间 - ${po.portName}`,
          statusType: 'ETA',
          isEstimated: true,
          dataSource: po.dataSource || 'System'
        });
      }

      // 实际到港时间
      if (po.ata) {
        events.push({
          id: `${po.id}-ata`,
          statusCode: 'ATA',
          occurredAt: po.ata,
          locationNameCn: po.portName || '目的港',
          locationNameEn: po.portName || 'Destination Port',
          locationCode: po.portCode,
          description: `实际到港时间 - ${po.portName}`,
          statusType: 'ATA',
          isEstimated: false,
          dataSource: po.dataSource || 'System'
        });
      }

      // 目的港卸船时间
      if (po.destPortUnloadDate) {
        events.push({
          id: `${po.id}-unload`,
          statusCode: 'UNLOADED',
          occurredAt: po.destPortUnloadDate,
          locationNameCn: po.portName || '目的港',
          locationNameEn: po.portName || 'Destination Port',
          locationCode: po.portCode,
          description: `目的港卸船/火车日期 - ${po.portName}`,
          statusType: 'ATA',
          isEstimated: false,
          dataSource: po.dataSource || 'System'
        });
      }

      // 入闸时间
      if (po.gateInTime) {
        events.push({
          id: `${po.id}-gatein`,
          statusCode: 'GATE_IN',
          occurredAt: po.gateInTime,
          locationNameCn:
            po.locationNameCn || po.gateInTerminal || po.gateOutTerminal || po.portName,
          locationNameEn:
            po.locationNameEn || po.gateInTerminal || po.gateOutTerminal || po.portName,
          locationCode: po.portCode,
          description: `入闸时间 - ${po.gateInTerminal || po.portName}`,
          statusType: 'ATA',
          isEstimated: false,
          dataSource: po.dataSource || 'Terminal'
        });
      }

      // 出闸时间
      if (po.gateOutTime) {
        events.push({
          id: `${po.id}-gateout`,
          statusCode: 'GATE_OUT',
          occurredAt: po.gateOutTime,
          locationNameCn:
            po.locationNameCn || po.gateInTerminal || po.gateOutTerminal || po.portName,
          locationNameEn:
            po.locationNameEn || po.gateInTerminal || po.gateOutTerminal || po.portName,
          locationCode: po.portCode,
          description: `出闸时间 - ${po.gateOutTerminal || po.portName}`,
          statusType: 'ATD',
          isEstimated: false,
          dataSource: po.dataSource || 'Terminal'
        });
      }

      // 可提货时间
      if (po.availableTime) {
        events.push({
          id: `${po.id}-available`,
          statusCode: 'AVAILABLE',
          occurredAt: po.availableTime,
          locationNameCn:
            po.locationNameCn || po.gateInTerminal || po.gateOutTerminal || po.portName,
          locationNameEn:
            po.locationNameEn || po.gateInTerminal || po.gateOutTerminal || po.portName,
          locationCode: po.portCode,
          description: `可提货时间 - ${po.portName}`,
          statusType: 'ATA',
          isEstimated: false,
          dataSource: po.dataSource || 'Terminal'
        });
      }

      // 放电时间
      if (po.dischargedTime) {
        events.push({
          id: `${po.id}-discharged`,
          statusCode: 'DISCHARGED',
          occurredAt: po.dischargedTime,
          locationNameCn:
            po.locationNameCn || po.gateInTerminal || po.gateOutTerminal || po.portName,
          locationNameEn:
            po.locationNameEn || po.gateInTerminal || po.gateOutTerminal || po.portName,
          locationCode: po.portCode,
          description: `放电时间 - ${po.portName}`,
          statusType: 'ATA',
          isEstimated: false,
          dataSource: po.dataSource || 'Terminal'
        });
      }

      // 港口状态发生时间
      if (po.statusCode && po.statusOccurredAt) {
        events.push({
          id: `${po.id}-status`,
          statusCode: po.statusCode,
          occurredAt: po.statusOccurredAt,
          locationNameCn: po.locationNameCn || po.portName,
          locationNameEn: po.locationNameEn || po.portName,
          locationCode: po.portCode,
          description: po.locationNameCn || po.locationNameEn || po.portName,
          statusType: 'STATUS',
          isEstimated: !po.hasOccurred,
          dataSource: po.dataSource || 'Unknown',
          hasOccurred: po.hasOccurred,
          cargoLocation: po.cargoLocation,
          locationType: po.locationType,
          latitude: po.latitude,
          longitude: po.longitude,
          timezone: po.timezone,
          terminalName: po.gateInTerminal || po.gateOutTerminal
        });
      }
    }

    return events;
  }

  /**
   * 获取拖卡运输状态事件
   */
  private async getTruckingEvents(containerNumber: string): Promise<any[]> {
    const truckingTransports = await this.truckingTransportRepository
      .createQueryBuilder('tt')
      .where('tt.containerNumber = :containerNumber', { containerNumber })
      .orderBy('tt.lastPickupDate', 'DESC')
      .getMany();

    const events: any[] = [];

    for (const tt of truckingTransports) {
      if (tt.pickupDate) {
        events.push({
          id: `${tt.containerNumber}-pickup`,
          statusCode: 'PICKED_UP',
          occurredAt: tt.pickupDate,
          locationNameCn: tt.pickupLocation || '港口码头',
          locationNameEn: tt.pickupLocation || 'Terminal',
          locationCode: '',
          description: `提柜时间 - ${tt.truckingType || '拖卡运输'}`,
          statusType: 'PICKUP',
          isEstimated: false,
          dataSource: 'Trucking'
        });
      }

      if (tt.deliveryDate) {
        events.push({
          id: `${tt.containerNumber}-delivery`,
          statusCode: 'DELIVERED',
          occurredAt: tt.deliveryDate,
          locationNameCn: tt.deliveryLocation || '仓库',
          locationNameEn: tt.deliveryLocation || 'Warehouse',
          locationCode: '',
          description: `送达时间 - ${tt.deliveryLocation || '仓库'}`,
          statusType: 'DELIVERY',
          isEstimated: false,
          dataSource: 'Trucking'
        });
      }
    }

    return events;
  }

  /**
   * 获取仓库操作状态事件
   */
  private async getWarehouseEvents(containerNumber: string): Promise<any[]> {
    const warehouseOperations = await this.warehouseOperationRepository
      .createQueryBuilder('wo')
      .where('wo.containerNumber = :containerNumber', { containerNumber })
      .orderBy('wo.warehouseArrivalDate', 'DESC')
      .getMany();

    const events: any[] = [];

    for (const wo of warehouseOperations) {
      if (wo.unloadDate) {
        events.push({
          id: `${wo.containerNumber}-unload`,
          statusCode: 'UNLOADED',
          occurredAt: wo.unloadDate,
          locationNameCn: wo.actualWarehouse || wo.plannedWarehouse || '仓库',
          locationNameEn: wo.actualWarehouse || wo.plannedWarehouse || 'Warehouse',
          locationCode: '',
          description: `卸柜时间 - ${wo.actualWarehouse || wo.plannedWarehouse || '仓库'}`,
          statusType: 'UNLOAD',
          isEstimated: false,
          dataSource: 'Warehouse'
        });
      }

      if (wo.warehouseArrivalDate) {
        events.push({
          id: `${wo.containerNumber}-arrival`,
          statusCode: 'WAREHOUSE_ARRIVAL',
          occurredAt: wo.warehouseArrivalDate,
          locationNameCn: wo.actualWarehouse || wo.plannedWarehouse || '仓库',
          locationNameEn: wo.actualWarehouse || wo.plannedWarehouse || 'Warehouse',
          locationCode: '',
          description: `仓库入库时间 - ${wo.actualWarehouse || wo.plannedWarehouse || '仓库'}`,
          statusType: 'ARRIVAL',
          isEstimated: false,
          dataSource: 'Warehouse'
        });
      }

      if (wo.unboxingTime) {
        events.push({
          id: `${wo.containerNumber}-unbox`,
          statusCode: 'UNBOXED',
          occurredAt: wo.unboxingTime,
          locationNameCn: wo.actualWarehouse || wo.plannedWarehouse || '仓库',
          locationNameEn: wo.actualWarehouse || wo.plannedWarehouse || 'Warehouse',
          locationCode: '',
          description: `开箱时间 - ${wo.actualWarehouse || wo.plannedWarehouse || '仓库'}`,
          statusType: 'UNBOX',
          isEstimated: false,
          dataSource: 'Warehouse'
        });
      }
    }

    return events;
  }

  /**
   * 获取还空箱状态事件
   */
  private async getReturnEvents(containerNumber: string): Promise<any[]> {
    const emptyReturns = await this.emptyReturnRepository
      .createQueryBuilder('er')
      .where('er.containerNumber = :containerNumber', { containerNumber })
      .orderBy('er.lastReturnDate', 'DESC')
      .getMany();

    const events: any[] = [];

    for (const er of emptyReturns) {
      if (er.returnTime) {
        events.push({
          id: `${er.containerNumber}-return`,
          statusCode: 'RETURNED_EMPTY',
          occurredAt: er.returnTime,
          locationNameCn: er.returnTerminalName || '还箱点',
          locationNameEn: er.returnTerminalName || 'Return Terminal',
          locationCode: er.returnTerminalCode || '',
          description: `还箱时间 - ${er.returnTerminalName || '还箱点'}`,
          statusType: 'RETURN',
          isEstimated: false,
          dataSource: 'EmptyReturn'
        });
      }
    }

    return events;
  }

  // ==================== 数据查询辅助方法 ====================

  /** 获取货柜下第一个备货单号（biz_containers 无 order_number 字段，通过 biz_replenishment_orders 查） */
  private async getFirstOrderNumberForContainer(containerNumber: string): Promise<string | null> {
    try {
      const order = await this.orderRepository
        .createQueryBuilder('o')
        .select('o.orderNumber')
        .where('o.containerNumber = :containerNumber', { containerNumber })
        .limit(1)
        .getOne();
      return order?.orderNumber ?? null;
    } catch {
      return null;
    }
  }

  private async fetchOrderInfo(orderNumber: string | null): Promise<ReplenishmentOrder | null> {
    if (!orderNumber) return null;
    try {
      return await this.orderRepository
        .createQueryBuilder('replenishment_order')
        .where('replenishment_order.orderNumber = :orderNumber', { orderNumber })
        .getOne();
    } catch (error) {
      logger.warn(`[fetchOrderInfo] Failed to fetch order ${orderNumber}:`, error);
      return null;
    }
  }

  private async fetchLatestStatusEvent(
    containerNumber: string
  ): Promise<ContainerStatusEvent | null> {
    try {
      return await this.statusEventRepository
        .createQueryBuilder('event')
        .where('event.containerNumber = :containerNumber', { containerNumber })
        .orderBy('event.occurredAt', 'DESC')
        .getOne();
    } catch (error) {
      logger.warn(`[fetchLatestStatusEvent] Failed for ${containerNumber}:`, error);
      return null;
    }
  }

  private async fetchPortOperations(containerNumber: string): Promise<PortOperation[]> {
    try {
      return await this.portOperationRepository
        .createQueryBuilder('po')
        .where('po.containerNumber = :containerNumber', { containerNumber })
        .orderBy('po.updatedAt', 'DESC')
        .getMany();
    } catch (error) {
      logger.warn(`[fetchPortOperations] Failed for ${containerNumber}:`, error);
      return [];
    }
  }

  private async fetchTruckingTransport(containerNumber: string): Promise<TruckingTransport | null> {
    try {
      return await this.truckingTransportRepository
        .createQueryBuilder('tt')
        .where('tt.containerNumber = :containerNumber', { containerNumber })
        .getOne();
    } catch (error) {
      logger.warn(`[fetchTruckingTransport] Failed for ${containerNumber}:`, error);
      return null;
    }
  }

  private async fetchWarehouseOperation(
    containerNumber: string
  ): Promise<WarehouseOperation | null> {
    try {
      return await this.warehouseOperationRepository
        .createQueryBuilder('wo')
        .where('wo.containerNumber = :containerNumber', { containerNumber })
        .getOne();
    } catch (error) {
      logger.warn(`[fetchWarehouseOperation] Failed for ${containerNumber}:`, error);
      return null;
    }
  }

  private async fetchEmptyReturn(containerNumber: string): Promise<EmptyReturn | null> {
    try {
      return await this.emptyReturnRepository
        .createQueryBuilder('er')
        .where('er.containerNumber = :containerNumber', { containerNumber })
        .getOne();
    } catch (error) {
      logger.warn(`[fetchEmptyReturn] Failed for ${containerNumber}:`, error);
      return null;
    }
  }

  // ==================== 批量查询优化方法 ====================

  /**
   * 批量查询备货单信息
   */
  private async batchFetchOrders(
    containerNumbers: string[]
  ): Promise<Map<string, ReplenishmentOrder | null>> {
    const result = new Map<string, ReplenishmentOrder | null>();

    try {
      // 获取所有货柜的订单号
      const firstOrderNumbers = await Promise.all(
        containerNumbers.map(async (cn) => {
          const orderNumber = await this.getFirstOrderNumberForContainer(cn);
          return { containerNumber: cn, orderNumber };
        })
      );

      const orderNumbers = firstOrderNumbers
        .map((item) => item.orderNumber)
        .filter((orderNumber): orderNumber is string => orderNumber !== null);

      if (orderNumbers.length === 0) {
        containerNumbers.forEach((cn) => result.set(cn, null));
        return result;
      }

      // 批量查询订单
      const orders = await this.orderRepository
        .createQueryBuilder('ro')
        .where('ro.orderNumber IN (:...orderNumbers)', { orderNumbers })
        .getMany();

      const ordersByNumber = new Map(orders.map((o) => [o.orderNumber, o]));

      // 构建结果Map
      firstOrderNumbers.forEach((item) => {
        result.set(item.containerNumber, ordersByNumber.get(item.orderNumber ?? '') ?? null);
      });
    } catch (error) {
      logger.warn('[batchFetchOrders] Failed:', error);
      containerNumbers.forEach((cn) => result.set(cn, null));
    }

    return result;
  }

  /**
   * 批量查询最新状态事件
   */
  private async batchFetchStatusEvents(
    containerNumbers: string[]
  ): Promise<Map<string, ContainerStatusEvent | null>> {
    const result = new Map<string, ContainerStatusEvent | null>();

    try {
      // 使用子查询批量查询每个container的最新事件
      const events = await this.statusEventRepository
        .createQueryBuilder('event')
        .where(
          `(event.container_number, event.occurred_at) IN (
          SELECT container_number, MAX(occurred_at)
          FROM ext_container_status_events
          WHERE container_number IN (:...containerNumbers)
          GROUP BY container_number
        )`,
          { containerNumbers }
        )
        .getRawMany();

      events.forEach((event: any) => {
        result.set(event.event_container_number, {
          containerNumber: event.event_container_number,
          eventType: event.event_event_type,
          locationCode: event.event_location_code,
          locationNameCn: event.event_location_name_cn,
          locationNameEn: event.event_location_name_en,
          occurredAt: event.event_occurred_at
        } as unknown as ContainerStatusEvent);
      });
    } catch (error) {
      logger.warn('[batchFetchStatusEvents] Failed:', error);
      containerNumbers.forEach((cn) => result.set(cn, null));
    }

    return result;
  }

  /**
   * 批量查询港口操作记录
   */
  private async batchFetchPortOperations(
    containerNumbers: string[]
  ): Promise<Map<string, PortOperation[]>> {
    const result = new Map<string, PortOperation[]>();

    try {
      const portOperations = await this.portOperationRepository
        .createQueryBuilder('po')
        .where('po.containerNumber IN (:...containerNumbers)', { containerNumbers })
        .orderBy('po.updatedAt', 'DESC')
        .getMany();

      // 按containerNumber分组
      portOperations.forEach((po) => {
        const operations = result.get(po.containerNumber) || [];
        operations.push(po);
        result.set(po.containerNumber, operations);
      });

      // 确保所有container都有记录
      containerNumbers.forEach((cn) => {
        if (!result.has(cn)) {
          result.set(cn, []);
        }
      });
    } catch (error) {
      logger.warn('[batchFetchPortOperations] Failed:', error);
      containerNumbers.forEach((cn) => result.set(cn, []));
    }

    return result;
  }

  /**
   * 批量查询拖卡运输记录
   */
  private async batchFetchTruckingTransports(
    containerNumbers: string[]
  ): Promise<Map<string, TruckingTransport | null>> {
    const result = new Map<string, TruckingTransport | null>();

    try {
      const truckingTransports = await this.truckingTransportRepository
        .createQueryBuilder('tt')
        .where('tt.containerNumber IN (:...containerNumbers)', { containerNumbers })
        .getMany();

      const transportMap = new Map(truckingTransports.map((tt) => [tt.containerNumber, tt]));

      containerNumbers.forEach((cn) => {
        result.set(cn, transportMap.get(cn) ?? null);
      });
    } catch (error) {
      logger.warn('[batchFetchTruckingTransports] Failed:', error);
      containerNumbers.forEach((cn) => result.set(cn, null));
    }

    return result;
  }

  /**
   * 批量查询仓库操作记录
   */
  private async batchFetchWarehouseOperations(
    containerNumbers: string[]
  ): Promise<Map<string, WarehouseOperation | null>> {
    const result = new Map<string, WarehouseOperation | null>();

    try {
      const warehouseOperations = await this.warehouseOperationRepository
        .createQueryBuilder('wo')
        .where('wo.containerNumber IN (:...containerNumbers)', { containerNumbers })
        .getMany();

      const operationMap = new Map(warehouseOperations.map((wo) => [wo.containerNumber, wo]));

      containerNumbers.forEach((cn) => {
        result.set(cn, operationMap.get(cn) ?? null);
      });
    } catch (error) {
      logger.warn('[batchFetchWarehouseOperations] Failed:', error);
      containerNumbers.forEach((cn) => result.set(cn, null));
    }

    return result;
  }

  /**
   * 批量查询还空箱记录
   */
  private async batchFetchEmptyReturns(
    containerNumbers: string[]
  ): Promise<Map<string, EmptyReturn | null>> {
    const result = new Map<string, EmptyReturn | null>();

    try {
      const emptyReturns = await this.emptyReturnRepository
        .createQueryBuilder('er')
        .where('er.containerNumber IN (:...containerNumbers)', { containerNumbers })
        .getMany();

      const returnMap = new Map(emptyReturns.map((er) => [er.containerNumber, er]));

      containerNumbers.forEach((cn) => {
        result.set(cn, returnMap.get(cn) ?? null);
      });
    } catch (error) {
      logger.warn('[batchFetchEmptyReturns] Failed:', error);
      containerNumbers.forEach((cn) => result.set(cn, null));
    }

    return result;
  }

  /**
   * 批量查询清关公司字典
   */
  private async batchFetchCustomsBrokers(): Promise<Map<string, CustomsBroker>> {
    try {
      const brokers = await this.customsBrokerRepository
        .createQueryBuilder('cb')
        .where('cb.status = :status', { status: 'ACTIVE' })
        .getMany();
      return new Map(brokers.map((b) => [b.brokerCode, b]));
    } catch (error) {
      logger.warn('[batchFetchCustomsBrokers] Failed:', error);
      return new Map();
    }
  }

  /**
   * 批量查询车队公司字典
   */
  private async batchFetchTruckingCompanies(): Promise<Map<string, TruckingCompany>> {
    try {
      const companies = await this.truckingCompanyRepository
        .createQueryBuilder('tc')
        .where('tc.status = :status', { status: 'ACTIVE' })
        .getMany();
      return new Map(companies.map((tc) => [tc.companyCode, tc]));
    } catch (error) {
      logger.warn('[batchFetchTruckingCompanies] Failed:', error);
      return new Map();
    }
  }

  /**
   * 批量查询仓库字典
   */
  private async batchFetchWarehouses(): Promise<Map<string, Warehouse>> {
    try {
      const warehouses = await this.warehouseRepository
        .createQueryBuilder('w')
        .where('w.status = :status', { status: 'ACTIVE' })
        .getMany();
      return new Map(warehouses.map((w) => [w.warehouseCode, w]));
    } catch (error) {
      logger.warn('[batchFetchWarehouses] Failed:', error);
      return new Map();
    }
  }

  /**
   * 批量查询国家字典
   */
  private async batchFetchCountries(): Promise<Map<string, Country>> {
    try {
      const countries = await this.countryRepository
        .createQueryBuilder('c')
        .where('c.is_active = :isActive', { isActive: true })
        .getMany();
      return new Map(countries.map((c) => [c.code, c]));
    } catch (error) {
      logger.warn('[batchFetchCountries] Failed:', error);
      return new Map();
    }
  }

  private async batchFetchPortNames(containerNumbers: string[]): Promise<Map<string, string>> {
    try {
      if (containerNumbers.length === 0) return new Map();
      const containers = await this.containerRepository.find({
        where: { containerNumber: In(containerNumbers) },
        relations: ['seaFreight']
      });
      const portCodes = Array.from(
        new Set(
          containers
            .map((c) => c.seaFreight?.portOfDischarge)
            .filter((code): code is string => !!code && String(code).trim().length > 0)
        )
      );
      if (portCodes.length === 0) return new Map();
      const ports = await this.portRepository.find({
        where: { portCode: In(portCodes) }
      });
      return new Map(ports.map((p) => [p.portCode, p.portName]));
    } catch (error) {
      logger.warn('[batchFetchPortNames] Failed:', error);
      return new Map();
    }
  }

  /**
   * 批量查询候选车队（根据目的港和国家）
   * 用于甘特图显示可用的车队选项
   */
  private async batchFetchCandidateTruckingByPort(
    portCodes: string[],
    countries: string[]
  ): Promise<Map<string, Array<{ truckingCompanyId: string; truckingCompanyName: string; isDefault: boolean }>>> {
    try {
      if (portCodes.length === 0 || countries.length === 0) return new Map();
      const mappings = await this.truckingPortMappingRepository.find({
        where: {
          portCode: In(portCodes),
          country: In(countries),
          isActive: true
        }
      });
      const result = new Map<string, Array<{ truckingCompanyId: string; truckingCompanyName: string; isDefault: boolean }>>();
      mappings.forEach((m) => {
        const key = `${m.portCode}:${m.country}`;
        if (!result.has(key)) {
          result.set(key, []);
        }
        result.get(key)!.push({
          truckingCompanyId: m.truckingCompanyId,
          truckingCompanyName: m.truckingCompanyName || m.truckingCompanyId,
          isDefault: m.isDefault
        });
      });
      // 每个组合内按 isDefault 排序
      result.forEach((items, key) => {
        result.set(key, items.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0)));
      });
      return result;
    } catch (error) {
      logger.warn('[batchFetchCandidateTruckingByPort] Failed:', error);
      return new Map();
    }
  }

  /**
   * 批量查询候选仓库（根据车队列表和国家）
   * 用于甘特图显示可用的仓库选项
   */
  private async batchFetchCandidateWarehousesByTrucking(
    truckingCompanyIds: string[],
    countries: string[]
  ): Promise<Map<string, Array<{ warehouseCode: string; warehouseName: string; truckingCompanyId: string; isDefault: boolean }>>> {
    try {
      if (truckingCompanyIds.length === 0 || countries.length === 0) return new Map();
      const mappings = await this.warehouseTruckingMappingRepository.find({
        where: {
          truckingCompanyId: In(truckingCompanyIds),
          country: In(countries),
          isActive: true
        }
      });
      const result = new Map<string, Array<{ warehouseCode: string; warehouseName: string; truckingCompanyId: string; isDefault: boolean }>>();
      mappings.forEach((m) => {
        const key = `${m.truckingCompanyId}:${m.country}`;
        if (!result.has(key)) {
          result.set(key, []);
        }
        result.get(key)!.push({
          warehouseCode: m.warehouseCode,
          warehouseName: m.warehouseName || m.warehouseCode,
          truckingCompanyId: m.truckingCompanyId,
          isDefault: m.isDefault
        });
      });
      // 每个组合内按 isDefault 排序
      result.forEach((items, key) => {
        result.set(key, items.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0)));
      });
      return result;
    } catch (error) {
      logger.warn('[batchFetchCandidateWarehousesByTrucking] Failed:', error);
      return new Map();
    }
  }

  /**
   * 批量查询预警信息
   */
  private async batchFetchAlerts(
    containerNumbers: string[]
  ): Promise<Map<string, ContainerAlert[]>> {
    const result = new Map<string, ContainerAlert[]>();

    try {
      const alerts = await this.alertRepository
        .createQueryBuilder('alert')
        .where('alert.containerNumber IN (:...containerNumbers)', { containerNumbers })
        .getMany();

      // 按containerNumber分组
      alerts.forEach((alert) => {
        const containerNumber = alert.containerNumber;
        const containerAlerts = result.get(containerNumber) || [];
        containerAlerts.push(alert);
        result.set(containerNumber, containerAlerts);
      });

      // 确保所有container都有记录
      containerNumbers.forEach((cn) => {
        if (!result.has(cn)) {
          result.set(cn, []);
        }
      });

      /**
       * 列表只读 ext_container_alerts；若未跑 checkAllAlerts 则甩柜预警为空。
       * 对 ext_feituo_status_events 中 event_code=DUMP 补充展示用预警（不落库，id 为负；类型与库内一致为 rollover，避免与「其他」混淆）。
       */
      if (containerNumbers.length > 0) {
        const feituoRepo = AppDataSource.getRepository(ExtFeituoStatusEvent);
        const dumpRows = await feituoRepo
          .createQueryBuilder('e')
          .where('e.containerNumber IN (:...cns)', { cns: containerNumbers })
          .andWhere('UPPER(TRIM(e.eventCode)) = :code', { code: 'DUMP' })
          .orderBy('e.eventTime', 'DESC')
          .getMany();
        const latestDumpByCn = new Map<string, ExtFeituoStatusEvent>();
        for (const ev of dumpRows) {
          if (!latestDumpByCn.has(ev.containerNumber)) {
            latestDumpByCn.set(ev.containerNumber, ev);
          }
        }
        for (const cn of containerNumbers) {
          const list = result.get(cn) || [];
          const hasRolloverInDb = list.some((a) => a.type === AlertType.ROLLOVER);
          if (hasRolloverInDb) continue;
          const hasUnresolvedDumpInDb = list.some(
            (a) =>
              !a.resolved &&
              (a.message.includes('甩柜') || a.message.toLowerCase().includes('dump'))
          );
          if (hasUnresolvedDumpInDb) continue;
          const ev = latestDumpByCn.get(cn);
          if (!ev) continue;
          const desc = ev.descriptionCn || ev.descriptionEn || ev.eventDescriptionOrigin || '甩柜';
          const synthetic = {
            id: -ev.id,
            containerNumber: cn,
            type: AlertType.ROLLOVER,
            level: AlertLevel.CRITICAL,
            message: `甩柜事件: ${desc}`,
            resolved: false,
            createdAt: ev.eventTime,
            updatedAt: ev.eventTime
          } as ContainerAlert;
          list.push(synthetic);
          result.set(cn, list);
        }
      }
    } catch (error) {
      logger.warn('[batchFetchAlerts] Failed:', error);
      containerNumbers.forEach((cn) => result.set(cn, []));
    }

    return result;
  }

  // ==================== 格式化辅助方法 ====================

  private calculateCurrentLocation(
    latestEvent: ContainerStatusEvent | null,
    logisticsStatus: string | null,
    latestPortOperation: PortOperation | null,
    currentPortType: 'transit' | 'destination' | 'origin' | null
  ): string {
    if (latestEvent) {
      return (
        latestEvent.locationNameCn || latestEvent.locationNameEn || latestEvent.locationCode || '-'
      );
    }

    if (!logisticsStatus) return '-';

    const statusLocationMap: Record<string, string> = {
      not_shipped: '未出运',
      shipped: '已装船',
      in_transit: '在途',
      at_port:
        currentPortType === 'transit'
          ? `${latestPortOperation?.portName || '中转港'} (中转)`
          : `${latestPortOperation?.portName || '目的港'} (目的)`,
      picked_up: '提柜中',
      unloaded: '仓库',
      returned_empty: '已还箱'
    };

    // 如果状态不是 at_port 但有最新的港口操作记录且有到港时间
    if (logisticsStatus !== 'at_port' && latestPortOperation) {
      if (currentPortType === 'transit' && latestPortOperation.transitArrivalDate) {
        return `${latestPortOperation.portName || '中转港'} (中转)`;
      } else if (currentPortType === 'destination' && latestPortOperation.ata) {
        return `${latestPortOperation.portName || '目的港'} (目的)`;
      }
    }

    return statusLocationMap[logisticsStatus] || logisticsStatus;
  }

  private formatLatestStatus(event: ContainerStatusEvent | null): any {
    if (!event) return null;
    return {
      statusCode: event.statusCode,
      statusName: event.locationNameCn || event.locationNameEn || event.locationCode,
      occurredAt: event.occurredAt,
      location: event.locationNameCn || event.locationNameEn || event.locationCode
    };
  }

  private formatPortOperation(operation: PortOperation | null): any {
    if (!operation) return null;
    return {
      portType: operation.portType,
      portName: operation.portName,
      portCode: operation.portCode,
      portSequence: operation.portSequence,
      // 目的港 ETA/ATA
      etaDestPort: operation.eta,
      ataDestPort: operation.ata,
      revisedEtaDestPort: operation.revisedEta,
      etaCorrection: operation.etaCorrection,
      // 中转港 ETA/ATA/ETD/ATD
      etaTransit: operation.portType === 'transit' ? operation.eta : null,
      ataTransit: operation.portType === 'transit' ? operation.ata : null,
      etdTransit: operation.etd,
      atdTransit: operation.atd,
      // 卸船时间
      dischargedTime: operation.dischargedTime,
      destPortUnloadDate: operation.destPortUnloadDate,
      // 清关状态
      customsStatus: operation.customsStatus,
      isfStatus: operation.isfStatus,
      // 最后免费日
      lastFreeDate: operation.lastFreeDate,
      lastReturnDate: null,
      // 物流状态时间
      gateInTime: operation.gateInTime,
      gateOutTime: operation.gateOutTime,
      availableTime: operation.availableTime,
      transitArrivalDate: operation.transitArrivalDate
    };
  }
}

/** 与 ContainerController 构造参数一致，供排产预览等模块复用 */
export function createContainerService(): ContainerService {
  return new ContainerService(
    AppDataSource.getRepository(Container),
    AppDataSource.getRepository(ContainerStatusEvent),
    AppDataSource.getRepository(PortOperation),
    AppDataSource.getRepository(SeaFreight),
    AppDataSource.getRepository(TruckingTransport),
    AppDataSource.getRepository(WarehouseOperation),
    AppDataSource.getRepository(EmptyReturn),
    AppDataSource.getRepository(ReplenishmentOrder),
    AppDataSource.getRepository(ContainerAlert),
    AppDataSource.getRepository(CustomsBroker),
    AppDataSource.getRepository(TruckingCompany),
    AppDataSource.getRepository(Warehouse),
    AppDataSource.getRepository(Port),
    AppDataSource.getRepository(Country),
    AppDataSource.getRepository(ExtDemurrageRecord),
    AppDataSource.getRepository(TruckingPortMapping),
    AppDataSource.getRepository(WarehouseTruckingMapping)
  );
}

export const containerService = createContainerService();
