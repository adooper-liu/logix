/**
 * 货柜服务层
 * Container Service
 * 负责处理货柜相关的复杂业务逻辑
 */

import { Repository } from 'typeorm';
import { Container } from '../entities/Container';
import { ContainerStatusEvent } from '../entities/ContainerStatusEvent';
import { EmptyReturn } from '../entities/EmptyReturn';
import { PortOperation } from '../entities/PortOperation';
import { ReplenishmentOrder } from '../entities/ReplenishmentOrder';
import { SeaFreight } from '../entities/SeaFreight';
import { TruckingTransport } from '../entities/TruckingTransport';
import { WarehouseOperation } from '../entities/WarehouseOperation';
import { logger } from '../utils/logger';
import { calculateLogisticsStatus } from '../utils/logisticsStatusMachine';

interface ContainerWithStatus {
  container: Container;
  firstOrderNumber: string | null;
  orderInfo: ReplenishmentOrder | null;
  latestEvent: ContainerStatusEvent | null;
  latestPortOperation: PortOperation | null;
  currentPortType: 'transit' | 'destination' | null;
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
    private orderRepository: Repository<ReplenishmentOrder>
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
    const [ordersMap, eventsMap, portOperationsMap, truckingMap, warehouseMap, emptyReturnsMap] =
      await Promise.all([
        this.batchFetchOrders(containerNumbers),
        this.batchFetchStatusEvents(containerNumbers),
        this.batchFetchPortOperations(containerNumbers),
        this.batchFetchTruckingTransports(containerNumbers),
        this.batchFetchWarehouseOperations(containerNumbers),
        this.batchFetchEmptyReturns(containerNumbers)
      ]);

    const enrichedContainers = containers.map((container) => {
      try {
        const containerNumber = container.containerNumber;

        // 从批量查询结果中获取数据
        const orderInfo = ordersMap.get(containerNumber);
        const latestEvent = eventsMap.get(containerNumber);
        const portOperations = portOperationsMap.get(containerNumber) || [];
        const truckingTransport = truckingMap.get(containerNumber);
        const warehouseOperation = warehouseMap.get(containerNumber);
        const emptyReturn = emptyReturnsMap.get(containerNumber);

        // 计算物流状态
        const logisticsResult = calculateLogisticsStatus(
          container,
          portOperations,
          truckingTransport,
          warehouseOperation,
          emptyReturn,
          latestEvent
        );

        const currentPortType = logisticsResult.currentPortType;
        const latestPortOperation = logisticsResult.latestPortOperation;

        // 计算当前位置
        const currentLocation = this.calculateCurrentLocation(
          latestEvent,
          container.logisticsStatus,
          latestPortOperation,
          currentPortType
        );

        return {
          ...container,
          orderNumber: orderInfo?.orderNumber ?? null,
          latestStatus: this.formatLatestStatus(latestEvent),
          location: currentLocation,
          lastUpdated: container.updatedAt,
          currentPortType,
          latestPortOperation: this.formatPortOperation(latestPortOperation),
          // 扩展字段（与列表表头绑定一致）
          etaDestPort: latestPortOperation?.etaDestPort || container.seaFreight?.eta || null,
          etaCorrection: latestPortOperation?.etaCorrection || null,
          ataDestPort:
            currentPortType === 'transit'
              ? latestPortOperation?.transitArrivalDate || null
              : latestPortOperation?.ataDestPort || null,
          customsStatus: latestPortOperation?.customsStatus || null,
          destinationPort: container.seaFreight?.portOfDischarge || null,
          billOfLadingNumber:
            container.seaFreight?.mblNumber || container.seaFreight?.billOfLadingNumber || null,
          mblNumber: container.seaFreight?.mblNumber || null,
          actualShipDate: orderInfo?.actualShipDate || container.seaFreight?.shipmentDate || null,
          sellToCountry: orderInfo?.sellToCountry || null,
          customerName: orderInfo?.customerName || null,
          // 计划提柜日 / 最晚提柜日 / 最晚还箱日 / 实际还箱日（列表表头用）
          plannedPickupDate: truckingTransport?.plannedPickupDate || null,
          lastFreeDate: latestPortOperation?.lastFreeDate || null,
          lastReturnDate: emptyReturn?.lastReturnDate || null,
          returnTime: emptyReturn?.returnTime || null,
          // 关联数据（用于前端过滤）
          portOperations, // ← 新增：完整的港口操作数组
          truckingTransports: truckingTransport ? [truckingTransport] : [],
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
    let seaFreightData = container.seaFreight ?? null;
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
      seaFreightData,
      truckingTransportData,
      warehouseOperationData,
      emptyReturnData
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
      if (po.etaDestPort) {
        events.push({
          id: `${po.id}-eta`,
          statusCode: 'ETA',
          occurredAt: po.etaDestPort,
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
      if (po.ataDestPort) {
        events.push({
          id: `${po.id}-ata`,
          statusCode: 'ATA',
          occurredAt: po.ataDestPort,
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
          locationNameCn: po.locationNameCn || po.terminal || po.portName,
          locationNameEn: po.locationNameEn || po.terminal || po.portName,
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
          locationNameCn: po.locationNameCn || po.terminal || po.portName,
          locationNameEn: po.locationNameEn || po.terminal || po.portName,
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
          locationNameCn: po.locationNameCn || po.terminal || po.portName,
          locationNameEn: po.locationNameEn || po.terminal || po.portName,
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
          locationNameCn: po.locationNameCn || po.terminal || po.portName,
          locationNameEn: po.locationNameEn || po.terminal || po.portName,
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
          terminalName: po.terminal || po.gateInTerminal
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
          id: `${tt.id}-pickup`,
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
          id: `${tt.id}-delivery`,
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
          id: `${wo.id}-unload`,
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
          id: `${wo.id}-arrival`,
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
          id: `${wo.id}-unbox`,
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
          id: `${er.id}-return`,
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
          FROM biz_container_status_events
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
        } as ContainerStatusEvent);
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

  // ==================== 格式化辅助方法 ====================

  private calculateCurrentLocation(
    latestEvent: ContainerStatusEvent | null,
    logisticsStatus: string | null,
    latestPortOperation: PortOperation | null,
    currentPortType: 'transit' | 'destination' | null
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
      } else if (currentPortType === 'destination' && latestPortOperation.ataDestPort) {
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
      portSequence: operation.portSequence
    };
  }
}
