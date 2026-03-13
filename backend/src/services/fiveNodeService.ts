import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BizContainer } from '../entities/BizContainer';
import { InspectionRecord } from '../entities/InspectionRecord';
import { PortOperation } from '../entities/PortOperation';
import { TruckingTransport } from '../entities/TruckingTransport';
import { WarehouseOperation } from '../entities/WarehouseOperation';
import { EmptyReturn } from '../entities/EmptyReturn';

@Injectable()
export class FiveNodeService {
  constructor(
    @InjectRepository(BizContainer) private containerRepository: Repository<BizContainer>,
    @InjectRepository(InspectionRecord) private inspectionRepository: Repository<InspectionRecord>,
    @InjectRepository(PortOperation) private portOperationRepository: Repository<PortOperation>,
    @InjectRepository(TruckingTransport) private truckingRepository: Repository<TruckingTransport>,
    @InjectRepository(WarehouseOperation) private warehouseRepository: Repository<WarehouseOperation>,
    @InjectRepository(EmptyReturn) private emptyReturnRepository: Repository<EmptyReturn>,
  ) {}

  // 获取货柜的五节点聚合信息
  async getFiveNodeInfo(containerNumber: string) {
    // 获取货柜基本信息
    const container = await this.containerRepository.findOne({
      where: { containerNumber },
    });

    if (!container) {
      return null;
    }

    // 清关节点信息
    const customsInfo = await this.getCustomsInfo(containerNumber);
    
    // 拖卡节点信息
    const truckingInfo = await this.getTruckingInfo(containerNumber);
    
    // 卸柜节点信息
    const unloadingInfo = await this.getUnloadingInfo(containerNumber);
    
    // 还箱节点信息
    const emptyReturnInfo = await this.getEmptyReturnInfo(containerNumber);
    
    // 查验节点信息
    const inspectionInfo = await this.getInspectionInfo(containerNumber);

    // 预警信息
    const warnings = await this.calculateWarnings(container, {
      customs: customsInfo,
      trucking: truckingInfo,
      unloading: unloadingInfo,
      emptyReturn: emptyReturnInfo,
      inspection: inspectionInfo,
    });

    // 费用信息
    const costs = await this.calculateCosts(containerNumber);

    return {
      containerNumber: container.containerNumber,
      vessel: container.vessel,
      voyage: container.voyage,
      eta: container.eta,
      ata: container.ata,
      fiveNodes: {
        customs: customsInfo,
        trucking: truckingInfo,
        unloading: unloadingInfo,
        emptyReturn: emptyReturnInfo,
        inspection: inspectionInfo,
      },
      warnings,
      costs,
      statusSummary: this.getStatusSummary({
        customs: customsInfo,
        trucking: truckingInfo,
        unloading: unloadingInfo,
        emptyReturn: emptyReturnInfo,
        inspection: inspectionInfo,
      }),
    };
  }

  // 获取清关信息
  private async getCustomsInfo(containerNumber: string) {
    // 这里需要根据实际的清关数据结构来实现
    // 暂时返回模拟数据
    return {
      status: 'cleared',
      plannedDate: null,
      actualDate: null,
      estimatedDate: null,
      latestStatus: '已清关',
    };
  }

  // 获取拖卡信息
  private async getTruckingInfo(containerNumber: string) {
    const trucking = await this.truckingRepository.findOne({
      where: { containerNumber },
      order: { createdAt: 'DESC' },
    });

    return {
      status: trucking ? 'pickedUp' : 'notPickedUp',
      plannedDate: null,
      actualDate: trucking?.pickupTime || null,
      estimatedDate: null,
      latestStatus: trucking ? '已提柜' : '未提柜',
      pickupTime: trucking?.pickupTime || null,
      deliveryTime: trucking?.deliveryTime || null,
    };
  }

  // 获取卸柜信息
  private async getUnloadingInfo(containerNumber: string) {
    const warehouseOp = await this.warehouseRepository.findOne({
      where: { containerNumber },
      order: { createdAt: 'DESC' },
    });

    return {
      status: warehouseOp ? 'unloaded' : 'notUnloaded',
      plannedDate: null,
      actualDate: warehouseOp?.unloadingTime || null,
      estimatedDate: null,
      latestStatus: warehouseOp ? '已卸柜' : '未卸柜',
      unloadingTime: warehouseOp?.unloadingTime || null,
    };
  }

  // 获取还箱信息
  private async getEmptyReturnInfo(containerNumber: string) {
    const emptyReturn = await this.emptyReturnRepository.findOne({
      where: { containerNumber },
      order: { createdAt: 'DESC' },
    });

    return {
      status: emptyReturn ? 'returned' : 'notReturned',
      plannedDate: null,
      actualDate: emptyReturn?.returnTime || null,
      estimatedDate: null,
      latestStatus: emptyReturn ? '已还箱' : '未还箱',
      returnTime: emptyReturn?.returnTime || null,
    };
  }

  // 获取查验信息
  private async getInspectionInfo(containerNumber: string) {
    const inspection = await this.inspectionRepository.findOne({
      where: { containerNumber },
      relations: ['events'],
    });

    return {
      status: inspection ? 'inspected' : 'notInspected',
      plannedDate: inspection?.inspectionPlannedDate || null,
      actualDate: inspection?.inspectionDate || null,
      estimatedDate: null,
      latestStatus: inspection?.latestStatus || '未查验',
      customsClearanceStatus: inspection?.customsClearanceStatus || null,
    };
  }

  // 计算预警信息
  private async calculateWarnings(container: BizContainer, nodeInfo: any) {
    const warnings = [];

    // 清关预警
    if (!nodeInfo.customs.status || nodeInfo.customs.status === 'pending') {
      warnings.push({
        type: 'customs',
        level: 'warning',
        message: '清关状态未更新',
      });
    }

    // 拖卡预警
    if (!nodeInfo.trucking.status || nodeInfo.trucking.status === 'notPickedUp') {
      // 检查是否超过最晚提柜日
      const latestPickupDate = this.calculateLatestPickupDate(container);
      if (latestPickupDate && new Date() > latestPickupDate) {
        warnings.push({
          type: 'trucking',
          level: 'critical',
          message: '已超过最晚提柜日',
        });
      }
    }

    // 还箱预警
    if (nodeInfo.trucking.status === 'pickedUp' && !nodeInfo.emptyReturn.status) {
      // 检查是否超过最晚还箱日
      const latestReturnDate = this.calculateLatestReturnDate(container, nodeInfo.trucking.pickupTime);
      if (latestReturnDate && new Date() > latestReturnDate) {
        warnings.push({
          type: 'emptyReturn',
          level: 'critical',
          message: '已超过最晚还箱日',
        });
      }
    }

    // 查验预警
    if (nodeInfo.inspection.status === 'inspected' && 
        nodeInfo.inspection.customsClearanceStatus && 
        nodeInfo.inspection.customsClearanceStatus !== '全部放行') {
      warnings.push({
        type: 'inspection',
        level: 'warning',
        message: '查验尚未完成',
      });
    }

    return warnings;
  }

  // 计算费用信息
  private async calculateCosts(containerNumber: string) {
    // 这里需要与现有的滞港滞箱费用计算服务对接
    // 暂时返回模拟数据
    return {
      demurrage: 0,
      detention: 0,
      inspection: 0,
      total: 0,
    };
  }

  // 获取状态摘要
  private getStatusSummary(nodeInfo: any) {
    const statuses = [];

    if (nodeInfo.customs.status === 'cleared') {
      statuses.push('清关完成');
    } else {
      statuses.push('清关中');
    }

    if (nodeInfo.trucking.status === 'pickedUp') {
      statuses.push('已提柜');
    } else {
      statuses.push('未提柜');
    }

    if (nodeInfo.unloading.status === 'unloaded') {
      statuses.push('已卸柜');
    } else {
      statuses.push('未卸柜');
    }

    if (nodeInfo.emptyReturn.status === 'returned') {
      statuses.push('已还箱');
    } else {
      statuses.push('未还箱');
    }

    if (nodeInfo.inspection.status === 'inspected') {
      statuses.push('已查验');
    } else {
      statuses.push('未查验');
    }

    return statuses.join(' | ');
  }

  // 计算最晚提柜日
  private calculateLatestPickupDate(container: BizContainer): Date | null {
    if (!container.ata && !container.eta) {
      return null;
    }

    const baseDate = container.ata || container.eta;
    const freeDays = 7; // 假设免费期为7天
    const latestDate = new Date(baseDate);
    latestDate.setDate(latestDate.getDate() + freeDays);
    return latestDate;
  }

  // 计算最晚还箱日
  private calculateLatestReturnDate(container: BizContainer, pickupTime: Date | null): Date | null {
    if (!pickupTime) {
      return null;
    }

    const freeDays = 7; // 假设免费用箱期为7天
    const latestDate = new Date(pickupTime);
    latestDate.setDate(latestDate.getDate() + freeDays);
    return latestDate;
  }

  // 获取所有货柜的五节点信息（用于列表）
  async getAllFiveNodeInfo(filters?: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
  }) {
    const query = this.containerRepository.createQueryBuilder('container');

    if (filters) {
      if (filters.startDate) {
        query.andWhere('container.eta >= :startDate', { startDate: filters.startDate });
      }
      if (filters.endDate) {
        query.andWhere('container.eta <= :endDate', { endDate: filters.endDate });
      }
    }

    const containers = await query.limit(100).getMany();

    const results = await Promise.all(
      containers.map(async (container) => {
        const nodeInfo = await this.getFiveNodeInfo(container.containerNumber);
        return nodeInfo;
      })
    );

    return results.filter(Boolean);
  }
}
