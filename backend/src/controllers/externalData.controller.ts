/**
 * 外部数据控制器
 * 用于管理外部数据源（如飞驼）的数据同步
 * Token 留空时飞驼同步返回友好错误，Excel 导入不受影响
 */

import { Request, Response } from 'express';
import type { FeiTuoQueryOptions } from '../adapters/FeiTuoAdapter';
import { ContainerStatusEvent } from '../entities/ContainerStatusEvent';
import { Container } from '../entities/Container';
import { PortOperation } from '../entities/PortOperation';
import { SeaFreight } from '../entities/SeaFreight';
import { TruckingTransport } from '../entities/TruckingTransport';
import { WarehouseOperation } from '../entities/WarehouseOperation';
import { EmptyReturn } from '../entities/EmptyReturn';
import { ExtDemurrageStandard } from '../entities/ExtDemurrageStandard';
import { ExtDemurrageRecord } from '../entities/ExtDemurrageRecord';
import { ReplenishmentOrder } from '../entities/ReplenishmentOrder';
import { AppDataSource } from '../database';
import { logger } from '../utils/logger';
import { calculateLogisticsStatus } from '../utils/logisticsStatusMachine';
import { getCoreFieldName } from '../constants/FeiTuoStatusMapping';
import { DemurrageService } from '../services/demurrage.service';
import { externalDataService } from '../services/externalDataService';

const ATA_RELATED_FIELDS = ['ata', 'dest_port_unload_date', 'discharged_time'];

export class ExternalDataController {
  private eventRepository = AppDataSource.getRepository(ContainerStatusEvent);
  private containerRepository = AppDataSource.getRepository(Container);
  private portOperationRepository = AppDataSource.getRepository(PortOperation);
  private seaFreightRepository = AppDataSource.getRepository(SeaFreight);
  private truckingTransportRepository = AppDataSource.getRepository(TruckingTransport);
  private warehouseOperationRepository = AppDataSource.getRepository(WarehouseOperation);
  private emptyReturnRepository = AppDataSource.getRepository(EmptyReturn);
  private demurrageService = new DemurrageService(
    AppDataSource.getRepository(ExtDemurrageStandard),
    AppDataSource.getRepository(Container),
    AppDataSource.getRepository(PortOperation),
    AppDataSource.getRepository(SeaFreight),
    AppDataSource.getRepository(TruckingTransport),
    AppDataSource.getRepository(EmptyReturn),
    AppDataSource.getRepository(ReplenishmentOrder),
    AppDataSource.getRepository(ExtDemurrageRecord)
  );
  /**
   * 同步单个货柜的状态事件
   * POST /api/external/sync/:containerNumber
   */
  syncContainer = async (req: Request, res: Response): Promise<void> => {
    try {
      const { containerNumber } = req.params;
      const { dataSource = 'Feituo' } = req.body;

      if (!containerNumber) {
        res.status(400).json({
          success: false,
          message: '缺少集装箱号',
        });
        return;
      }

      logger.info(`[ExternalDataController] 收到同步请求: ${containerNumber}, 数据源: ${dataSource}`);

      const result = await this.doSyncContainer(containerNumber, dataSource);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error || '同步失败',
        });
        return;
      }

      res.json({
        success: true,
        message: `成功同步 ${result.savedEvents!.length} 个状态事件`,
        data: {
          containerNumber,
          eventCount: result.savedEvents!.length,
          events: result.savedEvents,
        },
      });

    } catch (error: unknown) {
      logger.error('[ExternalDataController] 同步货柜失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '同步失败',
      });
    }
  };

  /**
   * 执行同步逻辑（供 syncContainer 或 syncBatch 调用）
   * 统一入口：调用 ExternalDataService 复用完整同步逻辑
   */
  private async doSyncContainer(
    containerNumber: string,
    _dataSource: string
  ): Promise<{ success: true; savedEvents: ContainerStatusEvent[] } | { success: false; error: string }> {
    try {
      // 统一入口：调用 ExternalDataService 的同步方法
      // 该方法包含：
      // - places 优先处理逻辑
      // - 核心字段更新（PortOperation + EmptyReturn + SeaFreight）
      // - 状态机重算（包含完整入参）
      // - 滞港费重算触发
      const savedEvents = await externalDataService.syncContainerEvents(containerNumber, 'Feituo' as any);

      logger.info(`[ExternalDataController] 统一入口同步完成: ${containerNumber}, 事件数: ${savedEvents.length}`);
      return { success: true, savedEvents };

    } catch (error: any) {
      logger.error(`[ExternalDataController] 统一入口同步失败:`, error);
      return { success: false, error: error.message || '同步失败' };
    }
  }

  /**
   * 构建飞驼查询参数（从 process_sea_freight 获取 billNo、carrierCode）
   */
  private async buildFeiTuoQueryOptions(containerNumber: string): Promise<FeiTuoQueryOptions> {
    const container = await this.containerRepository.findOne({
      where: { containerNumber },
      relations: ['seaFreight'],
    });
    const sf = container?.seaFreight;
    const billNo = sf?.billOfLadingNumber;
    const carrierCode = sf?.mblScac || sf?.hblScac || undefined;
    return {
      billNo: billNo || undefined,
      carrierCode: carrierCode || undefined,
      isExport: 'E',
    };
  }

  /**
   * 将适配器返回的数据转换为状态事件实体（与 ext_container_status_events 表结构对齐）
   */
  private convertToStatusEvents(
    containerNumber: string,
    nodes: Array<{
      statusCode?: string;
      statusNameEn?: string;
      statusNameCn?: string;
      occurredAt?: Date;
      locationCode?: string;
      locationNameEn?: string;
      locationNameCn?: string;
      isEstimated?: boolean;
      dataSource?: string;
    }>
  ): ContainerStatusEvent[] {
    return nodes
      .filter((node) => node.occurredAt)
      .map((node) => {
        const event = new ContainerStatusEvent();
        event.containerNumber = containerNumber;
        event.statusCode = node.statusCode || 'STATUS';
        event.statusName = (node.statusNameCn || node.statusNameEn || node.statusCode || 'STATUS') as string;
        event.occurredAt = node.occurredAt!;
        event.location = (node.locationCode || node.locationNameEn || node.locationNameCn || '') as string;
        event.description = (node.statusNameCn || node.statusNameEn || '') as string;
        event.dataSource = node.dataSource || 'FeituoAPI'; // API 同步标记为 FeituoAPI，与 Excel 导入的 Feituo 区分
        event.rawData = {
          statusCode: node.statusCode,
          statusNameEn: node.statusNameEn,
          statusNameCn: node.statusNameCn,
          isEstimated: node.isEstimated,
        };
        return event;
      });
  }

  /**
   * 根据飞驼状态事件更新核心字段（process_port_operations、process_sea_freight、process_empty_return）
   * @returns 更新的目的港相关字段名（用于触发滞港费重算）
   */
  private async applyFeiTuoToCoreFields(
    containerNumber: string,
    events: ContainerStatusEvent[]
  ): Promise<string[]> {
    const updatedFields: string[] = [];
    for (const event of events) {
      const isEstimated = (event.rawData as { isEstimated?: boolean })?.isEstimated;
      if (isEstimated) continue;
      const fieldName = getCoreFieldName(event.statusCode || '');
      if (!fieldName) continue;

      const occurredAt = event.occurredAt;
      if (!occurredAt) continue;

      try {
        if (fieldName === 'return_time') {
          let er = await this.emptyReturnRepository.findOne({ where: { containerNumber } });
          if (!er) {
            er = this.emptyReturnRepository.create({ containerNumber });
          }
          er.returnTime = occurredAt;
          await this.emptyReturnRepository.save(er);
          logger.info(`[ExternalDataController] 写回 return_time: ${containerNumber}`);
          continue;
        }
        if (fieldName === 'shipment_date') {
          const container = await this.containerRepository.findOne({
            where: { containerNumber },
            relations: ['seaFreight'],
          });
          const bl = container?.seaFreight?.billOfLadingNumber;
          if (bl) {
            const sf = await this.seaFreightRepository.findOne({ where: { billOfLadingNumber: bl } });
            if (sf) {
              sf.shipmentDate = occurredAt;
              await this.seaFreightRepository.save(sf);
              logger.info(`[ExternalDataController] 写回 shipment_date: ${containerNumber}`);
            }
          }
          continue;
        }
        const portType =
          ['transit_arrival_date', 'atd'].includes(fieldName) ? 'transit' : 'destination';
        const po = await this.portOperationRepository
          .createQueryBuilder('po')
          .where('po.containerNumber = :containerNumber', { containerNumber })
          .andWhere('po.portType = :portType', { portType })
          .orderBy('po.portSequence', 'DESC')
          .getOne();
        if (po) {
          const updates: Partial<PortOperation> = {};
          if (fieldName === 'ata') updates.ata = occurredAt;
          else if (fieldName === 'eta') updates.eta = occurredAt;
          else if (fieldName === 'gate_in_time') updates.gateInTime = occurredAt;
          else if (fieldName === 'gate_out_time') updates.gateOutTime = occurredAt;
          else if (fieldName === 'dest_port_unload_date') updates.destPortUnloadDate = occurredAt;
          else if (fieldName === 'discharged_time') updates.dischargedTime = occurredAt;
          else if (fieldName === 'available_time') updates.availableTime = occurredAt;
          else if (fieldName === 'transit_arrival_date') updates.transitArrivalDate = occurredAt;
          else if (fieldName === 'atd') updates.atd = occurredAt;
          if (Object.keys(updates).length > 0) {
            Object.assign(po, updates);
            await this.portOperationRepository.save(po);
            if (ATA_RELATED_FIELDS.includes(fieldName)) updatedFields.push(fieldName);
            logger.info(`[ExternalDataController] 写回 ${fieldName}: ${containerNumber}`);
          }
        }
      } catch (err) {
        logger.warn(`[ExternalDataController] 写回核心字段失败: ${fieldName}`, err);
      }
    }
    return updatedFields;
  }

  /**
   * 保存状态事件到数据库
   */
  private async saveStatusEvents(events: ContainerStatusEvent[]): Promise<ContainerStatusEvent[]> {
    const savedEvents: ContainerStatusEvent[] = [];

    for (const event of events) {
      // 检查是否已存在相同的事件
      const existingEvent = await this.eventRepository.findOne({
        where: {
          containerNumber: event.containerNumber,
          statusCode: event.statusCode,
          occurredAt: event.occurredAt,
        },
      });

      if (existingEvent) {
        // 更新现有事件
        Object.assign(existingEvent, event);
        const updated = await this.eventRepository.save(existingEvent);
        savedEvents.push(updated);
        logger.info(`[ExternalDataController] 更新状态事件: ${event.containerNumber} - ${event.statusCode}`);
      } else {
        // 创建新事件
        const saved = await this.eventRepository.save(event);
        savedEvents.push(saved);
        logger.info(`[ExternalDataController] 创建状态事件: ${event.containerNumber} - ${event.statusCode}`);
      }
    }

    return savedEvents;
  }

  /**
   * 重新计算货柜的物流状态
   * 基于更新后的核心时间字段重新计算状态
   *
   * @param containerNumber 集装箱号
   */
  private async recalculateLogisticsStatus(containerNumber: string): Promise<void> {
    try {
      const container = await this.containerRepository.findOne({
        where: { containerNumber },
        relations: ['seaFreight'],
      });

      if (!container) {
        logger.warn(`[ExternalDataController] 货柜 ${containerNumber} 不存在`);
        return;
      }

      const portOperations = await this.portOperationRepository
        .createQueryBuilder('po')
        .where('po.containerNumber = :containerNumber', { containerNumber })
        .orderBy('po.portSequence', 'DESC')
        .getMany();

      const [truckingTransport, warehouseOperation, emptyReturn] = await Promise.all([
        this.truckingTransportRepository.findOne({ where: { containerNumber } }),
        this.warehouseOperationRepository.findOne({ where: { containerNumber } }),
        this.emptyReturnRepository.findOne({ where: { containerNumber } }),
      ]);

      const seaFreight = container.seaFreight ?? undefined;

      const result = calculateLogisticsStatus(
        container,
        portOperations,
        seaFreight,
        truckingTransport ?? undefined,
        warehouseOperation ?? undefined,
        emptyReturn ?? undefined
      );

      // 更新货柜的物流状态
      if (result.status !== container.logisticsStatus) {
        const oldStatus = container.logisticsStatus;
        container.logisticsStatus = result.status;
        await this.containerRepository.save(container);

        logger.info(`[ExternalDataController] 货柜 ${containerNumber} 物流状态更新: ${oldStatus} -> ${result.status}`);
      }

    } catch (error) {
      logger.error(`[ExternalDataController] 重新计算物流状态失败:`, error);
      // 不抛出错误,避免影响主流程
    }
  }

  /**
   * 批量同步货柜状态事件
   * POST /api/external/sync/batch
   */
  syncBatch = async (req: Request, res: Response): Promise<void> => {
    try {
      const { containerNumbers, dataSource = 'Feituo' } = req.body;

      if (!Array.isArray(containerNumbers) || containerNumbers.length === 0) {
        res.status(400).json({
          success: false,
          message: '请提供集装箱号数组',
        });
        return;
      }

      if (containerNumbers.length > 50) {
        res.status(400).json({
          success: false,
          message: '单次批量同步最多支持50个货柜',
        });
        return;
      }

      logger.info(`[ExternalDataController] 收到批量同步请求: ${containerNumbers.length} 个货柜`);

      const result = {
        success: [] as string[],
        failed: [] as { containerNumber: string; error: string }[],
      };

      for (const containerNumber of containerNumbers) {
        try {
          const syncResult = await this.doSyncContainer(containerNumber, dataSource);
          if (syncResult.success) {
            result.success.push(containerNumber);
          } else {
            result.failed.push({ containerNumber, error: syncResult.error });
          }
        } catch (error: unknown) {
          result.failed.push({
            containerNumber,
            error: error instanceof Error ? error.message : '未知错误',
          });
          logger.error(`[ExternalDataController] 同步货柜 ${containerNumber} 失败:`, error);
        }
      }

      res.json({
        success: true,
        message: `批量同步完成: 成功 ${result.success.length}, 失败 ${result.failed.length}`,
        data: result,
      });

    } catch (error: any) {
      logger.error('[ExternalDataController] 批量同步失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '批量同步失败',
      });
    }
  };

  /**
   * 获取货柜的状态事件列表
   * GET /api/external/events/:containerNumber
   */
  getContainerEvents = async (req: Request, res: Response): Promise<void> => {
    try {
      const { containerNumber } = req.params;
      const { limit = 50 } = req.query;

      const eventRepository = AppDataSource.getRepository(ContainerStatusEvent);

      const events = await eventRepository
        .createQueryBuilder('event')
        .where('event.containerNumber = :containerNumber', { containerNumber })
        .orderBy('event.occurredAt', 'DESC')
        .limit(Number(limit))
        .getMany();

      res.json({
        success: true,
        data: events,
        total: events.length,
      });

    } catch (error: any) {
      logger.error('[ExternalDataController] 获取状态事件失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取状态事件失败',
      });
    }
  };

  /**
   * 删除货柜的状态事件
   * DELETE /api/external/events/:containerNumber
   */
  deleteContainerEvents = async (req: Request, res: Response): Promise<void> => {
    try {
      const { containerNumber } = req.params;

      const eventRepository = AppDataSource.getRepository(ContainerStatusEvent);

      const result = await eventRepository
        .createQueryBuilder('event')
        .where('event.containerNumber = :containerNumber', { containerNumber })
        .delete()
        .execute();

      logger.info(`[ExternalDataController] 删除了 ${result.affected || 0} 个状态事件`);

      res.json({
        success: true,
        message: `成功删除 ${result.affected || 0} 个状态事件`,
        data: {
          containerNumber,
          deletedCount: result.affected || 0,
        },
      });

    } catch (error: any) {
      logger.error('[ExternalDataController] 删除状态事件失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '删除状态事件失败',
      });
    }
  };

  /**
   * 清理过期的预计状态事件
   * POST /api/external/cleanup
   * 通过 raw_data->>'isEstimated' 判断预计事件
   */
  cleanupExpiredEvents = async (req: Request, res: Response): Promise<void> => {
    try {
      const { days = 7 } = req.body;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const deleteResult = await this.eventRepository
        .createQueryBuilder('event')
        .where("(event.rawData->>'isEstimated')::boolean = true")
        .andWhere('event.occurredAt < :cutoffDate', { cutoffDate })
        .andWhere('event.dataSource IN (:...dataSources)', {
          dataSources: ['Feituo', 'AIS'],
        })
        .delete()
        .execute();

      const deletedCount = deleteResult.affected || 0;

      res.json({
        success: true,
        message: `成功清理 ${deletedCount} 个过期的预计状态事件`,
        data: {
          deletedCount,
          retentionDays: days,
        },
      });

    } catch (error: unknown) {
      logger.error('[ExternalDataController] 清理过期事件失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '清理过期事件失败',
      });
    }
  };

  /**
   * 获取数据源统计信息
   * GET /api/external/stats
   */
  getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const eventRepository = AppDataSource.getRepository(ContainerStatusEvent);

      // 总事件数
      const totalEvents = await eventRepository.count();

      // 按数据源统计
      const dataSourceStats = await eventRepository
        .createQueryBuilder('event')
        .select('event.dataSource', 'dataSource')
        .addSelect('COUNT(*)', 'count')
        .groupBy('event.dataSource')
        .getRawMany();

      // 按是否预计统计（rawData.isEstimated）
      const estimatedStats = await eventRepository
        .createQueryBuilder('event')
        .select("COALESCE((event.rawData->>'isEstimated')::boolean, false)", 'isEstimated')
        .addSelect('COUNT(*)', 'count')
        .groupBy("COALESCE((event.rawData->>'isEstimated')::boolean, false)")
        .getRawMany();

      // 最近更新的货柜（按 occurredAt 最大）
      const recentContainers = await eventRepository
        .createQueryBuilder('event')
        .select('event.containerNumber', 'containerNumber')
        .addSelect('MAX(event.occurredAt)', 'lastUpdate')
        .addGroupBy('event.containerNumber')
        .orderBy('lastUpdate', 'DESC')
        .limit(10)
        .getRawMany();

      res.json({
        success: true,
        data: {
          totalEvents,
          dataSourceStats,
          estimatedStats,
          recentContainers,
        },
      });

    } catch (error: any) {
      logger.error('[ExternalDataController] 获取统计信息失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取统计信息失败',
      });
    }
  };

  /**
   * 获取已有外部数据的货柜列表（用于验证页）
   * GET /api/external/containers?dataSource=FeituoAPI&page=1&pageSize=20
   */
  getContainersWithExternalData = async (req: Request, res: Response): Promise<void> => {
    try {
      const { dataSource, page = 1, pageSize = 20 } = req.query;
      const eventRepository = AppDataSource.getRepository(ContainerStatusEvent);

      let qb = eventRepository
        .createQueryBuilder('event')
        .select('event.containerNumber', 'containerNumber')
        .addSelect('array_agg(DISTINCT event.dataSource)', 'dataSources')
        .addSelect('COUNT(*)', 'eventCount')
        .addSelect('MIN(event.occurredAt)', 'firstEventAt')
        .addSelect('MAX(event.occurredAt)', 'lastEventAt')
        .groupBy('event.containerNumber');

      if (dataSource && typeof dataSource === 'string') {
        qb = qb.andWhere('event.dataSource = :ds', { ds: dataSource });
      }

      const countQb = eventRepository
        .createQueryBuilder('event')
        .select('COUNT(DISTINCT event.containerNumber)', 'cnt');
      if (dataSource && typeof dataSource === 'string') {
        countQb.andWhere('event.dataSource = :ds', { ds: dataSource });
      }
      const { cnt } = await countQb.getRawOne();
      const total = parseInt(String(cnt || 0), 10);

      const rows = await qb
        .orderBy('lastEventAt', 'DESC')
        .offset((Number(page) - 1) * Number(pageSize))
        .limit(Number(pageSize))
        .getRawMany();

      res.json({
        success: true,
        data: {
          items: rows.map((r: { dataSources?: unknown }) => ({
            ...r,
            dataSources: Array.isArray(r.dataSources) ? r.dataSources : (r.dataSources ? [r.dataSources] : []),
          })),
          total,
          page: Number(page),
          pageSize: Number(pageSize),
        },
      });
    } catch (error: unknown) {
      logger.error('[ExternalDataController] 获取货柜列表失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取货柜列表失败',
      });
    }
  };
}

export const externalDataController = new ExternalDataController();
