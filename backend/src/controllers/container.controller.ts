/**
 * 货柜控制器
 * Container Controller
 */

import { Request, Response } from 'express';
import { AppDataSource } from '../database';
import { Container } from '../entities/Container';
import { ContainerStatusEvent } from '../entities/ContainerStatusEvent';
import { Country } from '../entities/Country';
import { CustomsBroker } from '../entities/CustomsBroker';
import { PortOperation } from '../entities/PortOperation';
import { SeaFreight } from '../entities/SeaFreight';
import { TruckingCompany } from '../entities/TruckingCompany';
import { TruckingTransport } from '../entities/TruckingTransport';
import { TruckingPortMapping } from '../entities/TruckingPortMapping';
import { Warehouse } from '../entities/Warehouse';
import { WarehouseOperation } from '../entities/WarehouseOperation';
import { WarehouseTruckingMapping } from '../entities/WarehouseTruckingMapping';
import { EmptyReturn } from '../entities/EmptyReturn';
import { ReplenishmentOrder } from '../entities/ReplenishmentOrder';
import { In, Repository, MoreThanOrEqual } from 'typeorm';
import { logger } from '../utils/logger';
import { snakeToCamel } from '../utils/snakeToCamel';
import { ContainerService } from '../services/container.service';
import { ContainerDataService } from '../services/ContainerDataService';
import { ContainerStatisticsService } from '../services/containerStatistics.service';
import { ContainerStatusService } from '../services/containerStatus.service';
import { DateFilterBuilder } from '../services/statistics/common/DateFilterBuilder';
import { auditLogService } from '../services/auditLog.service';

export class ContainerController {
  private containerRepository: Repository<Container>;
  private seaFreightRepository: Repository<SeaFreight>;
  private truckingTransportRepository: Repository<TruckingTransport>;
  private warehouseOperationRepository: Repository<WarehouseOperation>;
  private emptyReturnRepository: Repository<EmptyReturn>;
  private truckingPortMappingRepository: Repository<TruckingPortMapping>;
  private warehouseTruckingMappingRepository: Repository<WarehouseTruckingMapping>;
  private containerService: ContainerService;
  private containerDataService: ContainerDataService;
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
    // 字典表
    const customsBrokerRepository = AppDataSource.getRepository(CustomsBroker);
    const truckingCompanyRepository = AppDataSource.getRepository(TruckingCompany);
    const warehouseRepository = AppDataSource.getRepository(Warehouse);
    const countryRepository = AppDataSource.getRepository(Country);
    // 映射表
    const truckingPortMappingRepository = AppDataSource.getRepository(TruckingPortMapping);
    const warehouseTruckingMappingRepository = AppDataSource.getRepository(WarehouseTruckingMapping);
    this.truckingPortMappingRepository = truckingPortMappingRepository;
    this.warehouseTruckingMappingRepository = warehouseTruckingMappingRepository;

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
      orderRepository,
      customsBrokerRepository,
      truckingCompanyRepository,
      warehouseRepository,
      countryRepository
    );

    this.containerDataService = new ContainerDataService(
      containerRepository,
      this.containerService
    );

    this.statisticsService = new ContainerStatisticsService(
      containerRepository,
      truckingTransportRepository,
      emptyReturnRepository
    );

    this.containerDataService = new ContainerDataService(
      containerRepository,
      this.containerService
    );

    this.containerStatusService = new ContainerStatusService();
  }

  /**
   * 测试统计服务初始化
   */
  testStatisticsService = async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info('[Test] StatisticsService initialized', { hasStatsService: !!this.statisticsService });
      logger.info('[Test] containerRepository initialized', { hasRepo: !!this.containerRepository });

      const testQuery = this.containerRepository
        .createQueryBuilder('container')
        .select('COUNT(*)', 'count')
        .getRawOne();

      const count = await testQuery;
      logger.info('[Test] Container count', { count: count?.count });

      // 测试 getStatusDistribution
      const statusDist = await this.statisticsService.getStatusDistribution();
      logger.info('[Test] Status distribution result', { statusDist });

      // 测试 getArrivalDistribution
      const arrivalDist = await this.statisticsService.getArrivalDistribution();
      logger.info('[Test] Arrival distribution result', { arrivalDist });

      // 测试 getPickupDistribution
      const pickupDist = await this.statisticsService.getPickupDistribution();
      logger.info('[Test] Pickup distribution result', { pickupDist });

      // 测试 getLastPickupDistribution
      const lastPickupDist = await this.statisticsService.getLastPickupDistribution();
      logger.info('[Test] Last pickup distribution result', { lastPickupDist });

      // 测试 getReturnDistribution
      const returnDist = await this.statisticsService.getReturnDistribution();
      logger.info('[Test] Return distribution result', { returnDist });

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
      logger.error('[Test] Error', error);
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

      // 使用新的数据服务
      const result = await this.containerDataService.getContainersForList({
        page: Number(page),
        pageSize: Number(pageSize),
        search: String(search),
        startDate: startDate as string,
        endDate: endDate as string
      });

      let dateFilterFallback = false;

      // 当传了日期且按日期筛选结果为 0 时，回退为「全部货柜」并打标
      if (startDate && endDate && result.total === 0) {
        dateFilterFallback = true;
        const fallbackResult = await this.containerDataService.getContainersForList({
          page: Number(page),
          pageSize: Number(pageSize),
          search: String(search)
          // 不传入日期参数，获取全部货柜
        });
        
        result.items = fallbackResult.items;
        result.total = fallbackResult.total;
        logger.info(`[getContainers] Date range had no matches, fallback to all: ${result.total} containers`);
      }

      logger.info(`[getContainers] Found ${result.items.length} containers, total: ${result.total}`);

      res.json({
        success: true,
        dateFilterFallback: dateFilterFallback || undefined,
        items: result.items,
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          total: result.total,
          totalPages: Math.ceil(result.total / Number(pageSize))
        }
      });

      logger.info(`Retrieved ${result.items.length} containers`);
    } catch (error) {
      logger.error('Failed to get containers', error);
      res.status(500).json({
        success: false,
        message: '获取货柜列表失败'
      });
    }
  };

  /**
   * 获取货柜在列表中的单行数据（与列表 API 的 enrich 结果一致，用于核对前端显示与后端数据）
   */
  getContainerListRow = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id: containerNumber } = req.params;
      const row = await this.containerService.getListRowByContainerNumber(containerNumber);
      if (!row) {
        res.status(404).json({ success: false, message: '货柜不存在' });
        return;
      }
      res.json({ success: true, data: row });
    } catch (error: any) {
      logger.error('[getContainerListRow]', error?.message);
      res.status(500).json({ success: false, message: '获取列表行数据失败' });
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
        .leftJoinAndSelect('container.replenishmentOrders', 'order')
        .leftJoinAndSelect('container.seaFreight', 'sf')
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
      const replenishmentOrders = container.replenishmentOrders || [];
      const containerWithExtensions = container as any;
      containerWithExtensions.allOrders = replenishmentOrders;
      containerWithExtensions.summary = this.calculateOrdersSummary(replenishmentOrders);
      // 保持向后兼容：将第一个备货单作为order返回
      containerWithExtensions.order = replenishmentOrders[0] || null;

      // 获取状态事件
      const statusEvents = await this.containerService.getContainerStatusEvents(id);

      // 海运信息已通过 leftJoinAndSelect('container.seaFreight') 加载，SeaFreight 表无 container_number 列
      const seaFreightData = container.seaFreight ?? null;

      // 获取其余关联数据
      const [truckingTransports, warehouseOperations, emptyReturns] = await Promise.all([
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

      // 同步实际出运日期（同步到关联的备货单）
      if (replenishmentOrders.length > 0 && seaFreightData?.shipmentDate) {
        for (const order of replenishmentOrders) {
          if (!order.actualShipDate) {
            order.actualShipDate = seaFreightData.shipmentDate;
          }
        }
      }

      // 处理港口操作数据
      if (container.portOperations && container.portOperations.length > 0) {
        container.portOperations = container.portOperations.map((po: any) => ({
          ...po,
          customsBroker: po.customsBrokerCode || null
        }));
      }

      const summary = (container as any).summary;
      const responseData = {
        containerNumber: container.containerNumber,
        orderNumber: replenishmentOrders[0]?.orderNumber ?? null,
        mainOrderNumber: replenishmentOrders[0]?.mainOrderNumber ?? null,
        containerTypeCode: container.containerTypeCode,
        cargoDescription: container.cargoDescription,
        grossWeight: summary?.totalGrossWeight ?? container.grossWeight,
        netWeight: container.netWeight,
        cbm: summary?.totalCbm ?? container.cbm,
        packages: summary?.totalBoxes ?? container.packages,
        shipmentTotalValue: summary?.shipmentTotalValue ?? null,
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
      const containerData = snakeToCamel(req.body);

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
      const updateData = snakeToCamel(req.body);

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

      // 记录数据变更日志
      const changedFields: Record<string, { old?: unknown; new?: unknown }> = {};
      for (const key of Object.keys(updateData)) {
        const oldVal = (container as any)[key];
        const newVal = (updatedContainer as any)[key];
        if (oldVal !== newVal) {
          changedFields[key] = {
            old: oldVal instanceof Date ? oldVal.toISOString() : oldVal,
            new: newVal instanceof Date ? newVal.toISOString() : newVal
          };
        }
      }
      if (Object.keys(changedFields).length > 0) {
        await auditLogService.logChange({
          sourceType: 'manual',
          entityType: 'biz_containers',
          entityId: updatedContainer.containerNumber,
          action: 'UPDATE',
          changedFields,
          operatorIp: req.ip || req.socket?.remoteAddress || undefined
        });
      }

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
          updatedAt: MoreThanOrEqual(today)
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
        shipmentDateRange: { startDate, endDate },
        message: 'Filtering by shipment time; country from request context'
      });

      let statusDistribution = await this.statisticsService.getStatusDistribution(startDate as string, endDate as string);
      logger.info('[getStatisticsDetailed] Status distribution completed');

      let arrivalDistribution = await this.statisticsService.getArrivalDistribution(startDate as string, endDate as string);
      logger.info('[getStatisticsDetailed] Arrival distribution completed');

      const pickupDistribution = await this.statisticsService.getPickupDistribution(startDate as string, endDate as string);
      logger.info('[getStatisticsDetailed] Pickup distribution completed');

      const lastPickupDistribution = await this.statisticsService.getLastPickupDistribution(startDate as string, endDate as string);
      logger.info('[getStatisticsDetailed] Last pickup distribution completed');

      const returnDistribution = await this.statisticsService.getReturnDistribution(startDate as string, endDate as string);
      logger.info('[getStatisticsDetailed] Return distribution completed');

      // 当传了日期且按状态/到港合计为 0 时，回退为「不按日期」的统计并打标，避免卡片全 0
      // 修复：必须同时回退 status 与 arrival，否则两卡片使用不同日期范围导致总数不一致（按状态 6 vs 按到港 10）
      let dateFilterFallback = false;
      if (startDate && endDate) {
        const statusTotal = Object.entries(statusDistribution).reduce((s, [k, v]) => (k === 'arrived_at_transit' || k === 'arrived_at_destination' ? s : s + (v || 0)), 0);
        const arrivalTotal =
          (arrivalDistribution.arrivedAtDestination || 0) +
          (arrivalDistribution.arrivedAtTransit || 0) +
          (arrivalDistribution.expectedArrival || 0) +
          (arrivalDistribution.arrivedBeforeTodayNoATA || 0);
        if (statusTotal === 0 || arrivalTotal === 0) {
          dateFilterFallback = true;
          [statusDistribution, arrivalDistribution] = await Promise.all([
            this.statisticsService.getStatusDistribution(undefined, undefined),
            this.statisticsService.getArrivalDistribution(undefined, undefined)
          ]);
          logger.info('[getStatisticsDetailed] Date range had no status/arrival matches, fallback to unfiltered stats (both)');
        }
      }

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
        dateFilterFallback: dateFilterFallback || undefined,
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

      // 统计服务返回的 container 未加载 seaFreight，enrich 时拿不到提单号；先按柜号带 relation 重查再 enrich
      let toEnrich = containers;
      if (containers.length > 0) {
        const containerNumbers = containers.map((c: Container) => c.containerNumber);
        const withRelations = await this.containerRepository.find({
          where: { containerNumber: In(containerNumbers) },
          relations: ['seaFreight']
        });
        const byNumber = new Map(withRelations.map((c: Container) => [c.containerNumber, c]));
        toEnrich = containerNumbers.map((n: string) => byNumber.get(n)).filter(Boolean) as Container[];
      }

      const containersWithStatus = await this.containerService.enrichContainersList(toEnrich);

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

  /**
   * 更新货柜计划（手工排柜）
   * PATCH /api/containers/:id/schedule
   * @body {
   *   plannedCustomsDate?: Date,      // 计划清关日
   *   plannedPickupDate?: Date,      // 计划提柜日
   *   plannedDeliveryDate?: Date,    // 计划送仓日
   *   plannedUnloadDate?: Date,      // 计划卸柜日
   *   plannedReturnDate?: Date,      // 计划还箱日
   *   truckingCompanyId?: string,    // 车队ID
   *   customsBrokerCode?: string,    // 清关公司代码
   *   warehouseId?: string,          // 仓库ID
   *   unloadModePlan?: string,      // 卸柜方式
   * }
   */
  updateSchedule = async (req: Request, res: Response): Promise<void> => {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { id } = req.params;
      const {
        plannedCustomsDate,
        plannedPickupDate,
        plannedDeliveryDate,
        plannedUnloadDate,
        plannedReturnDate,
        truckingCompanyId,
        customsBrokerCode,
        warehouseId,
        unloadModePlan
      } = req.body;

      // 1. 校验货柜是否存在
      const container = await queryRunner.manager.findOne(Container, {
        where: { containerNumber: id }
      });

      if (!container) {
        await queryRunner.rollbackTransaction();
        res.status(404).json({ success: false, message: '货柜不存在' });
        return;
      }

      // 2. 获取货柜现有数据用于校验
      const [portOp, trucking, warehouseOp, seaFreight] = await Promise.all([
        queryRunner.manager.findOne(PortOperation, { where: { containerNumber: id, portType: 'destination' } }),
        queryRunner.manager.findOne(TruckingTransport, { where: { containerNumber: id } }),
        queryRunner.manager.findOne(WarehouseOperation, { where: { containerNumber: id } }),
        queryRunner.manager.findOne(SeaFreight, { where: { containerNumber: id } })
      ]);

      // 3. 约束校验
      const validationErrors: string[] = [];

      // 3.1 映射关系校验：港口→车队
      if (truckingCompanyId && seaFreight?.destinationPort) {
        const portMapping = await this.truckingPortMappingRepository.findOne({
          where: {
            truckingCompanyId,
            portCode: seaFreight.destinationPort,
            isActive: true
          }
        });
        if (!portMapping) {
          validationErrors.push(`车队 ${truckingCompanyId} 不支持港口 ${seaFreight.destinationPort}`);
        }
      }

      // 3.2 映射关系校验：仓库→车队
      if (warehouseId && truckingCompanyId) {
        const warehouseMapping = await this.warehouseTruckingMappingRepository.findOne({
          where: {
            warehouseCode: warehouseId,
            truckingCompanyId,
            isActive: true
          }
        });
        if (!warehouseMapping) {
          validationErrors.push(`仓库 ${warehouseId} 不支持车队 ${truckingCompanyId}`);
        }
      }

      // 3.3 顺序约束校验：计划时间必须按顺序
      const plannedCustoms = plannedCustomsDate ? new Date(plannedCustomsDate) : (portOp?.plannedCustomsDate ? new Date(portOp.plannedCustomsDate) : null);
      const plannedPickup = plannedPickupDate ? new Date(plannedPickupDate) : (trucking?.plannedPickupDate ? new Date(trucking.plannedPickupDate) : null);
      const plannedDelivery = plannedDeliveryDate ? new Date(plannedDeliveryDate) : (trucking?.plannedDeliveryDate ? new Date(trucking.plannedDeliveryDate) : null);
      const plannedUnload = plannedUnloadDate ? new Date(plannedUnloadDate) : (warehouseOp?.plannedUnloadDate ? new Date(warehouseOp.plannedUnloadDate) : null);
      const plannedReturn = plannedReturnDate ? new Date(plannedReturnDate) : null;

      if (plannedCustoms && plannedPickup && plannedCustoms > plannedPickup) {
        validationErrors.push('计划清关日不能晚于计划提柜日');
      }
      if (plannedPickup && plannedDelivery && plannedPickup > plannedDelivery) {
        validationErrors.push('计划提柜日不能晚于计划送仓日');
      }
      if (plannedDelivery && plannedUnload && plannedDelivery > plannedUnload) {
        validationErrors.push('计划送仓日不能晚于计划卸柜日');
      }
      if (plannedUnload && plannedReturn && plannedUnload > plannedReturn) {
        validationErrors.push('计划卸柜日不能晚于计划还箱日');
      }

      // 如果有校验错误，返回
      if (validationErrors.length > 0) {
        await queryRunner.rollbackTransaction();
        res.status(400).json({ success: false, message: '校验失败', errors: validationErrors });
        return;
      }

      // 4. 更新清关计划（process_port_operations - destination）
      if (plannedCustomsDate !== undefined || customsBrokerCode !== undefined) {
        const portOp = await queryRunner.manager.findOne(PortOperation, {
          where: { containerNumber: id, portType: 'destination' }
        });

        if (portOp) {
          if (plannedCustomsDate !== undefined) {
            portOp.plannedCustomsDate = new Date(plannedCustomsDate);
          }
          if (customsBrokerCode !== undefined) {
            portOp.customsBrokerCode = customsBrokerCode;
          }
          await queryRunner.manager.save(portOp);
        }
      }

      // 3. 更新拖卡计划（process_trucking_transport）
      if (plannedPickupDate !== undefined || plannedDeliveryDate !== undefined || 
          truckingCompanyId !== undefined || unloadModePlan !== undefined) {
        let trucking = await queryRunner.manager.findOne(TruckingTransport, {
          where: { containerNumber: id }
        });

        if (!trucking) {
          // 如果不存在，创建新记录
          trucking = new TruckingTransport();
          trucking.containerNumber = id;
        }

        if (plannedPickupDate !== undefined) {
          trucking.plannedPickupDate = new Date(plannedPickupDate);
        }
        if (plannedDeliveryDate !== undefined) {
          trucking.plannedDeliveryDate = new Date(plannedDeliveryDate);
        }
        if (truckingCompanyId !== undefined) {
          trucking.truckingCompanyId = truckingCompanyId;
        }
        if (unloadModePlan !== undefined) {
          trucking.unloadModePlan = unloadModePlan;
        }
        // 手工调整后标记状态
        trucking.scheduleStatus = 'adjusted';
        await queryRunner.manager.save(trucking);
      }

      // 4. 更新卸柜计划（process_warehouse_operations）
      if (plannedUnloadDate !== undefined || warehouseId !== undefined) {
        let warehouseOp = await queryRunner.manager.findOne(WarehouseOperation, {
          where: { containerNumber: id }
        });

        if (!warehouseOp) {
          warehouseOp = new WarehouseOperation();
          warehouseOp.containerNumber = id;
        }

        if (plannedUnloadDate !== undefined) {
          warehouseOp.plannedUnloadDate = new Date(plannedUnloadDate);
        }
        if (warehouseId !== undefined) {
          warehouseOp.warehouseId = warehouseId;
        }
        await queryRunner.manager.save(warehouseOp);
      }

      // 5. 更新还箱计划（process_empty_return）
      if (plannedReturnDate !== undefined) {
        let emptyReturn = await queryRunner.manager.findOne(EmptyReturn, {
          where: { containerNumber: id }
        });

        if (!emptyReturn) {
          emptyReturn = new EmptyReturn();
          emptyReturn.containerNumber = id;
        }

        emptyReturn.plannedReturnDate = new Date(plannedReturnDate);
        await queryRunner.manager.save(emptyReturn);
      }

      await queryRunner.commitTransaction();

      res.json({
        success: true,
        message: '计划更新成功',
        containerNumber: id
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('[updateSchedule] Error:', error);
      res.status(500).json({ success: false, message: '更新计划失败', error: String(error) });
    } finally {
      await queryRunner.release();
    }
  };
}
