import { Repository } from 'typeorm';
import { Container } from '../entities/Container';
import { PortOperation } from '../entities/PortOperation';
import { SeaFreight } from '../entities/SeaFreight';
import { TruckingTransport } from '../entities/TruckingTransport';
import { WarehouseOperation } from '../entities/WarehouseOperation';
import { EmptyReturn } from '../entities/EmptyReturn';
import { AppDataSource } from '../database';
import { logger } from '../utils/logger';
import { calculateLogisticsStatus } from '../utils/logisticsStatusMachine';

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
        truckingTransport,
        warehouseOperation,
        emptyReturn
      );

      // 如果状态需要更新
      if (result.status !== container.logisticsStatus) {
        await this.containerRepository.update(
          { containerNumber },
          { logisticsStatus: result.status }
        );
        logger.info(
          `[StatusUpdate] ${containerNumber}: ${container.logisticsStatus} -> ${result.status}`
        );
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`更新货柜 ${containerNumber} 状态失败`, error);
      return false;
    }
  }

  /**
   * 批量更新状态
   * @param limit 每次更新的数量限制
   * @returns 更新的数量
   */
  async batchUpdateStatuses(limit: number = 1000): Promise<number> {
    logger.info(`[StatusUpdate] 开始批量更新状态，限制 ${limit} 条`);

    try {
      const containers = await this.containerRepository.find({
        take: limit,
        relations: ['seaFreight'] // 需通过关联取海运信息，SeaFreight 表无 container_number
      });

      let updatedCount = 0;

      for (const container of containers) {
        const seaFreight = container.seaFreight ?? null;

        // 获取其余相关数据
        const [portOperations, truckingTransport, warehouseOperation, emptyReturn] =
          await Promise.all([
            this.portOperationRepository.find({
              where: { containerNumber: container.containerNumber },
              order: { portSequence: 'ASC' }
            }),
            this.truckingTransportRepository.findOne({ where: { containerNumber: container.containerNumber } }),
            this.warehouseOperationRepository.findOne({ where: { containerNumber: container.containerNumber } }),
            this.emptyReturnRepository.findOne({ where: { containerNumber: container.containerNumber } })
          ]);

        // 使用状态机计算状态
        const result = calculateLogisticsStatus(
          container,
          portOperations,
          seaFreight,
          truckingTransport,
          warehouseOperation,
          emptyReturn
        );

        // 如果状态需要更新
        if (result.status !== container.logisticsStatus) {
          await this.containerRepository.update(
            { containerNumber: container.containerNumber },
            { logisticsStatus: result.status }
          );
          updatedCount++;
          logger.debug(
            `[StatusUpdate] ${container.containerNumber}: ${container.logisticsStatus} -> ${result.status}`
          );
        }
      }

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

}
