import { Container } from '../entities/Container';
import { InspectionRecord } from '../entities/InspectionRecord';
import { PortOperation } from '../entities/PortOperation';
import { TruckingTransport } from '../entities/TruckingTransport';
import { WarehouseOperation } from '../entities/WarehouseOperation';
import { EmptyReturn } from '../entities/EmptyReturn';
import { ContainerAlert, AlertLevel, AlertType } from '../entities/ContainerAlert';
import { AppDataSource } from '../database';
import { logger } from '../utils/logger';

export class AlertService {
  private containerRepository = AppDataSource.getRepository(Container);
  private inspectionRepository = AppDataSource.getRepository(InspectionRecord);
  private portOperationRepository = AppDataSource.getRepository(PortOperation);
  private truckingRepository = AppDataSource.getRepository(TruckingTransport);
  private warehouseRepository = AppDataSource.getRepository(WarehouseOperation);
  private emptyReturnRepository = AppDataSource.getRepository(EmptyReturn);
  private alertRepository = AppDataSource.getRepository(ContainerAlert);

  // 检查单个货柜的预警
  async checkContainerAlerts(containerNumber: string): Promise<ContainerAlert[]> {
    const container = await this.containerRepository.findOne({
      where: { containerNumber },
      relations: ['portOperations']
    });

    if (!container) {
      return [];
    }

    const alerts: ContainerAlert[] = [];

    // 检查清关预警
    alerts.push(...await this.checkCustomsAlerts(container));

    // 检查拖卡预警
    alerts.push(...await this.checkTruckingAlerts(container));

    // 检查卸柜预警
    alerts.push(...await this.checkUnloadingAlerts(container));

    // 检查还箱预警
    alerts.push(...await this.checkEmptyReturnAlerts(container));

    // 检查查验预警
    alerts.push(...await this.checkInspectionAlerts(container));

    // 检查滞港费预警
    alerts.push(...await this.checkDemurrageAlerts(container));

    // 检查滞箱费预警
    alerts.push(...await this.checkDetentionAlerts(container));

    // 保存预警到数据库
    for (const alert of alerts) {
      await this.alertRepository.save(alert);
    }

    return alerts;
  }

  // 检查所有货柜的预警
  async checkAllAlerts(): Promise<ContainerAlert[]> {
    logger.info('[AlertService] 开始批量预警检查');
    
    const containers = await this.containerRepository.find({
      relations: ['portOperations']
    });

    const allAlerts: ContainerAlert[] = [];

    for (const container of containers) {
      const containerAlerts = await this.checkContainerAlerts(container.containerNumber);
      allAlerts.push(...containerAlerts);
    }

    logger.info('[AlertService] 预警检查完成');
    return allAlerts;
  }

  // 检查清关预警
  private async checkCustomsAlerts(container: Container): Promise<ContainerAlert[]> {
    const alerts: ContainerAlert[] = [];

    // 检查清关状态
    // 这里需要根据实际的清关数据结构来实现
    // 暂时返回模拟数据

    return alerts;
  }

  // 检查拖卡预警
  private async checkTruckingAlerts(container: Container): Promise<ContainerAlert[]> {
    const alerts: ContainerAlert[] = [];

    const trucking = await this.truckingRepository.findOne({
      where: { containerNumber: container.containerNumber },
      order: { createdAt: 'DESC' },
    });

    // 检查是否已提柜
    if (!trucking || !trucking.pickupDate) {
      // 计算最晚提柜日
      const latestPickupDate = this.calculateLatestPickupDate(container);
      if (latestPickupDate) {
        const daysUntilDeadline = Math.ceil((latestPickupDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilDeadline < 0) {
          alerts.push(this.alertRepository.create({
            containerNumber: container.containerNumber,
            type: AlertType.TRUCKING,
            level: AlertLevel.CRITICAL,
            message: `已超过最晚提柜日 ${Math.abs(daysUntilDeadline)} 天`,
            resolved: false,
          }));
        } else if (daysUntilDeadline <= 2) {
          alerts.push(this.alertRepository.create({
            containerNumber: container.containerNumber,
            type: AlertType.TRUCKING,
            level: AlertLevel.WARNING,
            message: `距离最晚提柜日还有 ${daysUntilDeadline} 天`,
            resolved: false,
          }));
        }
      }
    }

    return alerts;
  }

  // 检查卸柜预警
  private async checkUnloadingAlerts(container: Container): Promise<ContainerAlert[]> {
    const alerts: ContainerAlert[] = [];

    const trucking = await this.truckingRepository.findOne({
      where: { containerNumber: container.containerNumber },
      order: { createdAt: 'DESC' },
    });

    const warehouseOp = await this.warehouseRepository.findOne({
      where: { containerNumber: container.containerNumber },
      order: { createdAt: 'DESC' },
    });

    // 检查是否已提柜但未卸柜
    if (trucking && trucking.pickupDate && (!warehouseOp || !warehouseOp.unboxingTime)) {
      const pickupDate = new Date(trucking.pickupDate);
      const daysSincePickup = Math.ceil((new Date().getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSincePickup > 3) {
        alerts.push(this.alertRepository.create({
          containerNumber: container.containerNumber,
          type: AlertType.UNLOADING,
          level: AlertLevel.WARNING,
          message: `已提柜 ${daysSincePickup} 天但未卸柜`,
          resolved: false,
        }));
      }
    }

    return alerts;
  }

  // 检查还箱预警
  private async checkEmptyReturnAlerts(container: Container): Promise<ContainerAlert[]> {
    const alerts: ContainerAlert[] = [];

    const trucking = await this.truckingRepository.findOne({
      where: { containerNumber: container.containerNumber },
      order: { createdAt: 'DESC' },
    });

    const warehouseOp = await this.warehouseRepository.findOne({
      where: { containerNumber: container.containerNumber },
      order: { createdAt: 'DESC' },
    });

    const emptyReturn = await this.emptyReturnRepository.findOne({
      where: { containerNumber: container.containerNumber },
      order: { createdAt: 'DESC' },
    });

    // 检查是否已卸柜但未还箱
    if ((trucking && trucking.pickupDate) && 
        (warehouseOp && warehouseOp.unboxingTime) && 
        (!emptyReturn || !emptyReturn.returnTime)) {
      
      const latestReturnDate = this.calculateLatestReturnDate(container, trucking.pickupDate);
      if (latestReturnDate) {
        const daysUntilDeadline = Math.ceil((latestReturnDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilDeadline < 0) {
          alerts.push(this.alertRepository.create({
            containerNumber: container.containerNumber,
            type: AlertType.EMPTY_RETURN,
            level: AlertLevel.CRITICAL,
            message: `已超过最晚还箱日 ${Math.abs(daysUntilDeadline)} 天`,
            resolved: false,
          }));
        } else if (daysUntilDeadline <= 2) {
          alerts.push(this.alertRepository.create({
            containerNumber: container.containerNumber,
            type: AlertType.EMPTY_RETURN,
            level: AlertLevel.WARNING,
            message: `距离最晚还箱日还有 ${daysUntilDeadline} 天`,
            resolved: false,
          }));
        }
      }
    }

    return alerts;
  }

  // 检查查验预警
  private async checkInspectionAlerts(container: Container): Promise<ContainerAlert[]> {
    const alerts: ContainerAlert[] = [];

    const inspection = await this.inspectionRepository.findOne({
      where: { containerNumber: container.containerNumber },
    });

    // 检查查验状态
    if (inspection) {
      if (inspection.customsClearanceStatus && 
          inspection.customsClearanceStatus !== '全部放行' && 
          inspection.customsClearanceStatus !== '退运完成') {
        // 检查查验持续时间
        const inspectionDate = inspection.inspectionDate || inspection.inspectionNoticeDate;
        if (inspectionDate) {
          const daysSinceInspection = Math.ceil((new Date().getTime() - new Date(inspectionDate).getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysSinceInspection > 7) {
            alerts.push(this.alertRepository.create({
              containerNumber: container.containerNumber,
              type: AlertType.INSPECTION,
              level: AlertLevel.CRITICAL,
              message: `查验已持续 ${daysSinceInspection} 天，仍未完成`,
              resolved: false,
            }));
          } else if (daysSinceInspection > 3) {
            alerts.push(this.alertRepository.create({
              containerNumber: container.containerNumber,
              type: AlertType.INSPECTION,
              level: AlertLevel.WARNING,
              message: `查验已持续 ${daysSinceInspection} 天`,
              resolved: false,
            }));
          }
        }
      }
    }

    return alerts;
  }

  // 检查滞港费预警
  private async checkDemurrageAlerts(container: Container): Promise<ContainerAlert[]> {
    const alerts: ContainerAlert[] = [];

    // 检查是否超过免费期
    const latestPickupDate = this.calculateLatestPickupDate(container);
    if (latestPickupDate) {
      const daysOverdue = Math.ceil((new Date().getTime() - latestPickupDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysOverdue > 0) {
        alerts.push(this.alertRepository.create({
          containerNumber: container.containerNumber,
          type: AlertType.DEMURRAGE,
          level: AlertLevel.WARNING,
          message: `已产生 ${daysOverdue} 天滞港费`,
          resolved: false,
        }));
      }
    }

    return alerts;
  }

  // 检查滞箱费预警
  private async checkDetentionAlerts(container: Container): Promise<ContainerAlert[]> {
    const alerts: ContainerAlert[] = [];

    const trucking = await this.truckingRepository.findOne({
      where: { containerNumber: container.containerNumber },
      order: { createdAt: 'DESC' },
    });

    if (trucking && trucking.pickupDate) {
      const latestReturnDate = this.calculateLatestReturnDate(container, trucking.pickupDate);
      if (latestReturnDate) {
        const daysOverdue = Math.ceil((new Date().getTime() - latestReturnDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysOverdue > 0) {
          alerts.push(this.alertRepository.create({
            containerNumber: container.containerNumber,
            type: AlertType.DETENTION,
            level: AlertLevel.WARNING,
            message: `已产生 ${daysOverdue} 天滞箱费`,
            resolved: false,
          }));
        }
      }
    }

    return alerts;
  }

  // 计算最晚提柜日
  private calculateLatestPickupDate(container: Container): Date | null {
    // 从港口操作记录中获取ATA或ETA
    if (container.portOperations && container.portOperations.length > 0) {
      const destinationPort = container.portOperations.find(op => op.portType === 'destination');
      if (destinationPort) {
        const baseDate = destinationPort.ataDestPort || destinationPort.etaDestPort || destinationPort.etaCorrection;
        if (baseDate) {
          const freeDays = 7; // 假设免费期为7天
          const latestDate = new Date(baseDate);
          latestDate.setDate(latestDate.getDate() + freeDays);
          return latestDate;
        }
      }
    }
    return null;
  }

  // 计算最晚还箱日
  private calculateLatestReturnDate(container: Container, pickupTime: Date): Date | null {
    if (!pickupTime) {
      return null;
    }

    const freeDays = 7; // 假设免费用箱期为7天
    const latestDate = new Date(pickupTime);
    latestDate.setDate(latestDate.getDate() + freeDays);
    return latestDate;
  }

  // 获取货柜的预警列表
  async getContainerAlerts(containerNumber: string): Promise<ContainerAlert[]> {
    return this.alertRepository.find({
      where: { containerNumber },
      order: { createdAt: 'DESC' }
    });
  }

  // 获取所有预警列表
  async getAllAlerts(filters?: {
    level?: AlertLevel;
    type?: AlertType;
    resolved?: boolean;
  }): Promise<ContainerAlert[]> {
    const query = this.alertRepository.createQueryBuilder('alert');

    // 应用过滤条件
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

  // 确认预警
  async acknowledgeAlert(alertId: number, userId: string): Promise<boolean> {
    try {
      const alert = await this.alertRepository.findOne({ where: { id: alertId } });
      if (!alert) {
        return false;
      }

      // 这里可以添加确认逻辑，比如记录确认人等
      // 暂时只返回成功
      return true;
    } catch (error) {
      logger.error('[AlertService] 确认预警失败', error);
      return false;
    }
  }

  // 解决预警
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
