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
import { Repository } from 'typeorm';
import { logger } from '../utils/logger';

export class ContainerController {
  private containerRepository: Repository<Container>;
  private statusEventRepository: Repository<ContainerStatusEvent>;
  private portOperationRepository: Repository<PortOperation>;
  private seaFreightRepository: Repository<SeaFreight>;
  private truckingTransportRepository: Repository<TruckingTransport>;
  private warehouseOperationRepository: Repository<WarehouseOperation>;
  private emptyReturnRepository: Repository<EmptyReturn>;

  constructor() {
    this.containerRepository = AppDataSource.getRepository(Container);
    this.statusEventRepository = AppDataSource.getRepository(ContainerStatusEvent);
    this.portOperationRepository = AppDataSource.getRepository(PortOperation);
    this.seaFreightRepository = AppDataSource.getRepository(SeaFreight);
    this.truckingTransportRepository = AppDataSource.getRepository(TruckingTransport);
    this.warehouseOperationRepository = AppDataSource.getRepository(WarehouseOperation);
    this.emptyReturnRepository = AppDataSource.getRepository(EmptyReturn);
  }

  /**
   * 获取货柜列表
   * Get containers list
   */
  getContainers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page = 1, pageSize = 10, search = '' } = req.query;

      // 构建查询
      const queryBuilder = this.containerRepository
        .createQueryBuilder('container')
        .leftJoinAndSelect('container.order', 'order')
        .leftJoinAndSelect('container.type', 'type')
        .leftJoinAndSelect('container.seaFreight', 'seaFreight')
        .leftJoinAndSelect('container.portOperations', 'portOperations');

      // 搜索条件
      if (search) {
        queryBuilder.andWhere(
          '(container.containerNumber ILIKE :search OR container.orderNumber ILIKE :search OR seaFreight.billOfLadingNumber ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      // 计算总数
      const [items, total] = await queryBuilder
        .orderBy('container.updatedAt', 'DESC')
        .skip((Number(page) - 1) * Number(pageSize))
        .take(Number(pageSize))
        .getManyAndCount();

      // 获取最新状态和扩展信息
      const containersWithStatus = await Promise.all(
        items.map(async (container) => {
          const latestEvent = await this.statusEventRepository
            .createQueryBuilder('event')
            .where('event.containerNumber = :containerNumber', { containerNumber: container.containerNumber })
            .orderBy('event.occurredAt', 'DESC')
            .getOne();

          // 获取港口操作信息（目的港）
          const destinationPortOperation = await this.portOperationRepository
            .createQueryBuilder('po')
            .where('po.containerNumber = :containerNumber', { containerNumber: container.containerNumber })
            .andWhere('po.portType = :portType', { portType: 'destination' })
            .getOne();

          logger.info(`[Container] ${container.containerNumber} destinationPortOperation:`, JSON.stringify(destinationPortOperation));

          // 获取海运信息（取第一条记录）
          let seaFreight = container.seaFreight && container.seaFreight.length > 0
            ? container.seaFreight[0] as any
            : null;

          // 如果seaFreight没有数据，尝试从数据库直接查询
          if (!seaFreight) {
            const seaFreightData = await this.seaFreightRepository
              .createQueryBuilder('sf')
              .where('sf.containerNumber = :containerNumber', { containerNumber: container.containerNumber })
              .getOne();
            if (seaFreightData) {
              seaFreight = seaFreightData as any;
            }
          }

          // 计算当前位置
          let currentLocation = '-'
          if (latestEvent) {
            currentLocation = latestEvent.locationNameCn || latestEvent.locationNameEn || latestEvent.locationCode || '-'
          } else if (container.logisticsStatus) {
            // 根据 logistics_status 计算位置
            const statusLocationMap: Record<string, string> = {
              'not_shipped': '未出运',
              'shipped': '已装船',
              'in_transit': '在途',
              'at_port': destinationPortOperation?.portName || '目的港',
              'picked_up': '提柜中',
              'unloaded': '仓库',
              'returned_empty': '已还箱'
            }
            currentLocation = statusLocationMap[container.logisticsStatus] || container.logisticsStatus
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
            // 扩展字段
            etaDestPort: destinationPortOperation?.etaDestPort || null,
            etaCorrection: destinationPortOperation?.etaCorrection || null,
            ataDestPort: destinationPortOperation?.ataDestPort || null,
            customsStatus: destinationPortOperation?.customsStatus || null,
            destinationPort: seaFreight?.portOfDischarge || null,
            billOfLadingNumber: seaFreight?.mblNumber || seaFreight?.billOfLadingNumber || null,
            // 备货单信息
            actualShipDate: container.order?.actualShipDate || seaFreight?.shipmentDate || null,
            sellToCountry: container.order?.sellToCountry || null,
            customerName: container.order?.customerName || null
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

      const container = await this.containerRepository
        .createQueryBuilder('container')
        .leftJoinAndSelect('container.order', 'order')
        .leftJoinAndSelect('container.type', 'type')
        .leftJoinAndSelect('container.seaFreight', 'seaFreight')
        .leftJoinAndSelect('container.portOperations', 'portOperations')
        .where('container.containerNumber = :id', { id })
        .getOne();

      if (!container) {
        res.status(404).json({
          success: false,
          message: '货柜不存在'
        });
        return;
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

      logger.info(`[Container] ${id} portOperations count: ${container.portOperations?.length || 0}`);

      // 处理港口操作数据，将customsBrokerCode同步到customsBroker字段
      if (container.portOperations && container.portOperations.length > 0) {
        container.portOperations = container.portOperations.map((po: any) => ({
          ...po,
          customsBroker: po.customsBrokerCode || null
        }));
      }

      res.json({
        success: true,
        data: {
          ...container,
          statusEvents,
          truckingTransports,
          warehouseOperations,
          emptyReturns
        }
      });
    } catch (error) {
      logger.error('Failed to get container details', error);
      res.status(500).json({
        success: false,
        message: '获取货柜详情失败'
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
