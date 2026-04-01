import { In, Repository } from 'typeorm';
import { Container } from '../entities/Container';
import { PortOperation } from '../entities/PortOperation';
import { SeaFreight } from '../entities/SeaFreight';
import { TruckingTransport } from '../entities/TruckingTransport';
import { WarehouseOperation } from '../entities/WarehouseOperation';
import { EmptyReturn } from '../entities/EmptyReturn';
import { AppDataSource } from '../database';
import { logger } from '../utils/logger';
import { calculateLogisticsStatus } from '../utils/logisticsStatusMachine';
import {
  buildGanttDerived,
  ganttDerivedSemanticEqual,
  type GanttDerivedPayload
} from '../utils/ganttDerivedBuilder';
import { auditLogService } from './auditLog.service';

/**
 * 货柜状态服务
 * 负责根据操作记录自动更新货柜的物流状态
 */
export class ContainerStatusService {
  private containerRepository: Repository<Container>;
  private portOperationRepository: Repository<PortOperation>;
  private seaFreightRepository: Repository<SeaFreight>;
  private truckingTransportRepository: Repository<TruckingTransport>;
  private warehouseOperationRepository: Repository<WarehouseOperation>;
  private emptyReturnRepository: Repository<EmptyReturn>;

  constructor() {
    this.containerRepository = AppDataSource.getRepository(Container);
    this.portOperationRepository = AppDataSource.getRepository(PortOperation);
    this.seaFreightRepository = AppDataSource.getRepository(SeaFreight);
    this.truckingTransportRepository = AppDataSource.getRepository(TruckingTransport);
    this.warehouseOperationRepository = AppDataSource.getRepository(WarehouseOperation);
    this.emptyReturnRepository = AppDataSource.getRepository(EmptyReturn);
  }

  /**
   * 更新单个货柜状态
   * @param containerNumber 货柜号
   * @returns 是否成功更新
   */
  async updateStatus(containerNumber: string): Promise<boolean> {
    try {
      const container = await this.containerRepository.findOne({
        where: { containerNumber },
        relations: ['seaFreight'] // 需通过关联取海运信息，SeaFreight 表无 container_number
      });

      if (!container) {
        logger.warn(`货柜 ${containerNumber} 不存在`);
        return false;
      }

      const seaFreight = container.seaFreight ?? null;

      // 获取其余相关数据
      const [portOperations, truckingTransport, warehouseOperation, emptyReturn] =
        await Promise.all([
          this.portOperationRepository.find({
            where: { containerNumber },
            order: { portSequence: 'ASC' }
          }),
          this.truckingTransportRepository.findOne({ where: { containerNumber } }),
          this.warehouseOperationRepository.findOne({ where: { containerNumber } }),
          this.emptyReturnRepository.findOne({ where: { containerNumber } })
        ]);

      // 使用状态机计算状态
      const result = calculateLogisticsStatus(
        container,
        portOperations,
        seaFreight,
        truckingTransport ?? undefined,
        warehouseOperation ?? undefined,
        emptyReturn ?? undefined
      );

      const ganttDerived = buildGanttDerived(
        portOperations,
        truckingTransport,
        warehouseOperation,
        emptyReturn
      );

      const statusChanged = result.status !== container.logisticsStatus;
      const prevGantt = container.ganttDerived as GanttDerivedPayload | null | undefined;
      const ganttChanged = !ganttDerivedSemanticEqual(prevGantt ?? null, ganttDerived);

      if (!statusChanged && !ganttChanged) {
        return false;
      }

      const newStatus = result.status;

      await this.containerRepository.update(
        { containerNumber },
        { logisticsStatus: newStatus, ganttDerived }
      );

      if (statusChanged) {
        const oldStatus = container.logisticsStatus;

        // 获取触发状态变更的关键字段
        const triggerFields: Record<string, { old?: unknown; new?: unknown }> = {};
        if (result.triggerFields) {
          for (const [field, value] of Object.entries(result.triggerFields)) {
            triggerFields[field] = { new: value };
          }
        }

        logger.info(
          `[StatusUpdate] ${containerNumber}: ${oldStatus} -> ${newStatus}, 触发字段: ${Object.keys(triggerFields).join(', ') || '无'}`
        );

        await auditLogService.logChange({
          sourceType: 'status_update',
          entityType: 'biz_containers',
          entityId: containerNumber,
          action: 'UPDATE',
          changedFields: {
            logistics_status: {
              old: oldStatus,
              new: newStatus
            },
            _triggerFields: {
              old: null,
              new: triggerFields
            },
            _statusCalculation: {
              old: null,
              new: {
                reason: result.reason || null,
                hasReturnTime: !!emptyReturn?.returnTime,
                hasWmsConfirm: !!warehouseOperation?.wmsConfirmDate,
                hasPickupDate: !!truckingTransport?.pickupDate,
                hasDestAta: portOperations.some((po) => po.portType === 'destination' && po.ata),
                hasTransitAta: portOperations.some((po) => po.portType === 'transit' && po.ata),
                hasShipmentDate: !!seaFreight?.shipmentDate
              }
            },
            ...(ganttChanged
              ? {
                  gantt_derived: {
                    old: prevGantt ?? null,
                    new: ganttDerived
                  }
                }
              : {})
          },
          remark: `状态机重算: ${oldStatus} → ${newStatus}`
        });
      } else if (ganttChanged) {
        logger.info(`[StatusUpdate] ${containerNumber}: gantt_derived 更新（物流状态未变）`);
        await auditLogService.logChange({
          sourceType: 'status_update',
          entityType: 'biz_containers',
          entityId: containerNumber,
          action: 'UPDATE',
          changedFields: {
            gantt_derived: {
              old: prevGantt ?? null,
              new: ganttDerived
            }
          },
          remark: '甘特派生字段重算（流程日期变更）'
        });
      }

      return true;
    } catch (error) {
      logger.error(`更新货柜 ${containerNumber} 状态失败`, error);
      return false;
    }
  }

  /**
   * 批量更新状态（优化版本 - 批量查询减少数据库往返）
   * @param limit 每次更新的数量限制
   * @returns 更新的数量
   */
  async batchUpdateStatuses(limit: number = 1000): Promise<number> {
    logger.info(`[StatusUpdate] 开始批量更新状态（优化版本），限制 ${limit} 条`);

    try {
      const containers = await this.containerRepository.find({
        take: limit,
        relations: ['seaFreight']
      });

      const containerNumbers = containers.map((c) => c.containerNumber);

      if (containerNumbers.length === 0) {
        logger.info('[StatusUpdate] 批量更新完成，无货柜需处理');
        return 0;
      }

      // 批量查询所有相关数据（减少数据库往返次数）
      const [allPortOperations, allTruckingTransports, allWarehouseOperations, allEmptyReturns] =
        await Promise.all([
          this.portOperationRepository.find({
            where: { containerNumber: In(containerNumbers) },
            order: { portSequence: 'ASC' }
          }),
          this.truckingTransportRepository.find({
            where: { containerNumber: In(containerNumbers) }
          }),
          this.warehouseOperationRepository.find({
            where: { containerNumber: In(containerNumbers) }
          }),
          this.emptyReturnRepository.find({
            where: { containerNumber: In(containerNumbers) }
          })
        ]);

      // 构建查找映射，提高查找效率
      const portOperationsMap = new Map<string, PortOperation[]>();
      const truckingTransportMap = new Map<string, TruckingTransport>();
      const warehouseOperationMap = new Map<string, WarehouseOperation>();
      const emptyReturnMap = new Map<string, EmptyReturn>();

      allPortOperations.forEach((po) => {
        if (!portOperationsMap.has(po.containerNumber)) {
          portOperationsMap.set(po.containerNumber, []);
        }
        portOperationsMap.get(po.containerNumber)!.push(po);
      });

      allTruckingTransports.forEach((tt) => {
        truckingTransportMap.set(tt.containerNumber, tt);
      });

      allWarehouseOperations.forEach((wo) => {
        warehouseOperationMap.set(wo.containerNumber, wo);
      });

      allEmptyReturns.forEach((er) => {
        emptyReturnMap.set(er.containerNumber, er);
      });

      const updatePromises: Promise<boolean>[] = [];

      for (const container of containers) {
        const seaFreight = container.seaFreight ?? null;
        const portOperations = portOperationsMap.get(container.containerNumber) || [];
        const truckingTransport = truckingTransportMap.get(container.containerNumber) || null;
        const warehouseOperation = warehouseOperationMap.get(container.containerNumber) || null;
        const emptyReturn = emptyReturnMap.get(container.containerNumber) || null;

        // 使用状态机计算状态
        const result = calculateLogisticsStatus(
          container,
          portOperations,
          seaFreight,
          truckingTransport ?? undefined,
          warehouseOperation ?? undefined,
          emptyReturn ?? undefined
        );

        const ganttDerived = buildGanttDerived(
          portOperations,
          truckingTransport,
          warehouseOperation,
          emptyReturn
        );
        const statusChanged = result.status !== container.logisticsStatus;
        const prevGantt = container.ganttDerived as GanttDerivedPayload | null | undefined;
        const ganttChanged = !ganttDerivedSemanticEqual(prevGantt ?? null, ganttDerived);

        if (statusChanged || ganttChanged) {
          updatePromises.push(
            this.containerRepository
              .update(
                { containerNumber: container.containerNumber },
                { logisticsStatus: result.status, ganttDerived }
              )
              .then(() => {
                logger.debug(
                  `[StatusUpdate] ${container.containerNumber}: status=${container.logisticsStatus}->${result.status}, gantt=${ganttChanged}`
                );
                return true;
              })
          );
        }
      }

      // 批量执行更新
      const updateResults = await Promise.all(updatePromises);
      const updatedCount = updateResults.filter(Boolean).length;

      logger.info(`[StatusUpdate] 批量更新完成，更新了 ${updatedCount} 条记录`);
      return updatedCount;
    } catch (error) {
      logger.error('[StatusUpdate] 批量更新失败', error);
      return 0;
    }
  }

  /**
   * 更新指定货柜的状态
   * @param containerNumbers 货柜号数组
   * @returns 更新的数量
   */
  async updateStatusesForContainers(containerNumbers: string[]): Promise<number> {
    logger.info(`[StatusUpdate] 更新 ${containerNumbers.length} 个货柜的状态`);

    let updatedCount = 0;

    for (const containerNumber of containerNumbers) {
      const updated = await this.updateStatus(containerNumber);
      if (updated) updatedCount++;
    }

    return updatedCount;
  }

  /**
   * 全表（或限量）重算 logistics_status + gantt_derived（含 gantt-v2 各节点日期）
   * 用于升级后手工回填；逐柜调用 updateStatus，与飞驼同步/导入写入规则一致
   */
  async rebuildGanttDerivedSnapshot(options?: { maxContainers?: number }): Promise<{
    processed: number;
    updatedCount: number;
  }> {
    const qb = this.containerRepository
      .createQueryBuilder('c')
      .select('c.containerNumber')
      .orderBy('c.containerNumber', 'ASC');

    if (options?.maxContainers != null && options.maxContainers > 0) {
      qb.take(options.maxContainers);
    }

    const rows = await qb.getMany();
    const numbers = rows.map((r) => r.containerNumber);
    let updatedCount = 0;

    for (const cn of numbers) {
      const updated = await this.updateStatus(cn);
      if (updated) updatedCount++;
    }

    logger.info(
      `[GanttDerived] rebuild snapshot: processed=${numbers.length}, updated=${updatedCount}`
    );
    return { processed: numbers.length, updatedCount };
  }
}
