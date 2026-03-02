/**
 * 货柜服务层
 * Container Service
 * 负责处理货柜相关的复杂业务逻辑
 */

import { Repository } from 'typeorm';
import { Container } from '../entities/Container';
import { ContainerStatusEvent } from '../entities/ContainerStatusEvent';
import { PortOperation } from '../entities/PortOperation';
import { SeaFreight } from '../entities/SeaFreight';
import { TruckingTransport } from '../entities/TruckingTransport';
import { WarehouseOperation } from '../entities/WarehouseOperation';
import { EmptyReturn } from '../entities/EmptyReturn';
import { ReplenishmentOrder } from '../entities/ReplenishmentOrder';
import { logger } from '../utils/logger';
import { SimplifiedStatus, calculateLogisticsStatus } from '../utils/logisticsStatusMachine';

interface ContainerWithStatus {
  container: Container;
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
   * 为货柜列表添加扩展信息
   */
  async enrichContainersList(containers: Container[]): Promise<any[]> {
    const enrichedContainers = await Promise.all(
      containers.map(async (container) => {
        try {
          const enriched = await this.enrichSingleContainer(container);

          // 计算当前位置
          const currentLocation = this.calculateCurrentLocation(
            enriched.latestEvent,
            enriched.container.logisticsStatus,
            enriched.latestPortOperation,
            enriched.currentPortType
          );

          return {
            ...enriched.container,
            latestStatus: this.formatLatestStatus(enriched.latestEvent),
            location: currentLocation,
            lastUpdated: enriched.container.updatedAt,
            currentPortType: enriched.currentPortType,
            latestPortOperation: this.formatPortOperation(enriched.latestPortOperation),
            // 扩展字段
            etaDestPort: enriched.latestPortOperation?.etaDestPort || null,
            etaCorrection: enriched.latestPortOperation?.etaCorrection || null,
            ataDestPort: enriched.currentPortType === 'transit'
              ? (enriched.latestPortOperation?.transitArrivalDate || null)
              : (enriched.latestPortOperation?.ataDestPort || null),
            customsStatus: enriched.latestPortOperation?.customsStatus || null,
            destinationPort: enriched.seaFreight?.portOfDischarge || null,
            billOfLadingNumber: enriched.seaFreight?.mblNumber || enriched.seaFreight?.billOfLadingNumber || null,
            actualShipDate: enriched.orderInfo?.actualShipDate || enriched.seaFreight?.shipmentDate || null,
            sellToCountry: enriched.orderInfo?.sellToCountry || null,
            customerName: enriched.orderInfo?.customerName || null,
            // 关联数据（用于前端过滤）
            truckingTransports: enriched.truckingTransport ? [enriched.truckingTransport] : [],
            emptyReturns: enriched.emptyReturn ? [enriched.emptyReturn] : []
          };
        } catch (error) {
          logger.warn(`[ContainerService] Failed to enrich ${container.containerNumber}:`, error);
          return { ...container, latestStatus: null, location: '-' };
        }
      })
    );

    return enrichedContainers;
  }

  /**
   * 为单个货柜添加扩展信息
   */
  private async enrichSingleContainer(container: Container): Promise<ContainerWithStatus> {
    // 并行查询所有相关数据
    const [orderInfo, latestEvent, portOperations, seaFreight, truckingTransport, warehouseOperation, emptyReturn] =
      await Promise.allSettled([
        this.fetchOrderInfo(container.orderNumber),
        this.fetchLatestStatusEvent(container.containerNumber),
        this.fetchPortOperations(container.containerNumber),
        this.fetchSeaFreight(container.containerNumber),
        this.fetchTruckingTransport(container.containerNumber),
        this.fetchWarehouseOperation(container.containerNumber),
        this.fetchEmptyReturn(container.containerNumber)
      ]);

    // 处理查询结果
    const orderInfoData = orderInfo.status === 'fulfilled' ? orderInfo.value : null;
    const latestEventData = latestEvent.status === 'fulfilled' ? latestEvent.value : null;
    const portOperationsData = portOperations.status === 'fulfilled' ? portOperations.value : [];
    const seaFreightData = seaFreight.status === 'fulfilled' ? seaFreight.value : null;
    const truckingTransportData = truckingTransport.status === 'fulfilled' ? truckingTransport.value : null;
    const warehouseOperationData = warehouseOperation.status === 'fulfilled' ? warehouseOperation.value : null;
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

  private async fetchLatestStatusEvent(containerNumber: string): Promise<ContainerStatusEvent | null> {
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

  private async fetchSeaFreight(containerNumber: string): Promise<SeaFreight | null> {
    try {
      return await this.seaFreightRepository
        .createQueryBuilder('sf')
        .where('sf.containerNumber = :containerNumber', { containerNumber })
        .getOne();
    } catch (error) {
      logger.warn(`[fetchSeaFreight] Failed for ${containerNumber}:`, error);
      return null;
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

  private async fetchWarehouseOperation(containerNumber: string): Promise<WarehouseOperation | null> {
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

  // ==================== 格式化辅助方法 ====================

  private calculateCurrentLocation(
    latestEvent: ContainerStatusEvent | null,
    logisticsStatus: string | null,
    latestPortOperation: PortOperation | null,
    currentPortType: 'transit' | 'destination' | null
  ): string {
    if (latestEvent) {
      return latestEvent.locationNameCn || latestEvent.locationNameEn || latestEvent.locationCode || '-';
    }

    if (!logisticsStatus) return '-';

    const statusLocationMap: Record<string, string> = {
      'not_shipped': '未出运',
      'shipped': '已装船',
      'in_transit': '在途',
      'at_port': currentPortType === 'transit'
        ? `${latestPortOperation?.portName || '中转港'} (中转)`
        : `${latestPortOperation?.portName || '目的港'} (目的)`,
      'picked_up': '提柜中',
      'unloaded': '仓库',
      'returned_empty': '已还箱'
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
