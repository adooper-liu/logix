import { Container } from '../entities/Container';
import { SeaFreight } from '../entities/SeaFreight';
import { PortOperation } from '../entities/PortOperation';
import { TruckingTransport } from '../entities/TruckingTransport';
import { WarehouseOperation } from '../entities/WarehouseOperation';
import { EmptyReturn } from '../entities/EmptyReturn';
import { AppDataSource } from '../database';
import { logger } from '../utils/logger';

export class TimeService {
  private containerRepository = AppDataSource.getRepository(Container);
  private seaFreightRepository = AppDataSource.getRepository(SeaFreight);
  private portOperationRepository = AppDataSource.getRepository(PortOperation);
  private truckingRepository = AppDataSource.getRepository(TruckingTransport);
  private warehouseRepository = AppDataSource.getRepository(WarehouseOperation);
  private emptyReturnRepository = AppDataSource.getRepository(EmptyReturn);

  // 获取货柜时间预测
  async getContainerTimePrediction(containerNumber: string): Promise<any> {
    try {
      // 加载货柜及其关联实体
      const container = await this.containerRepository.findOne({
        where: { containerNumber },
        relations: ['seaFreight', 'portOperations']
      });

      if (!container) {
        return null;
      }

      // 加载拖卡、卸柜、还箱记录
      const trucking = await this.truckingRepository.findOne({
        where: { containerNumber },
        order: { createdAt: 'DESC' }
      });

      const warehouseOp = await this.warehouseRepository.findOne({
        where: { containerNumber },
        order: { createdAt: 'DESC' }
      });

      const emptyReturn = await this.emptyReturnRepository.findOne({
        where: { containerNumber },
        order: { createdAt: 'DESC' }
      });

      const dest = container.portOperations?.find(op => op.portType === 'destination');
      const sf = container.seaFreight;

      // 计算各个节点的预测时间（与前端 TimePredictionTab 字段对齐）
      const predictions = {
        containerNumber: container.containerNumber,
        currentStatus: this.getCurrentStatus(container, trucking, warehouseOp, emptyReturn),
        /** 目的港预计/实际到港（展示用） */
        eta: dest?.eta ?? sf?.eta ?? null,
        ata: dest?.ata ?? sf?.ata ?? null,
        estimatedTimes: {
          pickup: this.predictPickupTime(container, trucking),
          unloading: this.predictUnloadingTime(container, trucking, warehouseOp),
          return: this.predictReturnTime(container, trucking, warehouseOp, emptyReturn),
          completion: this.predictCompletionTime(container, trucking, warehouseOp, emptyReturn)
        },
        actualTimes: {
          pickup: trucking?.pickupDate ?? null,
          unloading: warehouseOp?.unloadDate ?? warehouseOp?.unboxingTime ?? null,
          return: emptyReturn?.returnTime ?? null
        }
      };

      return predictions;
    } catch (error) {
      logger.error('[TimeService] 获取时间预测失败', error);
      throw error;
    }
  }

  // 获取当前状态
  private getCurrentStatus(container: Container, trucking: any, warehouseOp: any, emptyReturn: any): string {
    if (emptyReturn?.returnTime) {
      return '已还箱';
    } else if (warehouseOp?.unloadDate || warehouseOp?.unboxingTime) {
      return '已卸柜';
    } else if (trucking?.pickupDate) {
      return '已提柜';
    } else if (container.portOperations) {
      const destinationPort = container.portOperations.find(op => op.portType === 'destination');
      if (destinationPort?.ata) {
        return '已到港';
      } else if (destinationPort?.eta) {
        return '在途';
      }
    }
    return '未知';
  }

  // 预测提柜时间
  private predictPickupTime(container: Container, trucking: any): Date | null {
    if (trucking?.pickupDate) {
      return new Date(trucking.pickupDate);
    }

    if (container.portOperations) {
      const destinationPort = container.portOperations.find(op => op.portType === 'destination');
      if (destinationPort?.ata) {
        const ata = new Date(destinationPort.ata);
        const predicted = new Date(ata);
        predicted.setDate(predicted.getDate() + 2); // 到港后2天提柜
        return predicted;
      } else if (destinationPort?.eta) {
        const eta = new Date(destinationPort.eta);
        const predicted = new Date(eta);
        predicted.setDate(predicted.getDate() + 2); // 到港后2天提柜
        return predicted;
      }
    }

    return null;
  }

  // 预测卸柜时间
  private predictUnloadingTime(container: Container, trucking: any, warehouseOp: any): Date | null {
    const doneUnload = warehouseOp?.unloadDate ?? warehouseOp?.unboxingTime;
    if (doneUnload) {
      return new Date(doneUnload);
    }

    if (trucking?.pickupDate) {
      const pickup = new Date(trucking.pickupDate);
      const predicted = new Date(pickup);
      predicted.setDate(predicted.getDate() + 1); // 提柜后1天卸柜
      return predicted;
    }

    const pickupPrediction = this.predictPickupTime(container, trucking);
    if (pickupPrediction) {
      const predicted = new Date(pickupPrediction);
      predicted.setDate(predicted.getDate() + 1); // 提柜后1天卸柜
      return predicted;
    }

    return null;
  }

  // 预测还箱时间
  private predictReturnTime(container: Container, trucking: any, warehouseOp: any, emptyReturn: any): Date | null {
    if (emptyReturn?.returnTime) {
      return new Date(emptyReturn.returnTime);
    }

    if (warehouseOp?.unboxingTime) {
      const unloading = new Date(warehouseOp.unboxingTime);
      const predicted = new Date(unloading);
      predicted.setDate(predicted.getDate() + 3); // 卸柜后3天还箱
      return predicted;
    }

    const unloadingPrediction = this.predictUnloadingTime(container, trucking, warehouseOp);
    if (unloadingPrediction) {
      const predicted = new Date(unloadingPrediction);
      predicted.setDate(predicted.getDate() + 3); // 卸柜后3天还箱
      return predicted;
    }

    return null;
  }

  // 预测完成时间
  private predictCompletionTime(container: Container, trucking: any, warehouseOp: any, emptyReturn: any): Date | null {
    return this.predictReturnTime(container, trucking, warehouseOp, emptyReturn);
  }
}
