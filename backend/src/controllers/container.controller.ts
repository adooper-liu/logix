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
import { ContainerService } from '../services/container.service';
import { ContainerStatisticsService } from '../services/containerStatistics.service';
import { ContainerStatusService } from '../services/containerStatus.service';

export class ContainerController {
  private containerRepository: Repository<Container>;
  private seaFreightRepository: Repository<SeaFreight>;
  private truckingTransportRepository: Repository<TruckingTransport>;
  private warehouseOperationRepository: Repository<WarehouseOperation>;
  private emptyReturnRepository: Repository<EmptyReturn>;
  private containerService: ContainerService;
  private statisticsService: ContainerStatisticsService;
  private containerStatusService: ContainerStatusService;

  constructor() {
    const containerRepository = AppDataSource.getRepository(Container);
    const statusEventRepository = AppDataSource.getRepository(ContainerStatusEvent);
    const portOperationRepository = AppDataSource.getRepository(PortOperation);
    const seaFreightRepository = AppDataSource.getRepository(SeaFreight);
    const truckingTransportRepository = AppDataSource.getRepository(TruckingTransport);
    const warehouseOperationRepository = AppDataSource.getRepository(WarehouseOperation);
    const emptyReturnRepository = AppDataSource.getRepository(EmptyReturn);
    const orderRepository = AppDataSource.getRepository(ReplenishmentOrder);

    this.containerRepository = containerRepository;
    this.seaFreightRepository = seaFreightRepository;
    this.truckingTransportRepository = truckingTransportRepository;
    this.warehouseOperationRepository = warehouseOperationRepository;
    this.emptyReturnRepository = emptyReturnRepository;
    this.containerService = new ContainerService(
      containerRepository,
      statusEventRepository,
      portOperationRepository,
      seaFreightRepository,
      truckingTransportRepository,
      warehouseOperationRepository,
      emptyReturnRepository,
      orderRepository
    );

    this.statisticsService = new ContainerStatisticsService(
      containerRepository,
      truckingTransportRepository,
      emptyReturnRepository
    );

    this.containerStatusService = new ContainerStatusService();
  }

  /**
   * 测试统计服务初始化
   */
  testStatisticsService = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('[Test] StatisticsService initialized:', !!this.statisticsService);
      console.log('[Test] StatusDistributionService initialized:', !!(this.statisticsService as any).statusDistribution);
      console.log('[Test] containerRepository initialized:', !!this.containerRepository);

      const testQuery = this.containerRepository
        .createQueryBuilder('container')
        .select('COUNT(*)', 'count')
        .getRawOne();

      const count = await testQuery;
      console.log('[Test] Container count:', count);

      // 测试 getStatusDistribution
      console.log('[Test] Testing getStatusDistribution...');
      const statusDist = await this.statisticsService.getStatusDistribution();
      console.log('[Test] Status distribution result:', statusDist);

      // 测试 getArrivalDistribution
      console.log('[Test] Testing getArrivalDistribution...');
      const arrivalDist = await this.statisticsService.getArrivalDistribution();
      console.log('[Test] Arrival distribution result:', arrivalDist);

      // 测试 getPickupDistribution
      console.log('[Test] Testing getPickupDistribution...');
      const pickupDist = await this.statisticsService.getPickupDistribution();
      console.log('[Test] Pickup distribution result:', pickupDist);

      // 测试 getLastPickupDistribution
      console.log('[Test] Testing getLastPickupDistribution...');
      const lastPickupDist = await this.statisticsService.getLastPickupDistribution();
      console.log('[Test] Last pickup distribution result:', lastPickupDist);

      // 测试 getReturnDistribution
      console.log('[Test] Testing getReturnDistribution...');
      const returnDist = await this.statisticsService.getReturnDistribution();
      console.log('[Test] Return distribution result:', returnDist);

      res.json({
        success: true,
        data: {
          statisticsService: !!this.statisticsService,
          containerCount: count?.count,
          statusDistribution: statusDist,
          arrivalDistribution: arrivalDist,
          pickupDistribution: pickupDist,
          lastPickupDistribution: lastPickupDist,
          returnDistribution: returnDist
        }
      });
    } catch (error: any) {
      console.error('[Test] Error:', error);
      res.status(500).json({
        success: false,
        error: error?.message,
        stack: error?.stack
      });
    }
  };

  /**
   * 获取货柜列表
   * Get containers list
   */
  getContainers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page = 1, pageSize = 10, search = '', startDate, endDate } = req.query;

      logger.info('[getContainers] Query params:', { page, pageSize, search, startDate, endDate });

      const queryBuilder = this.containerRepository
        .createQueryBuilder('container')
        .leftJoin('container.order', 'order')
        .leftJoin('container.seaFreight', 'sf');

      if (search) {
        queryBuilder.andWhere(
          'container.containerNumber ILIKE :search OR container.orderNumber ILIKE :search',
          { search: `%${search}%` }
        );
      }

      // 按出运时间（actualShipDate 或 shipmentDate）筛选
      if (startDate && endDate) {
        queryBuilder.andWhere(
          '(order.actualShipDate >= :startDate OR (order.actualShipDate IS NULL AND sf.shipmentDate >= :startDate))',
          { startDate }
        );
        queryBuilder.andWhere(
          '(order.actualShipDate <= :endDate OR (order.actualShipDate IS NULL AND sf.shipmentDate <= :endDate))',
          { endDate }
        );
      } else if (startDate) {
        queryBuilder.andWhere(
          '(order.actualShipDate >= :startDate OR (order.actualShipDate IS NULL AND sf.shipmentDate >= :startDate))',
          { startDate }
        );
      } else if (endDate) {
        queryBuilder.andWhere(
          '(order.actualShipDate <= :endDate OR (order.actualShipDate IS NULL AND sf.shipmentDate <= :endDate))',
          { endDate }
        );
      }

      const [items, total] = await queryBuilder
        .orderBy('container.updatedAt', 'DESC')
        .skip((Number(page) - 1) * Number(pageSize))
        .take(Number(pageSize))
        .getManyAndCount();

      logger.info(`[getContainers] Found ${items.length} containers, total: ${total}`);

      const containersWithStatus = await this.containerService.enrichContainersList(items);

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

      // 处理备货单汇总
      const allOrders = [...(container.orders || []), ...(container.order ? [container.order] : []).filter(Boolean)];
      const uniqueOrders = allOrders.filter((order, index, self) =>
        index === self.findIndex(o => o.orderNumber === order.orderNumber)
      );

      const containerWithExtensions = container as any;
      containerWithExtensions.allOrders = uniqueOrders;
      containerWithExtensions.summary = this.calculateOrdersSummary(uniqueOrders);

      if (allOrders.length > 0) {
        container.order = allOrders[0];
        container.orderNumber = allOrders[0].orderNumber;
      }

      // 获取状态事件
      const statusEvents = await this.containerService.getContainerStatusEvents(id);

      // 获取关联数据
      const [seaFreightData, truckingTransports, warehouseOperations, emptyReturns] = await Promise.all([
        this.seaFreightRepository
          .createQueryBuilder('sf')
          .where('sf.containerNumber = :id', { id })
          .getOne(),
        this.truckingTransportRepository
          .createQueryBuilder('tt')
          .where('tt.containerNumber = :id', { id })
          .orderBy('tt.lastPickupDate', 'DESC')
          .getMany(),
        this.warehouseOperationRepository
          .createQueryBuilder('wo')
          .where('wo.containerNumber = :id', { id })
          .orderBy('wo.warehouseArrivalDate', 'DESC')
          .getMany(),
        this.emptyReturnRepository
          .createQueryBuilder('er')
          .where('er.containerNumber = :id', { id })
          .orderBy('er.lastReturnDate', 'DESC')
          .getMany()
      ]);

      // 同步实际出运日期
      if (container.order && !container.order.actualShipDate && seaFreightData?.shipmentDate) {
        container.order.actualShipDate = seaFreightData.shipmentDate;
      }

      // 处理港口操作数据
      if (container.portOperations && container.portOperations.length > 0) {
        container.portOperations = container.portOperations.map((po: any) => ({
          ...po,
          customsBroker: po.customsBrokerCode || null
        }));
      }

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
        allOrders: (container as any).allOrders,
        summary: (container as any).summary,
        statusEvents,
        seaFreight: seaFreightData ? [seaFreightData] : [],
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
   * 计算备货单汇总数据
   */
  private calculateOrdersSummary(orders: ReplenishmentOrder[]) {
    const summary = {
      totalGrossWeight: 0,
      totalCbm: 0,
      totalBoxes: 0,
      shipmentTotalValue: 0,
      fobAmount: 0,
      cifAmount: 0,
      negotiationAmount: 0,
      orderCount: orders.length
    };

    orders.forEach((order: ReplenishmentOrder) => {
      summary.totalGrossWeight += order.totalGrossWeight || 0;
      summary.totalCbm += order.totalCbm || 0;
      summary.totalBoxes += order.totalBoxes || 0;
      summary.shipmentTotalValue += order.shipmentTotalValue || 0;
      summary.fobAmount += order.fobAmount || 0;
      summary.cifAmount += order.cifAmount || 0;
      summary.negotiationAmount += order.negotiationAmount || 0;
    });

    return summary;
  }

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

      const savedContainer = (await this.containerRepository.save(container)) as unknown as Container;

      if (savedContainer?.containerNumber) {
        logger.info(`Container created: ${savedContainer.containerNumber}`);
      }

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
        where: { containerNumber: id },
        relations: []
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
        where: { containerNumber: id },
        relations: []
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
  getStatistics = async (_req: Request, res: Response): Promise<void> => {
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

  /**
   * 获取详细统计数据（按状态、到港、提柜、最晚提柜、最晚还箱）
   * 支持按出运时间筛选
   * Get detailed container statistics
   */
  getStatisticsDetailed = async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate } = req.query

      logger.info('[getStatisticsDetailed] Starting detailed statistics calculation', {
        shipmentDateRange: {
          startDate,
          endDate
        },
        message: 'Filtering by shipment time (createdAt)'
      });

      // 逐个执行以便更好地追踪错误
      const statusDistribution = await this.statisticsService.getStatusDistribution(startDate as string, endDate as string);
      logger.info('[getStatisticsDetailed] Status distribution completed');

      const arrivalDistribution = await this.statisticsService.getArrivalDistribution(startDate as string, endDate as string);
      logger.info('[getStatisticsDetailed] Arrival distribution completed');

      const pickupDistribution = await this.statisticsService.getPickupDistribution(startDate as string, endDate as string);
      logger.info('[getStatisticsDetailed] Pickup distribution completed');

      const lastPickupDistribution = await this.statisticsService.getLastPickupDistribution(startDate as string, endDate as string);
      logger.info('[getStatisticsDetailed] Last pickup distribution completed');

      const returnDistribution = await this.statisticsService.getReturnDistribution(startDate as string, endDate as string);
      logger.info('[getStatisticsDetailed] Return distribution completed');

      logger.info('[getStatisticsDetailed] Detailed statistics calculation completed');
      logger.info('[getStatisticsDetailed] Results:', {
        statusDistribution,
        arrivalDistribution,
        pickupDistribution,
        lastPickupDistribution,
        returnDistribution
      });

      res.json({
        success: true,
        data: {
          statusDistribution,
          arrivalDistribution,
          pickupDistribution,
          lastPickupDistribution,
          returnDistribution
        }
      });
    } catch (error: any) {
      logger.error('[getStatisticsDetailed] Failed to get detailed statistics', {
        error: error?.message,
        stack: error?.stack
      });
      res.status(500).json({
        success: false,
        message: '获取详细统计数据失败',
        error: error?.message
      });
    }
  };

  /**
   * 获取统计数据验证信息
   * 支持按出运时间筛选
   * Get statistics verification data for data consistency checks
   */
  getStatisticsVerify = async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate } = req.query

      logger.info('[getStatisticsVerify] Starting statistics verification', {
        shipmentDateRange: {
          startDate,
          endDate
        },
        message: 'Filtering by shipment time (createdAt)'
      });

      const [statusDistribution, arrivalDistribution, pickupDistribution, lastPickupDistribution, returnDistribution] =
        await Promise.all([
          this.statisticsService.getStatusDistribution(startDate as string, endDate as string),
          this.statisticsService.getArrivalDistribution(startDate as string, endDate as string),
          this.statisticsService.getPickupDistribution(startDate as string, endDate as string),
          this.statisticsService.getLastPickupDistribution(startDate as string, endDate as string),
          this.statisticsService.getReturnDistribution(startDate as string, endDate as string)
        ]);

      // 计算总数（排除 arrived_at_transit，避免重复计数）
      const { arrived_at_transit, ...statusOnly } = statusDistribution;
      const totalContainers = Object.values(statusOnly).reduce((sum, count) => sum + count, 0);
      const totalInTransit = (statusDistribution.shipped || 0) + (statusDistribution.in_transit || 0) + (statusDistribution.at_port || 0);
      const totalArrival = Object.values(arrivalDistribution).reduce((sum, count) => sum + count, 0);
      const totalPickup = (pickupDistribution.overdue || 0) + (pickupDistribution.todayPlanned || 0) + (pickupDistribution.pending || 0) + (pickupDistribution.within3Days || 0) + (pickupDistribution.within7Days || 0);
      const totalLastPickup = Object.values(lastPickupDistribution).reduce((sum, count) => sum + count, 0);
      const totalReturn = Object.values(returnDistribution).reduce((sum, count) => sum + count, 0);
      const atPortTotal = statusDistribution.at_port || 0;
      const pickedUpTotal = (statusDistribution.picked_up || 0) + (statusDistribution.unloaded || 0);

      // 构建验证检查
      const checks = [
        {
          name: '状态分布总和',
          status: totalContainers > 0 ? 'PASS' : 'FAIL',
          expected: totalContainers,
          actual: totalContainers,
          diff: 0
        },
        {
          name: '到港统计 vs 目标集',
          status: totalArrival <= totalInTransit ? 'PASS' : 'FAIL',
          expected: `<= ${totalInTransit}`,
          actual: totalArrival,
          diff: totalArrival - totalInTransit
        },
        {
          name: '提柜统计 + 最晚提柜 vs at_port',
          status: totalPickup + totalLastPickup <= atPortTotal ? 'PASS' : 'FAIL',
          expected: `<= ${atPortTotal}`,
          actual: totalPickup + totalLastPickup,
          diff: totalPickup + totalLastPickup - atPortTotal
        },
        {
          name: '还箱统计 vs picked_up+unloaded',
          status: totalReturn === pickedUpTotal ? 'PASS' : 'FAIL',
          expected: pickedUpTotal,
          actual: totalReturn,
          diff: totalReturn - pickedUpTotal
        }
      ];

      const verificationData = {
        totalContainers,
        totalInTransit,
        totalArrival,
        totalPickup,
        totalLastPickup,
        totalReturn,
        atPortTotal,
        pickedUpTotal,
        checks
      };

      logger.info('[getStatisticsVerify] Verification completed:', verificationData);

      res.json({
        success: true,
        data: verificationData
      });
    } catch (error) {
      logger.error('Failed to get statistics verification', error);
      res.status(500).json({
        success: false,
        message: '获取统计数据验证失败'
      });
    }
  };

  /**
   * 获取年度出运量数据（近三年）
   * Get yearly shipment volume data (last 3 years)
   */
  getYearlyVolume = async (_req: Request, res: Response): Promise<void> => {
    try {
      logger.info('[getYearlyVolume] Starting yearly volume calculation');

      const yearlyData = await this.statisticsService.getYearlyVolume();

      logger.info('[getYearlyVolume] Yearly volume calculation completed:', yearlyData);

      res.json({
        success: true,
        data: yearlyData
      });
    } catch (error) {
      logger.error('Failed to get yearly volume', error);
      res.status(500).json({
        success: false,
        message: '获取年度出运量失败'
      });
    }
  };

  /**
   * 获取异常集装箱统计
   * Get abnormal containers statistics
   */
  getAbnormalStatistics = async (_req: Request, res: Response): Promise<void> => {
    try {
      logger.info('[getAbnormalStatistics] Starting abnormal statistics calculation');

      const abnormalDistribution = await this.statisticsService.getAbnormalDistribution();

      logger.info('[getAbnormalStatistics] Abnormal statistics completed:', abnormalDistribution);

      res.json({
        success: true,
        data: abnormalDistribution
      });
    } catch (error) {
      logger.error('Failed to get abnormal statistics', error);
      res.status(500).json({
        success: false,
        message: '获取异常统计失败'
      });
    }
  };

  /**
   * 根据统计条件获取货柜列表
   * 与统计查询使用相同的逻辑，确保前后端数据一致
   * @param filterCondition 统计条件
   * @param startDate 出运开始日期
   * @param endDate 出运结束日期
   */
  getContainersByFilterCondition = async (req: Request, res: Response): Promise<void> => {
    try {
      const { filterCondition, startDate, endDate } = req.query;

      if (!filterCondition || typeof filterCondition !== 'string') {
        res.status(400).json({
          success: false,
          message: '缺少 filterCondition 参数'
        });
        return;
      }

      logger.info('[getContainersByFilterCondition] Query params:', {
        filterCondition,
        startDate,
        endDate
      });

      const containers = await this.statisticsService.getContainersByCondition(
        filterCondition as string,
        startDate as string,
        endDate as string
      );

      // 使用 containerService 丰富货柜列表数据
      const containersWithStatus = await this.containerService.enrichContainersList(containers);

      logger.info(`[getContainersByFilterCondition] Found ${containers.length} containers for condition: ${filterCondition}`);

      res.json({
        success: true,
        items: containersWithStatus,
        count: containers.length
      });
    } catch (error) {
      logger.error('Failed to get containers by filter condition', error);
      res.status(500).json({
        success: false,
        message: '根据条件获取货柜列表失败'
      });
    }
  };

  /**
   * 更新单个货柜状态
   * POST /api/containers/:containerNumber/update-status
   */
  updateContainerStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { containerNumber } = req.params;

      if (!containerNumber) {
        res.status(400).json({
          success: false,
          message: '货柜号不能为空'
        });
        return;
      }

      const updated = await this.containerStatusService.updateStatus(containerNumber);

      res.json({
        success: true,
        updated,
        message: updated ? '状态更新成功' : '状态无需更新'
      });
    } catch (error) {
      logger.error(`Failed to update container status`, error);
      res.status(500).json({
        success: false,
        message: '更新货柜状态失败'
      });
    }
  };

  /**
   * 批量更新货柜状态
   * POST /api/containers/update-statuses/batch
   * 支持传入货柜号数组，或使用 limit 参数批量更新
   */
  batchUpdateContainerStatuses = async (req: Request, res: Response): Promise<void> => {
    try {
      const { containerNumbers, limit } = req.body;

      let updatedCount = 0;

      if (Array.isArray(containerNumbers) && containerNumbers.length > 0) {
        // 更新指定货柜
        updatedCount = await this.containerStatusService.updateStatusesForContainers(containerNumbers);
      } else if (limit) {
        // 批量更新指定数量的货柜
        updatedCount = await this.containerStatusService.batchUpdateStatuses(limit);
      } else {
        // 默认批量更新所有货柜
        updatedCount = await this.containerStatusService.batchUpdateStatuses(1000);
      }

      res.json({
        success: true,
        updatedCount,
        message: `批量更新完成，更新了 ${updatedCount} 个货柜`
      });
    } catch (error) {
      logger.error('Failed to batch update container statuses', error);
      res.status(500).json({
        success: false,
        message: '批量更新货柜状态失败'
      });
    }
  };
}
