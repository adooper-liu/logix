import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Container } from '../entities/Container';
import { InspectionRecord } from '../entities/InspectionRecord';
import { PortOperation } from '../entities/PortOperation';
import { TruckingTransport } from '../entities/TruckingTransport';
import { WarehouseOperation } from '../entities/WarehouseOperation';
import { EmptyReturn } from '../entities/EmptyReturn';

// 预警级别
export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

// 预警类型
export enum AlertType {
  CUSTOMS = 'customs',
  TRUCKING = 'trucking',
  UNLOADING = 'unloading',
  EMPTY_RETURN = 'emptyReturn',
  INSPECTION = 'inspection',
  DEMURRAGE = 'demurrage',
  DETENTION = 'detention',
}

// 预警接口
export interface Alert {
  id?: number;
  containerNumber: string;
  type: AlertType;
  level: AlertLevel;
  message: string;
  createdAt: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

@Injectable()
export class AlertService {
  constructor(
    @InjectRepository(Container) private containerRepository: Repository<Container>,
    @InjectRepository(InspectionRecord) private inspectionRepository: Repository<InspectionRecord>,
    @InjectRepository(PortOperation) private portOperationRepository: Repository<PortOperation>,
    @InjectRepository(TruckingTransport) private truckingRepository: Repository<TruckingTransport>,
    @InjectRepository(WarehouseOperation) private warehouseRepository: Repository<WarehouseOperation>,
    @InjectRepository(EmptyReturn) private emptyReturnRepository: Repository<EmptyReturn>,
  ) {}

  // 检查单个货柜的预警
  async checkContainerAlerts(containerNumber: string): Promise<Alert[]> {
    const container = await this.containerRepository.findOne({
      where: { containerNumber },
      relations: ['portOperations']
    });

    if (!container) {
      return [];
    }

    const alerts: Alert[] = [];

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

    return alerts;
  }

  // 检查所有货柜的预警
  async checkAllContainersAlerts(): Promise<Alert[]> {
    const containers = await this.containerRepository.find({
      relations: ['portOperations']
    });

    const allAlerts: Alert[] = [];

    for (const container of containers) {
      const containerAlerts = await this.checkContainerAlerts(container.containerNumber);
      allAlerts.push(...containerAlerts);
    }

    return allAlerts;
  }

  // 检查清关预警
  private async checkCustomsAlerts(container: Container): Promise<Alert[]> {
    const alerts: Alert[] = [];

    // 检查清关状态
    // 这里需要根据实际的清关数据结构来实现
    // 暂时返回模拟数据

    return alerts;
  }

  // 检查拖卡预警
  private async checkTruckingAlerts(container: Container): Promise<Alert[]> {
    const alerts: Alert[] = [];

    const trucking = await this.truckingRepository.findOne({
      where: { containerNumber: container.containerNumber },
      order: { createdAt: 'DESC' },
    });

    // 检查是否已提柜
    if (!trucking || !trucking.pickupTime) {
      // 计算最晚提柜日
      const latestPickupDate = this.calculateLatestPickupDate(container);
      if (latestPickupDate) {
        const daysUntilDeadline = Math.ceil((latestPickupDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilDeadline < 0) {
          alerts.push({
            containerNumber: container.containerNumber,
            type: AlertType.TRUCKING,
            level: AlertLevel.CRITICAL,
            message: `已超过最晚提柜日 ${Math.abs(daysUntilDeadline)} 天`,
            createdAt: new Date(),
            resolved: false,
          });
        } else if (daysUntilDeadline <= 2) {
          alerts.push({
            containerNumber: container.containerNumber,
            type: AlertType.TRUCKING,
            level: AlertLevel.WARNING,
            message: `距离最晚提柜日还有 ${daysUntilDeadline} 天`,
            createdAt: new Date(),
            resolved: false,
          });
        }
      }
    }

    return alerts;
  }

  // 检查卸柜预警
  private async checkUnloadingAlerts(container: Container): Promise<Alert[]> {
    const alerts: Alert[] = [];

    const trucking = await this.truckingRepository.findOne({
      where: { containerNumber: container.containerNumber },
      order: { createdAt: 'DESC' },
    });

    const warehouseOp = await this.warehouseRepository.findOne({
      where: { containerNumber: container.containerNumber },
      order: { createdAt: 'DESC' },
    });

    // 检查是否已提柜但未卸柜
    if (trucking && trucking.pickupTime && (!warehouseOp || !warehouseOp.unloadingTime)) {
      const pickupDate = new Date(trucking.pickupTime);
      const daysSincePickup = Math.ceil((new Date().getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSincePickup > 3) {
        alerts.push({
          containerNumber: container.containerNumber,
          type: AlertType.UNLOADING,
          level: AlertLevel.WARNING,
          message: `已提柜 ${daysSincePickup} 天但未卸柜`,
          createdAt: new Date(),
          resolved: false,
        });
      }
    }

    return alerts;
  }

  // 检查还箱预警
  private async checkEmptyReturnAlerts(container: Container): Promise<Alert[]> {
    const alerts: Alert[] = [];

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
    if ((trucking && trucking.pickupTime) && 
        (warehouseOp && warehouseOp.unloadingTime) && 
        (!emptyReturn || !emptyReturn.returnTime)) {
      
      const latestReturnDate = this.calculateLatestReturnDate(container, trucking.pickupTime);
      if (latestReturnDate) {
        const daysUntilDeadline = Math.ceil((latestReturnDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilDeadline < 0) {
          alerts.push({
            containerNumber: container.containerNumber,
            type: AlertType.EMPTY_RETURN,
            level: AlertLevel.CRITICAL,
            message: `已超过最晚还箱日 ${Math.abs(daysUntilDeadline)} 天`,
            createdAt: new Date(),
            resolved: false,
          });
        } else if (daysUntilDeadline <= 2) {
          alerts.push({
            containerNumber: container.containerNumber,
            type: AlertType.EMPTY_RETURN,
            level: AlertLevel.WARNING,
            message: `距离最晚还箱日还有 ${daysUntilDeadline} 天`,
            createdAt: new Date(),
            resolved: false,
          });
        }
      }
    }

    return alerts;
  }

  // 检查查验预警
  private async checkInspectionAlerts(container: Container): Promise<Alert[]> {
    const alerts: Alert[] = [];

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
            alerts.push({
              containerNumber: container.containerNumber,
              type: AlertType.INSPECTION,
              level: AlertLevel.CRITICAL,
              message: `查验已持续 ${daysSinceInspection} 天，仍未完成`,
              createdAt: new Date(),
              resolved: false,
            });
          } else if (daysSinceInspection > 3) {
            alerts.push({
              containerNumber: container.containerNumber,
              type: AlertType.INSPECTION,
              level: AlertLevel.WARNING,
              message: `查验已持续 ${daysSinceInspection} 天`,
              createdAt: new Date(),
              resolved: false,
            });
          }
        }
      }
    }

    return alerts;
  }

  // 检查滞港费预警
  private async checkDemurrageAlerts(container: Container): Promise<Alert[]> {
    const alerts: Alert[] = [];

    // 检查是否超过免费期
    const latestPickupDate = this.calculateLatestPickupDate(container);
    if (latestPickupDate) {
      const daysOverdue = Math.ceil((new Date().getTime() - latestPickupDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysOverdue > 0) {
        alerts.push({
          containerNumber: container.containerNumber,
          type: AlertType.DEMURRAGE,
          level: AlertLevel.WARNING,
          message: `已产生 ${daysOverdue} 天滞港费`,
          createdAt: new Date(),
          resolved: false,
        });
      }
    }

    return alerts;
  }

  // 检查滞箱费预警
  private async checkDetentionAlerts(container: Container): Promise<Alert[]> {
    const alerts: Alert[] = [];

    const trucking = await this.truckingRepository.findOne({
      where: { containerNumber: container.containerNumber },
      order: { createdAt: 'DESC' },
    });

    if (trucking && trucking.pickupTime) {
      const latestReturnDate = this.calculateLatestReturnDate(container, trucking.pickupTime);
      if (latestReturnDate) {
        const daysOverdue = Math.ceil((new Date().getTime() - latestReturnDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysOverdue > 0) {
          alerts.push({
            containerNumber: container.containerNumber,
            type: AlertType.DETENTION,
            level: AlertLevel.WARNING,
            message: `已产生 ${daysOverdue} 天滞箱费`,
            createdAt: new Date(),
            resolved: false,
          });
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
  async getContainerAlerts(containerNumber: string): Promise<Alert[]> {
    return this.checkContainerAlerts(containerNumber);
  }

  // 获取所有预警列表
  async getAllAlerts(filters?: {
    level?: AlertLevel;
    type?: AlertType;
    resolved?: boolean;
  }): Promise<Alert[]> {
    const allAlerts = await this.checkAllContainersAlerts();

    // 应用过滤条件
    if (filters) {
      return allAlerts.filter(alert => {
        if (filters.level && alert.level !== filters.level) return false;
        if (filters.type && alert.type !== filters.type) return false;
        if (filters.resolved !== undefined && alert.resolved !== filters.resolved) return false;
        return true;
      });
    }

    return allAlerts;
  }

  // 解决预警
  async resolveAlert(alertId: number): Promise<boolean> {
    // 这里需要实现预警的持久化和状态更新
    // 暂时返回true表示成功
    return true;
  }
}
