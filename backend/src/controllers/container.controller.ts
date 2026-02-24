/**
 * 货柜控制器
 * Container Controller
 */

import { Request, Response } from 'express';
import { AppDataSource } from '../database';
import { Container } from '../entities/Container';
import { ContainerStatusEvent } from '../entities/ContainerStatusEvent';
import { TruckingTransport } from '../entities/TruckingTransport';
import { WarehouseOperation } from '../entities/WarehouseOperation';
import { EmptyReturn } from '../entities/EmptyReturn';
import { Repository } from 'typeorm';
import { logger } from '../utils/logger';

export class ContainerController {
  private containerRepository: Repository<Container>;
  private statusEventRepository: Repository<ContainerStatusEvent>;
  private truckingTransportRepository: Repository<TruckingTransport>;
  private warehouseOperationRepository: Repository<WarehouseOperation>;
  private emptyReturnRepository: Repository<EmptyReturn>;

  constructor() {
    this.containerRepository = AppDataSource.getRepository(Container);
    this.statusEventRepository = AppDataSource.getRepository(ContainerStatusEvent);
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
        .leftJoinAndSelect('container.seaFreight', 'seaFreight');

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
          const destinationPortOperation = container.portOperations?.find(
            (po: any) => po.portType === 'destination'
          );

          // 获取目的港编码（从海运信息获取）
          const seaFreight = container.seaFreight?.[0] as any;

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
            ataDestPort: destinationPortOperation?.ataDestPort || null,
            customsStatus: destinationPortOperation?.customsStatus || null,
            destinationPort: seaFreight?.portOfDischarge || null,
            billOfLadingNumber: seaFreight?.billOfLadingNumber || null
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
      const statusEvents = await this.statusEventRepository
        .createQueryBuilder('event')
        .where('event.containerNumber = :id', { id })
        .orderBy('event.occurredAt', 'DESC')
        .limit(50)
        .getMany();

      // 获取拖卡运输记录
      const truckingTransports = await this.truckingTransportRepository
        .createQueryBuilder('tt')
        .where('tt.containerNumber = :id', { id })
        .orderBy('tt.lastPickupDate', 'DESC')
        .getMany();

      // 获取仓库操作记录
      const warehouseOperations = await this.warehouseOperationRepository
        .createQueryBuilder('wo')
        .where('wo.containerNumber = :id', { id })
        .orderBy('wo.warehouseArrivalDate', 'DESC')
        .getMany();

      // 获取还空箱记录
      const emptyReturns = await this.emptyReturnRepository
        .createQueryBuilder('er')
        .where('er.containerNumber = :id', { id })
        .orderBy('er.lastReturnDate', 'DESC')
        .getMany();

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
