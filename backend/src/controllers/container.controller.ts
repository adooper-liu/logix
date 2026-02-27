/**
 * 货柜控制器
 * Container Controller
 */

import { Request, Response } from 'express';
import { AppDataSource } from '../database';
import { Container } from '../entities/Container';
import { ContainerStatusEvent } from '../entities/ContainerStatusEvent';
import { PortOperation } from '../entities/PortOperation';
import { SeaFreight } from '../entities/SeaFreight';
import { TruckingTransport } from '../entities/TruckingTransport';
import { WarehouseOperation } from '../entities/WarehouseOperation';
import { EmptyReturn } from '../entities/EmptyReturn';
import { ReplenishmentOrder } from '../entities/ReplenishmentOrder';
import { Repository } from 'typeorm';
import { logger } from '../utils/logger';
import {
  SimplifiedStatus,
  calculateLogisticsStatus,
  getSimplifiedStatusText,
  DetailedStatus,
  mapExternalStatusToSimplified,
  DetailedToSimplifiedMap
} from '../utils/logisticsStatusMachine';

export class ContainerController {
  private containerRepository: Repository<Container>;
  private statusEventRepository: Repository<ContainerStatusEvent>;
  private portOperationRepository: Repository<PortOperation>;
  private seaFreightRepository: Repository<SeaFreight>;
  private truckingTransportRepository: Repository<TruckingTransport>;
  private warehouseOperationRepository: Repository<WarehouseOperation>;
  private emptyReturnRepository: Repository<EmptyReturn>;
  private orderRepository: Repository<ReplenishmentOrder>;

  constructor() {
    this.containerRepository = AppDataSource.getRepository(Container);
    this.statusEventRepository = AppDataSource.getRepository(ContainerStatusEvent);
    this.portOperationRepository = AppDataSource.getRepository(PortOperation);
    this.seaFreightRepository = AppDataSource.getRepository(SeaFreight);
    this.truckingTransportRepository = AppDataSource.getRepository(TruckingTransport);
    this.warehouseOperationRepository = AppDataSource.getRepository(WarehouseOperation);
    this.emptyReturnRepository = AppDataSource.getRepository(EmptyReturn);
    this.orderRepository = AppDataSource.getRepository(ReplenishmentOrder);
  }

  /**
   * 获取货柜列表
   * Get containers list
   */
  getContainers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page = 1, pageSize = 10, search = '' } = req.query;

      logger.info('[getContainers] Query params:', { page, pageSize, search });

      // 先获取货柜基础数据（不关联查询，避免外键问题）
      const queryBuilder = this.containerRepository
        .createQueryBuilder('container');

      // 搜索条件
      if (search) {
        queryBuilder.andWhere(
          'container.containerNumber ILIKE :search OR container.orderNumber ILIKE :search',
          { search: `%${search}%` }
        );
      }

      // 计算总数
      const [items, total] = await queryBuilder
        .orderBy('container.updatedAt', 'DESC')
        .skip((Number(page) - 1) * Number(pageSize))
        .take(Number(pageSize))
        .getManyAndCount();

      logger.info(`[getContainers] Found ${items.length} containers, total: ${total}`);

      // 获取最新状态和扩展信息
      const containersWithStatus = await Promise.all(
        items.map(async (container) => {
          // 获取备货单信息（手动查询，避免关联问题）
          let orderInfo = null;
          try {
            if (container.orderNumber) {
              orderInfo = await this.orderRepository
                .createQueryBuilder('replenishment_order')
                .where('replenishment_order.orderNumber = :orderNumber', { orderNumber: container.orderNumber })
                .getOne();
            }
          } catch (error) {
            logger.warn(`[Container] ${container.containerNumber} Failed to fetch order info:`, error);
          }

          // 获取最新状态事件
          let latestEvent = null;
          try {
            latestEvent = await this.statusEventRepository
              .createQueryBuilder('event')
              .where('event.containerNumber = :containerNumber', { containerNumber: container.containerNumber })
              .orderBy('event.occurredAt', 'DESC')
              .getOne();
          } catch (error) {
            logger.warn(`[Container] ${container.containerNumber} Failed to fetch status events:`, error);
          }

          // 获取最新的港口操作信息（中转港或目的港）
          let latestPortOperation = null;
          let currentPortType = null;
          let needsStatusUpdate = false;

          try {
            // 查询所有港口操作记录，按更新时间倒序排列
            const portOperations = await this.portOperationRepository
              .createQueryBuilder('po')
              .where('po.containerNumber = :containerNumber', { containerNumber: container.containerNumber })
              .orderBy('po.updatedAt', 'DESC')
              .getMany();

            // 查询其他关联数据
            let seaFreight = null;
            let truckingTransport = null;
            let warehouseOperation = null;
            let emptyReturn = null;

            try {
              seaFreight = await this.seaFreightRepository
                .createQueryBuilder('sf')
                .where('sf.containerNumber = :containerNumber', { containerNumber: container.containerNumber })
                .getOne();
            } catch (error) {
              logger.warn(`[Container] ${container.containerNumber} Failed to fetch sea freight:`, error);
            }

            try {
              truckingTransport = await this.truckingTransportRepository
                .createQueryBuilder('tt')
                .where('tt.containerNumber = :containerNumber', { containerNumber: container.containerNumber })
                .getOne();
            } catch (error) {
              logger.warn(`[Container] ${container.containerNumber} Failed to fetch trucking:`, error);
            }

            try {
              warehouseOperation = await this.warehouseOperationRepository
                .createQueryBuilder('wo')
                .where('wo.containerNumber = :containerNumber', { containerNumber: container.containerNumber })
                .getOne();
            } catch (error) {
              logger.warn(`[Container] ${container.containerNumber} Failed to fetch warehouse:`, error);
            }

            try {
              emptyReturn = await this.emptyReturnRepository
                .createQueryBuilder('er')
                .where('er.containerNumber = :containerNumber', { containerNumber: container.containerNumber })
                .getOne();
            } catch (error) {
              logger.warn(`[Container] ${container.containerNumber} Failed to fetch empty return:`, error);
            }

            // 使用统一状态机计算正确的物流状态
            const result = calculateLogisticsStatus(
              container,
              portOperations,
              seaFreight,
              truckingTransport,
              warehouseOperation,
              emptyReturn
            );

            // 如果计算出的状态与当前状态不同，需要更新
            if (result.status !== container.logisticsStatus) {
              needsStatusUpdate = true;
              container.logisticsStatus = result.status;
              latestPortOperation = result.latestPortOperation;
              currentPortType = result.currentPortType;
              logger.info(
                `[Container] ${container.containerNumber} ` +
                `Status update: ${container.logisticsStatus} → ${result.status} ` +
                `(portType: ${currentPortType})`
              );
            } else {
              latestPortOperation = result.latestPortOperation;
              currentPortType = result.currentPortType;
            }
          } catch (error) {
            logger.warn(`[Container] ${container.containerNumber} Failed to calculate status:`, error);
          }

          // 自动更新 logistics_status
          if (needsStatusUpdate) {
            await this.containerRepository.save(container);
            logger.info(`[Container] ${container.containerNumber} Auto-upplied logistics_status = ${container.logisticsStatus}`);
          }

          // 获取海运信息
          let seaFreight = null;
          try {
            seaFreight = await this.seaFreightRepository
              .createQueryBuilder('sf')
              .where('sf.containerNumber = :containerNumber', { containerNumber: container.containerNumber })
              .getOne();
          } catch (error) {
            logger.warn(`[Container] ${container.containerNumber} Failed to fetch sea freight:`, error);
          }

          // 计算当前位置
          let currentLocation = '-'
          if (latestEvent) {
            currentLocation = latestEvent.locationNameCn || latestEvent.locationNameEn || latestEvent.locationCode || '-'
          } else if (container.logisticsStatus) {
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
            }

            // 如果状态不是 at_port 但有最新的港口操作记录且有到港时间，显示当前位置
            if (container.logisticsStatus !== 'at_port' && latestPortOperation) {
              if (currentPortType === 'transit' && latestPortOperation.transitArrivalDate) {
                currentLocation = `${latestPortOperation.portName || '中转港'} (中转)`
              } else if (currentPortType === 'destination' && latestPortOperation.ataDestPort) {
                currentLocation = `${latestPortOperation.portName || '目的港'} (目的)`
              }
            } else {
              currentLocation = statusLocationMap[container.logisticsStatus] || container.logisticsStatus
            }
          }

          return {
            ...container,
            latestStatus: latestEvent ? {
              statusCode: latestEvent.statusCode,
              statusName: latestEvent.locationNameCn || latestEvent.locationNameEn || latestEvent.locationCode,
              occurredAt: latestEvent.occurredAt,
              location: latestEvent.locationNameCn || latestEvent.locationNameEn || latestEvent.locationCode
            } : null,
            location: currentLocation,
            lastUpdated: container.updatedAt,
            // 港口操作信息
            currentPortType: currentPortType, // 当前港口类型: transit(中转港) 或 destination(目的港)
            latestPortOperation: latestPortOperation ? {
              portType: latestPortOperation.portType,
              portName: latestPortOperation.portName,
              portCode: latestPortOperation.portCode,
              portSequence: latestPortOperation.portSequence
            } : null,
            // 扩展字段 - 根据当前港口类型选择正确的日期字段
            etaDestPort: latestPortOperation?.etaDestPort || null,
            etaCorrection: latestPortOperation?.etaCorrection || null,
            // 中转港使用 transit_arrival_date，目的港使用 ata_dest_port
            ataDestPort: currentPortType === 'transit'
              ? (latestPortOperation?.transitArrivalDate || null)
              : (latestPortOperation?.ataDestPort || null),
            customsStatus: latestPortOperation?.customsStatus || null,
            destinationPort: seaFreight?.portOfDischarge || null,
            billOfLadingNumber: seaFreight?.mblNumber || seaFreight?.billOfLadingNumber || null,
            // 备货单信息
            actualShipDate: orderInfo?.actualShipDate || seaFreight?.shipmentDate || null,
            sellToCountry: orderInfo?.sellToCountry || null,
            customerName: orderInfo?.customerName || null
          };
        })
      );

      res.json({
        success: true,
        items: containersWithStatus,
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          total,
          totalPages: Math.ceil(total / Number(pageSize))
        }
      });

      logger.info(`Retrieved ${items.length} containers`);
    } catch (error) {
      logger.error('Failed to get containers', error);
      res.status(500).json({
        success: false,
        message: '获取货柜列表失败'
      });
    }
  };

  /**
   * 获取货柜详情
   * Get container details
   */
  getContainerById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // 查询主货柜信息（关联备货单）
      const container = await this.containerRepository
        .createQueryBuilder('container')
        .leftJoinAndSelect('container.type', 'type')
        .leftJoinAndSelect('container.portOperations', 'portOperations')
        .leftJoinAndSelect('container.orders', 'orders')
        .leftJoinAndSelect('container.order', 'order')
        .where('container.containerNumber = :id', { id })
        .getOne();

      if (!container) {
        res.status(404).json({
          success: false,
          message: '货柜不存在'
        });
        return;
      }

      // 获取所有关联的备货单（通过 container.orders 和 container.order）
      const allOrders = [...(container.orders || []), ...(container.order ? [container.order] : null).filter(Boolean)];

      // 去重（如果 order 也是 orders 中的一个）
      const uniqueOrders = allOrders.filter((order, index, self) =>
        index === self.findIndex(o => o.orderNumber === order.orderNumber)
      );

      container['allOrders'] = uniqueOrders;

      // 计算汇总数据（如果多个备货单，需要合计）
      const summary = {
        totalGrossWeight: 0,
        totalCbm: 0,
        totalBoxes: 0,
        shipmentTotalValue: 0,
        fobAmount: 0,
        cifAmount: 0,
        negotiationAmount: 0,
        orderCount: uniqueOrders.length
      };

      uniqueOrders.forEach((order: ReplenishmentOrder) => {
        summary.totalGrossWeight += order.totalGrossWeight || 0;
        summary.totalCbm += order.totalCbm || 0;
        summary.totalBoxes += order.totalBoxes || 0;
        summary.shipmentTotalValue += order.shipmentTotalValue || 0;
        summary.fobAmount += order.fobAmount || 0;
        summary.cifAmount += order.cifAmount || 0;
        summary.negotiationAmount += order.negotiationAmount || 0;
      });

      container['summary'] = summary;

      // 如果有备货单，关联第一个到 order 字段（保持向后兼容）
      if (allOrders.length > 0) {
        container.order = allOrders[0];
        container.orderNumber = allOrders[0].orderNumber;
      }

      // 获取状态事件时间线
      // 从港口操作表中提取状态事件数据
      const portOperationsWithStatus = await this.portOperationRepository
        .createQueryBuilder('po')
        .where('po.containerNumber = :id', { id })
        .getMany();

      const statusEvents: any[] = [];

      portOperationsWithStatus.forEach(po => {
        // 从港口操作记录中提取状态事件
        const portStatusEvents: any[] = [];

        // 预计到港时间
        if (po.etaDestPort) {
          portStatusEvents.push({
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
          portStatusEvents.push({
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
          portStatusEvents.push({
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
          portStatusEvents.push({
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
          portStatusEvents.push({
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
          portStatusEvents.push({
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
          portStatusEvents.push({
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

        // 港口状态发生时间（从港口操作表中的状态节点获取）
        if (po.statusCode && po.statusOccurredAt) {
          portStatusEvents.push({
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

        statusEvents.push(...portStatusEvents);
      });

      // 获取拖卡运输记录的状态事件
      const truckingTransports = await this.truckingTransportRepository
        .createQueryBuilder('tt')
        .where('tt.containerNumber = :id', { id })
        .orderBy('tt.lastPickupDate', 'DESC')
        .getMany();

      truckingTransports.forEach(tt => {
        if (tt.pickupDate) {
          statusEvents.push({
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
          statusEvents.push({
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
      });

      // 获取仓库操作记录的状态事件
      const warehouseOperations = await this.warehouseOperationRepository
        .createQueryBuilder('wo')
        .where('wo.containerNumber = :id', { id })
        .orderBy('wo.warehouseArrivalDate', 'DESC')
        .getMany();

      warehouseOperations.forEach(wo => {
        if (wo.unloadDate) {
          statusEvents.push({
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
          statusEvents.push({
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
          statusEvents.push({
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
      });

      // 获取还空箱记录的状态事件
      const emptyReturns = await this.emptyReturnRepository
        .createQueryBuilder('er')
        .where('er.containerNumber = :id', { id })
        .orderBy('er.lastReturnDate', 'DESC')
        .getMany();

      emptyReturns.forEach(er => {
        if (er.returnTime) {
          statusEvents.push({
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
      });

      // 按时间排序（最新的在前）
      statusEvents.sort((a, b) => {
        const timeA = new Date(a.occurredAt).getTime();
        const timeB = new Date(b.occurredAt).getTime();
        return timeB - timeA;
      });

      // 获取海运信息（第一条记录作为实际出运日期来源）
      const seaFreightData = await this.seaFreightRepository
        .createQueryBuilder('sf')
        .where('sf.containerNumber = :id', { id })
        .getOne();

      // 如果备货单没有实际出运日期，尝试从海运表中获取
      if (container.order && !container.order.actualShipDate && seaFreightData?.shipmentDate) {
        container.order.actualShipDate = seaFreightData.shipmentDate;
      }

      // 将海运数据包装成数组，保持与前端一致
      const seaFreightArray = seaFreightData ? [seaFreightData] : [];

      logger.info(`[Container] ${id} portOperations count: ${container.portOperations?.length || 0}`);

      // 处理港口操作数据，将customsBrokerCode同步到customsBroker字段
      if (container.portOperations && container.portOperations.length > 0) {
        container.portOperations = container.portOperations.map((po: any) => ({
          ...po,
          customsBroker: po.customsBrokerCode || null
        }));
      }

      // 创建响应数据对象，避免循环引用
      const responseData = {
        containerNumber: container.containerNumber,
        orderNumber: container.orderNumber,
        containerTypeCode: container.containerTypeCode,
        cargoDescription: container.cargoDescription,
        grossWeight: container.grossWeight,
        netWeight: container.netWeight,
        cbm: container.cbm,
        packages: container.packages,
        sealNumber: container.sealNumber,
        inspectionRequired: container.inspectionRequired,
        isUnboxing: container.isUnboxing,
        logisticsStatus: container.logisticsStatus,
        remarks: container.remarks,
        requiresPallet: container.requiresPallet,
        requiresAssembly: container.requiresAssembly,
        containerSize: container.containerSize,
        isRolled: container.isRolled,
        operator: container.operator,
        containerHolder: container.containerHolder,
        tareWeight: container.tareWeight,
        totalWeight: container.totalWeight,
        overLength: container.overLength,
        overHeight: container.overHeight,
        dangerClass: container.dangerClass,
        currentStatusDescCn: container.currentStatusDescCn,
        currentStatusDescEn: container.currentStatusDescEn,
        createdAt: container.createdAt,
        updatedAt: container.updatedAt,
        type: container.type,
        portOperations: container.portOperations,
        order: container.order,
        allOrders: container['allOrders'],
        summary: container['summary'],
        statusEvents,
        seaFreight: seaFreightArray,
        truckingTransports,
        warehouseOperations,
        emptyReturns
      };

      res.json({
        success: true,
        data: responseData
      });
    } catch (error) {
      logger.error('Failed to get container details', error);
      logger.error('Error details:', {
        message: (error as any)?.message,
        stack: (error as any)?.stack,
        name: (error as any)?.name
      });
      res.status(500).json({
        success: false,
        message: '获取货柜详情失败',
        error: (error as any)?.message || 'Unknown error'
      });
    }
  };

  /**
   * 创建货柜
   * Create container
   */
  createContainer = async (req: Request, res: Response): Promise<void> => {
    try {
      const containerData = req.body;

      const container = this.containerRepository.create({
        ...containerData,
        logisticsStatus: 'not_shipped'
      });

      const savedContainer = await this.containerRepository.save(container);

      logger.info(`Container created: ${savedContainer.containerNumber}`);

      res.status(201).json({
        success: true,
        data: savedContainer,
        message: '货柜创建成功'
      });
    } catch (error) {
      logger.error('Failed to create container', error);
      res.status(500).json({
        success: false,
        message: '创建货柜失败'
      });
    }
  };

  /**
   * 更新货柜
   * Update container
   */
  updateContainer = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const container = await this.containerRepository.findOne({
        where: { containerNumber: id }
      });

      if (!container) {
        res.status(404).json({
          success: false,
          message: '货柜不存在'
        });
        return;
      }

      const updatedContainer = this.containerRepository.merge(container, updateData);
      await this.containerRepository.save(updatedContainer);

      logger.info(`Container updated: ${updatedContainer.containerNumber}`);

      res.json({
        success: true,
        data: updatedContainer,
        message: '货柜更新成功'
      });
    } catch (error) {
      logger.error('Failed to update container', error);
      res.status(500).json({
        success: false,
        message: '更新货柜失败'
      });
    }
  };

  /**
   * 删除货柜
   * Delete container
   */
  deleteContainer = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const container = await this.containerRepository.findOne({
        where: { containerNumber: id }
      });

      if (!container) {
        res.status(404).json({
          success: false,
          message: '货柜不存在'
        });
        return;
      }

      await this.containerRepository.remove(container);

      logger.info(`Container deleted: ${id}`);

      res.json({
        success: true,
        message: '货柜删除成功'
      });
    } catch (error) {
      logger.error('Failed to delete container', error);
      res.status(500).json({
        success: false,
        message: '删除货柜失败'
      });
    }
  };

  /**
   * 获取货柜统计数据
   * Get container statistics
   */
  getStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const total = await this.containerRepository.count();

      const statusStats = await this.containerRepository
        .createQueryBuilder('container')
        .select('container.logisticsStatus', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('container.logisticsStatus')
        .getRawMany();

      // 获取今日更新数
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayUpdated = await this.containerRepository.count({
        where: {
          updatedAt: { $gte: today } as any
        }
      });

      res.json({
        success: true,
        data: {
          total,
          todayUpdated,
          statusDistribution: statusStats
        }
      });
    } catch (error) {
      logger.error('Failed to get container statistics', error);
      res.status(500).json({
        success: false,
        message: '获取统计数据失败'
      });
    }
  };
}
