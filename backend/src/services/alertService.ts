import { In } from 'typeorm';
import { Container } from '../entities/Container';
import { InspectionRecord } from '../entities/InspectionRecord';
import { PortOperation } from '../entities/PortOperation';
import { SeaFreight } from '../entities/SeaFreight';
import { TruckingTransport } from '../entities/TruckingTransport';
import { WarehouseOperation } from '../entities/WarehouseOperation';
import { EmptyReturn } from '../entities/EmptyReturn';
import { ContainerAlert, AlertLevel, AlertType } from '../entities/ContainerAlert';

export { AlertLevel, AlertType };
import { ExtFeituoStatusEvent } from '../entities/ExtFeituoStatusEvent';
import { AppDataSource } from '../database';
import { logger } from '../utils/logger';
import {
  calculateLogisticsStatus,
  isWmsConfirmed,
  SimplifiedStatus,
  type LogisticsStatusResult
} from '../utils/logisticsStatusMachine';
import { DateFilterBuilder } from './statistics/common/DateFilterBuilder';

/** 定时/单箱检查生成的规则类预警；每次检查前删除未解决记录再插入，避免重复 */
const AUTOMATED_ALERT_TYPES: AlertType[] = [
  AlertType.TRUCKING,
  AlertType.UNLOADING,
  AlertType.EMPTY_RETURN,
  AlertType.INSPECTION,
  AlertType.DEMURRAGE,
  AlertType.DETENTION,
  AlertType.ROLLOVER,
  AlertType.SHIPMENT_CHANGE
];

export interface AlertCheckContext {
  container: Container;
  portOperations: PortOperation[];
  seaFreight?: SeaFreight;
  trucking?: TruckingTransport;
  warehouse?: WarehouseOperation;
  emptyReturn?: EmptyReturn;
  logistics: LogisticsStatusResult;
  destPortOp: PortOperation | null;
}

export class AlertService {
  private containerRepository = AppDataSource.getRepository(Container);
  private inspectionRepository = AppDataSource.getRepository(InspectionRecord);
  private truckingRepository = AppDataSource.getRepository(TruckingTransport);
  private warehouseRepository = AppDataSource.getRepository(WarehouseOperation);
  private emptyReturnRepository = AppDataSource.getRepository(EmptyReturn);
  private alertRepository = AppDataSource.getRepository(ContainerAlert);
  private feituoStatusEventRepository = AppDataSource.getRepository(ExtFeituoStatusEvent);

  async checkContainerAlerts(containerNumber: string): Promise<ContainerAlert[]> {
    const ctx = await this.loadAlertCheckContext(containerNumber);
    if (!ctx) {
      return [];
    }

    await this.deleteUnresolvedAutomatedAlerts(containerNumber);

    const alerts: ContainerAlert[] = [];

    alerts.push(...(await this.checkCustomsAlerts(ctx.container)));
    alerts.push(...this.checkTruckingAlerts(ctx));
    alerts.push(...this.checkUnloadingAlerts(ctx));
    alerts.push(...this.checkEmptyReturnAlerts(ctx));
    alerts.push(...(await this.checkInspectionAlerts(ctx)));
    alerts.push(...this.checkDemurrageAlerts(ctx));
    alerts.push(...this.checkDetentionAlerts(ctx));
    alerts.push(...(await this.checkFeituoEvents(ctx.container)));

    for (const alert of alerts) {
      await this.alertRepository.save(alert);
    }

    return alerts;
  }

  async checkAllAlerts(): Promise<ContainerAlert[]> {
    logger.info('[AlertService] 开始批量预警检查');

    const containers = await this.containerRepository.find({
      select: ['containerNumber']
    });

    const allAlerts: ContainerAlert[] = [];

    for (const container of containers) {
      const containerAlerts = await this.checkContainerAlerts(container.containerNumber);
      allAlerts.push(...containerAlerts);
    }

    logger.info('[AlertService] 预警检查完成');
    return allAlerts;
  }

  /**
   * 加载与 calculateLogisticsStatus 一致的实体（6 参数），并附目的港最新一条港口操作。
   */
  async loadAlertCheckContext(containerNumber: string): Promise<AlertCheckContext | null> {
    const container = await this.containerRepository.findOne({
      where: { containerNumber },
      relations: ['seaFreight', 'portOperations']
    });

    if (!container) {
      return null;
    }

    const portOperations = [...(container.portOperations ?? [])].sort(
      (a, b) => (a.portSequence ?? 0) - (b.portSequence ?? 0)
    );

    const trucking = await this.truckingRepository.findOne({
      where: { containerNumber },
      order: { lastPickupDate: 'DESC' }
    });

    const warehouse = await this.warehouseRepository.findOne({
      where: { containerNumber },
      order: { updatedAt: 'DESC' }
    });

    const emptyReturn =
      (await this.emptyReturnRepository.findOne({
        where: { containerNumber }
      })) ?? undefined;

    const seaFreight = container.seaFreight ?? undefined;

    const logistics = calculateLogisticsStatus(
      container,
      portOperations,
      seaFreight,
      trucking ?? undefined,
      warehouse ?? undefined,
      emptyReturn
    );

    const destPortOp = this.getLatestDestinationPortOp(portOperations);

    return {
      container,
      portOperations,
      seaFreight,
      trucking: trucking ?? undefined,
      warehouse: warehouse ?? undefined,
      emptyReturn,
      logistics,
      destPortOp
    };
  }

  private getLatestDestinationPortOp(portOps: PortOperation[]): PortOperation | null {
    const dest = portOps.filter((po) => po.portType === 'destination');
    if (dest.length === 0) {
      return null;
    }
    return [...dest].sort((a, b) => (b.portSequence ?? 0) - (a.portSequence ?? 0))[0];
  }

  /** 与最晚提柜统计目标集一致：已到目的港（状态机 AT_PORT + destination）、尚未提柜/卸柜/还箱 */
  private isAtDestinationAwaitingPickup(ctx: AlertCheckContext): boolean {
    return (
      ctx.logistics.status === SimplifiedStatus.AT_PORT &&
      ctx.logistics.currentPortType === 'destination'
    );
  }

  private async deleteUnresolvedAutomatedAlerts(containerNumber: string): Promise<void> {
    await this.alertRepository.delete({
      containerNumber,
      resolved: false,
      type: In(AUTOMATED_ALERT_TYPES)
    });
  }

  private checkCustomsAlerts(_container: Container): Promise<ContainerAlert[]> {
    return Promise.resolve([]);
  }

  private checkTruckingAlerts(ctx: AlertCheckContext): ContainerAlert[] {
    const alerts: ContainerAlert[] = [];

    if (!this.isAtDestinationAwaitingPickup(ctx)) {
      return alerts;
    }

    const dest = ctx.destPortOp;
    if (!dest) {
      return alerts;
    }

    if (dest.lastFreeDateInvalid === true) {
      return alerts;
    }

    const today = DateFilterBuilder.toDayStart(new Date());
    const threeDaysLater = DateFilterBuilder.addDays(today, 3);
    const sevenDaysLater = DateFilterBuilder.addDays(today, 7);

    if (!dest.lastFreeDate) {
      alerts.push(
        this.alertRepository.create({
          containerNumber: ctx.container.containerNumber,
          type: AlertType.TRUCKING,
          level: AlertLevel.INFO,
          message: '已到目的港但最晚提柜日（last_free_date）未维护',
          resolved: false
        })
      );
      return alerts;
    }

    const lfd = DateFilterBuilder.toDayStart(new Date(dest.lastFreeDate));

    if (lfd < today) {
      const daysPast = Math.floor((today.getTime() - lfd.getTime()) / 86400000);
      alerts.push(
        this.alertRepository.create({
          containerNumber: ctx.container.containerNumber,
          type: AlertType.TRUCKING,
          level: AlertLevel.CRITICAL,
          message: `已超过最晚提柜日 ${daysPast} 天`,
          resolved: false
        })
      );
    } else if (lfd >= today && lfd < threeDaysLater) {
      const daysUntil = Math.floor((lfd.getTime() - today.getTime()) / 86400000);
      alerts.push(
        this.alertRepository.create({
          containerNumber: ctx.container.containerNumber,
          type: AlertType.TRUCKING,
          level: AlertLevel.WARNING,
          message: `距离最晚提柜日还有 ${daysUntil} 天`,
          resolved: false
        })
      );
    } else if (lfd >= threeDaysLater && lfd < sevenDaysLater) {
      const daysUntil = Math.floor((lfd.getTime() - today.getTime()) / 86400000);
      alerts.push(
        this.alertRepository.create({
          containerNumber: ctx.container.containerNumber,
          type: AlertType.TRUCKING,
          level: AlertLevel.WARNING,
          message: `最晚提柜日将在 ${daysUntil} 天后到期（预警档）`,
          resolved: false
        })
      );
    }

    return alerts;
  }

  private checkUnloadingAlerts(ctx: AlertCheckContext): ContainerAlert[] {
    const alerts: ContainerAlert[] = [];

    if (ctx.logistics.status !== SimplifiedStatus.PICKED_UP) {
      return alerts;
    }

    const trucking = ctx.trucking;
    const warehouse = ctx.warehouse;

    if (!trucking?.pickupDate || isWmsConfirmed(warehouse)) {
      return alerts;
    }

    const pickupDate = new Date(trucking.pickupDate);
    const daysSincePickup = Math.ceil(
      (Date.now() - pickupDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSincePickup > 3) {
      alerts.push(
        this.alertRepository.create({
          containerNumber: ctx.container.containerNumber,
          type: AlertType.UNLOADING,
          level: AlertLevel.WARNING,
          message: `已提柜 ${daysSincePickup} 天但未卸柜（WMS 未确认）`,
          resolved: false
        })
      );
    }

    return alerts;
  }

  private checkEmptyReturnAlerts(ctx: AlertCheckContext): ContainerAlert[] {
    const alerts: ContainerAlert[] = [];

    if (ctx.logistics.status !== SimplifiedStatus.UNLOADED) {
      return alerts;
    }

    if (ctx.emptyReturn?.returnTime) {
      return alerts;
    }

    const deadline = this.resolveLastReturnDeadline(ctx);
    if (!deadline) {
      return alerts;
    }

    const today = DateFilterBuilder.toDayStart(new Date());
    const d = DateFilterBuilder.toDayStart(deadline);
    const daysUntil = Math.floor((d.getTime() - today.getTime()) / 86400000);

    if (daysUntil < 0) {
      alerts.push(
        this.alertRepository.create({
          containerNumber: ctx.container.containerNumber,
          type: AlertType.EMPTY_RETURN,
          level: AlertLevel.CRITICAL,
          message: `已超过最晚还箱日 ${Math.abs(daysUntil)} 天`,
          resolved: false
        })
      );
    } else if (daysUntil <= 2) {
      alerts.push(
        this.alertRepository.create({
          containerNumber: ctx.container.containerNumber,
          type: AlertType.EMPTY_RETURN,
          level: AlertLevel.WARNING,
          message: `距离最晚还箱日还有 ${daysUntil} 天`,
          resolved: false
        })
      );
    }

    return alerts;
  }

  private async checkInspectionAlerts(ctx: AlertCheckContext): Promise<ContainerAlert[]> {
    const alerts: ContainerAlert[] = [];

    if (ctx.logistics.status === SimplifiedStatus.RETURNED_EMPTY) {
      return alerts;
    }

    const insp = await this.inspectionRepository.findOne({
      where: { containerNumber: ctx.container.containerNumber }
    });

    if (!insp) {
      return alerts;
    }

    if (
      !insp.customsClearanceStatus ||
      insp.customsClearanceStatus === '全部放行' ||
      insp.customsClearanceStatus === '退运完成'
    ) {
      return alerts;
    }

    const inspectionDate = insp.inspectionDate || insp.inspectionNoticeDate;
    if (!inspectionDate) {
      return alerts;
    }

    const daysSinceInspection = Math.ceil(
      (Date.now() - new Date(inspectionDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceInspection > 7) {
      alerts.push(
        this.alertRepository.create({
          containerNumber: ctx.container.containerNumber,
          type: AlertType.INSPECTION,
          level: AlertLevel.CRITICAL,
          message: `查验已持续 ${daysSinceInspection} 天，仍未完成`,
          resolved: false
        })
      );
    } else if (daysSinceInspection > 3) {
      alerts.push(
        this.alertRepository.create({
          containerNumber: ctx.container.containerNumber,
          type: AlertType.INSPECTION,
          level: AlertLevel.WARNING,
          message: `查验已持续 ${daysSinceInspection} 天`,
          resolved: false
        })
      );
    }

    return alerts;
  }

  private checkDemurrageAlerts(ctx: AlertCheckContext): ContainerAlert[] {
    const alerts: ContainerAlert[] = [];

    if (!this.isAtDestinationAwaitingPickup(ctx)) {
      return alerts;
    }

    const dest = ctx.destPortOp;
    if (!dest?.lastFreeDate || dest.lastFreeDateInvalid === true) {
      return alerts;
    }

    const today = DateFilterBuilder.toDayStart(new Date());
    const lfd = DateFilterBuilder.toDayStart(new Date(dest.lastFreeDate));

    if (today <= lfd) {
      return alerts;
    }

    const daysOverdue = Math.floor((today.getTime() - lfd.getTime()) / 86400000);

    alerts.push(
      this.alertRepository.create({
        containerNumber: ctx.container.containerNumber,
        type: AlertType.DEMURRAGE,
        level: AlertLevel.WARNING,
        message: `已产生 ${daysOverdue} 天滞港费（超过最晚提柜日 last_free_date）`,
        resolved: false
      })
    );

    return alerts;
  }

  private checkDetentionAlerts(ctx: AlertCheckContext): ContainerAlert[] {
    const alerts: ContainerAlert[] = [];

    const ls = ctx.logistics.status;
    if (ls !== SimplifiedStatus.PICKED_UP && ls !== SimplifiedStatus.UNLOADED) {
      return alerts;
    }

    if (ctx.emptyReturn?.returnTime) {
      return alerts;
    }

    const pickup = ctx.trucking?.pickupDate;
    if (!pickup) {
      return alerts;
    }

    const deadline = this.resolveLastReturnDeadline(ctx);
    if (!deadline) {
      return alerts;
    }

    const today = DateFilterBuilder.toDayStart(new Date());
    const d = DateFilterBuilder.toDayStart(deadline);

    if (today <= d) {
      return alerts;
    }

    const daysOverdue = Math.floor((today.getTime() - d.getTime()) / 86400000);

    alerts.push(
      this.alertRepository.create({
        containerNumber: ctx.container.containerNumber,
        type: AlertType.DETENTION,
        level: AlertLevel.WARNING,
        message: `已产生 ${daysOverdue} 天滞箱费（超过最晚还箱日）`,
        resolved: false
      })
    );

    return alerts;
  }

  /**
   * 优先 process_empty_return.last_return_date；否则提柜日 + 7 天（与历史逻辑及排柜回退一致）。
   */
  private resolveLastReturnDeadline(ctx: AlertCheckContext): Date | null {
    const er = ctx.emptyReturn;
    if (er?.lastReturnDate) {
      return new Date(er.lastReturnDate);
    }
    if (ctx.trucking?.pickupDate) {
      return DateFilterBuilder.addDays(new Date(ctx.trucking.pickupDate), 7);
    }
    return null;
  }

  /** 写入 message 末尾，用于同一飞驼事件不重复插预警（含已解决记录） */
  private feituoEventRefTag(eventId: number): string {
    return `[feituo_event_id:${eventId}]`;
  }

  /** 是否已有带该事件 ref 的预警（任意解决状态），避免「已解决」后重新检查再插一条 */
  private async hasAlertWithFeituoRef(
    containerNumber: string,
    type: AlertType,
    refTag: string
  ): Promise<boolean> {
    const row = await this.alertRepository
      .createQueryBuilder('a')
      .where('a.containerNumber = :cn', { cn: containerNumber })
      .andWhere('a.type = :t', { t: type })
      .andWhere('a.message LIKE :ref', { ref: `%${refTag}%` })
      .getOne();
    return !!row;
  }

  private async checkFeituoEvents(container: Container): Promise<ContainerAlert[]> {
    const alerts: ContainerAlert[] = [];

    try {
      const feituoEvents = await this.feituoStatusEventRepository.find({
        where: { containerNumber: container.containerNumber },
        order: { eventTime: 'DESC' },
        take: 20
      });

      if (feituoEvents.length === 0) {
        return alerts;
      }

      const dumpedEvents = feituoEvents.filter((event) => {
        const description = (
          event.descriptionCn ||
          event.descriptionEn ||
          event.eventDescriptionOrigin ||
          ''
        ).toLowerCase();
        logger.debug('[AlertService] Checking feituo event for dump', {
          containerNumber: event.containerNumber,
          eventCode: event.eventCode
        });
        return (
          description.includes('甩柜') || description.includes('dumped') || event.eventCode === 'DUMP'
        );
      });

      if (dumpedEvents.length > 0) {
        const latestDumpedEvent = dumpedEvents[0];
        const description =
          latestDumpedEvent.descriptionCn ||
          latestDumpedEvent.descriptionEn ||
          latestDumpedEvent.eventDescriptionOrigin ||
          '甩柜';

        const refTag = this.feituoEventRefTag(latestDumpedEvent.id);
        const skipByRef = await this.hasAlertWithFeituoRef(
          container.containerNumber,
          AlertType.ROLLOVER,
          refTag
        );
        const legacyMsg = `甩柜事件: ${description}`;
        const skipLegacyResolved =
          !skipByRef &&
          !!(await this.alertRepository.findOne({
            where: {
              containerNumber: container.containerNumber,
              type: AlertType.ROLLOVER,
              resolved: true,
              message: legacyMsg
            }
          }));
        if (!skipByRef && !skipLegacyResolved) {
          alerts.push(
            this.alertRepository.create({
              containerNumber: container.containerNumber,
              type: AlertType.ROLLOVER,
              level: AlertLevel.CRITICAL,
              message: `${legacyMsg} ${refTag}`,
              resolved: false
            })
          );
        }
      }

      const importantEvents = feituoEvents.filter((event) => {
        const description = (
          event.descriptionCn ||
          event.descriptionEn ||
          event.eventDescriptionOrigin ||
          ''
        ).toLowerCase();
        return (
          (description.includes('船名') && description.includes('变更')) ||
          (description.includes('voyage') && description.includes('change')) ||
          (description.includes('vessel') && description.includes('change'))
        );
      });

      if (importantEvents.length > 0) {
        const latestEvent = importantEvents[0];
        const description =
          latestEvent.descriptionCn ||
          latestEvent.descriptionEn ||
          latestEvent.eventDescriptionOrigin ||
          '船舶信息变更';

        const refTag = this.feituoEventRefTag(latestEvent.id);
        const skipDup = await this.hasAlertWithFeituoRef(
          container.containerNumber,
          AlertType.SHIPMENT_CHANGE,
          refTag
        );
        if (!skipDup) {
          alerts.push(
            this.alertRepository.create({
              containerNumber: container.containerNumber,
              type: AlertType.SHIPMENT_CHANGE,
              level: AlertLevel.WARNING,
              message: `船舶信息变更: ${description} ${refTag}`,
              resolved: false
            })
          );
        }
      }
    } catch (error) {
      logger.error('[AlertService] 检查飞驼事件失败', error);
    }

    return alerts;
  }

  async getContainerAlerts(containerNumber: string): Promise<ContainerAlert[]> {
    return this.alertRepository.find({
      where: { containerNumber },
      order: { createdAt: 'DESC' }
    });
  }

  async getAllAlerts(filters?: {
    level?: AlertLevel;
    type?: AlertType;
    resolved?: boolean;
  }): Promise<ContainerAlert[]> {
    const query = this.alertRepository.createQueryBuilder('alert');

    if (filters) {
      if (filters.level) {
        query.andWhere('alert.level = :level', { level: filters.level });
      }
      if (filters.type) {
        query.andWhere('alert.type = :type', { type: filters.type });
      }
      if (filters.resolved !== undefined) {
        query.andWhere('alert.resolved = :resolved', { resolved: filters.resolved });
      }
    }

    return query.orderBy('alert.createdAt', 'DESC').getMany();
  }

  async acknowledgeAlert(alertId: number, _userId: string): Promise<boolean> {
    try {
      const alert = await this.alertRepository.findOne({ where: { id: alertId } });
      if (!alert) {
        return false;
      }

      return true;
    } catch (error) {
      logger.error('[AlertService] 确认预警失败', error);
      return false;
    }
  }

  async resolveAlert(alertId: number, userId: string): Promise<boolean> {
    try {
      const alert = await this.alertRepository.findOne({ where: { id: alertId } });
      if (!alert) {
        return false;
      }

      alert.resolved = true;
      alert.resolvedBy = userId || 'system';
      alert.resolvedAt = new Date();

      await this.alertRepository.save(alert);
      return true;
    } catch (error) {
      logger.error('[AlertService] 解决预警失败', error);
      return false;
    }
  }
}
