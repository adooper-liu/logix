import { Repository } from 'typeorm';
import { AppDataSource } from '../database';
import { Container } from '../entities/Container';
import { InspectionRecord } from '../entities/InspectionRecord';
import { PortOperation } from '../entities/PortOperation';
import { TruckingTransport } from '../entities/TruckingTransport';
import { WarehouseOperation } from '../entities/WarehouseOperation';
import { EmptyReturn } from '../entities/EmptyReturn';

const DEST_PORT = 'destination';

export class FiveNodeService {
  private containerRepository: Repository<Container>;
  private inspectionRepository: Repository<InspectionRecord>;
  private portOperationRepository: Repository<PortOperation>;
  private truckingRepository: Repository<TruckingTransport>;
  private warehouseRepository: Repository<WarehouseOperation>;
  private emptyReturnRepository: Repository<EmptyReturn>;

  constructor() {
    this.containerRepository = AppDataSource.getRepository(Container);
    this.inspectionRepository = AppDataSource.getRepository(InspectionRecord);
    this.portOperationRepository = AppDataSource.getRepository(PortOperation);
    this.truckingRepository = AppDataSource.getRepository(TruckingTransport);
    this.warehouseRepository = AppDataSource.getRepository(WarehouseOperation);
    this.emptyReturnRepository = AppDataSource.getRepository(EmptyReturn);
  }

  /** 目的港港口操作（ETA/ATA、清关计划/实际等） */
  private async getDestinationPortOperation(containerNumber: string): Promise<PortOperation | null> {
    return this.portOperationRepository.findOne({
      where: { containerNumber, portType: DEST_PORT },
      order: { portSequence: 'DESC' },
    });
  }

  // 获取货柜的五节点聚合信息
  async getFiveNodeInfo(containerNumber: string) {
    // 获取货柜基本信息
    const container = await this.containerRepository.findOne({
      where: { containerNumber },
      relations: ['seaFreight'],
    });

    if (!container) {
      return null;
    }

    const destPort = await this.getDestinationPortOperation(containerNumber);

    // 清关节点信息
    const customsInfo = await this.getCustomsInfo(destPort);
    
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

    const sf = container.seaFreight;
    return {
      containerNumber: container.containerNumber,
      vessel: sf?.vesselName ?? null,
      voyage: sf?.voyageNumber ?? null,
      eta: destPort?.eta ?? sf?.eta ?? null,
      ata: destPort?.ata ?? sf?.ata ?? null,
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

  // 获取清关信息（目的港 process_port_operations）
  private async getCustomsInfo(destPort: PortOperation | null) {
    const planned = destPort?.plannedCustomsDate ?? null;
    const actual = destPort?.actualCustomsDate ?? null;
    const cleared = !!actual;
    const customsStatus = destPort?.customsStatus?.trim();
    return {
      status: cleared ? 'cleared' : 'pending',
      plannedDate: planned,
      actualDate: actual,
      estimatedDate: null,
      latestStatus: customsStatus || (cleared ? '已清关' : '待清关'),
    };
  }

  // 获取拖卡信息
  private async getTruckingInfo(containerNumber: string) {
    const trucking = await this.truckingRepository.findOne({
      where: { containerNumber },
      order: { createdAt: 'DESC' },
    });

    const pickup = trucking?.pickupDate ?? null;
    return {
      status: pickup ? 'pickedUp' : 'notPickedUp',
      plannedDate: trucking?.plannedPickupDate ?? null,
      actualDate: pickup,
      estimatedDate: null,
      latestStatus: pickup ? '已提柜' : '未提柜',
      pickupTime: pickup,
      deliveryTime: trucking?.deliveryDate ?? null,
    };
  }

  // 获取卸柜信息
  private async getUnloadingInfo(containerNumber: string) {
    const warehouseOp = await this.warehouseRepository.findOne({
      where: { containerNumber },
      order: { createdAt: 'DESC' },
    });

    const unload = warehouseOp?.unloadDate ?? null;
    return {
      status: unload ? 'unloaded' : 'notUnloaded',
      plannedDate: warehouseOp?.plannedUnloadDate ?? null,
      actualDate: unload,
      estimatedDate: null,
      latestStatus: unload ? '已卸柜' : '未卸柜',
      unloadingTime: unload,
    };
  }

  // 获取还箱信息
  private async getEmptyReturnInfo(containerNumber: string) {
    const emptyReturn = await this.emptyReturnRepository.findOne({
      where: { containerNumber },
      order: { createdAt: 'DESC' },
    });

    const returned = !!emptyReturn?.returnTime;
    return {
      status: returned ? 'returned' : 'notReturned',
      plannedDate: emptyReturn?.plannedReturnDate ?? null,
      actualDate: emptyReturn?.returnTime ?? null,
      estimatedDate: null,
      latestStatus: returned ? '已还箱' : '未还箱',
      returnTime: emptyReturn?.returnTime ?? null,
    };
  }

  // 获取查验信息
  private async getInspectionInfo(containerNumber: string) {
    const inspection = await this.inspectionRepository.findOne({
      where: { containerNumber },
      relations: ['events'],
    });

    const inspected = !!inspection?.inspectionDate;
    return {
      status: inspected ? 'inspected' : 'notInspected',
      plannedDate: inspection?.inspectionPlannedDate || null,
      actualDate: inspection?.inspectionDate || null,
      estimatedDate: null,
      latestStatus: inspection?.latestStatus || '未查验',
      customsClearanceStatus: inspection?.customsClearanceStatus || null,
    };
  }

  // 计算预警信息
  private async calculateWarnings(container: Container, nodeInfo: any) {
    const warnings = [];

    // 清关预警：有计划清关日且已过期、尚无实际清关日
    const customs = nodeInfo.customs;
    if (
      customs.plannedDate &&
      !customs.actualDate &&
      new Date(customs.plannedDate) < new Date(new Date().toDateString())
    ) {
      warnings.push({
        type: 'customs',
        level: 'warning',
        message: '清关计划日期已过，尚未完成',
      });
    }

    // 拖卡预警
    if (!nodeInfo.trucking.status || nodeInfo.trucking.status === 'notPickedUp') {
      // 检查是否超过最晚提柜日
      const latestPickupDate = await this.calculateLatestPickupDate(container);
      if (latestPickupDate && new Date() > latestPickupDate) {
        warnings.push({
          type: 'trucking',
          level: 'critical',
          message: '已超过最晚提柜日',
        });
      }
    }

    // 还箱预警
    if (nodeInfo.trucking.status === 'pickedUp' && nodeInfo.emptyReturn.status !== 'returned') {
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

  // 计算最晚提柜日（目的港 ATA/ETA + 免费期，与业务简化一致）
  private async calculateLatestPickupDate(container: Container): Promise<Date | null> {
    const portOp = await this.getDestinationPortOperation(container.containerNumber);
    const baseDate = portOp?.ata || portOp?.eta;
    if (!baseDate) {
      return null;
    }

    const freeDays = 7; // 假设免费期为7天
    const latestDate = new Date(baseDate);
    latestDate.setDate(latestDate.getDate() + freeDays);
    return latestDate;
  }

  // 计算最晚还箱日
  private calculateLatestReturnDate(container: Container, pickupTime: Date | null): Date | null {
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
