/**
 * 货柜导入控制器
 * Container Import Controller
 */

import { Request, Response } from 'express';
import { AppDataSource } from '../database';
import { Container } from '../entities/Container';
import { ReplenishmentOrder } from '../entities/ReplenishmentOrder';
import { SeaFreight } from '../entities/SeaFreight';
import { PortOperation } from '../entities/PortOperation';
import { TruckingTransport } from '../entities/TruckingTransport';
import { WarehouseOperation } from '../entities/WarehouseOperation';
import { EmptyReturn } from '../entities/EmptyReturn';
import { Repository } from 'typeorm';
import { logger } from '../utils/logger';

export class ImportController {
  private containerRepository: Repository<Container>;
  private orderRepository: Repository<ReplenishmentOrder>;
  private seaFreightRepository: Repository<SeaFreight>;
  private portOperationRepository: Repository<PortOperation>;
  private truckingRepository: Repository<TruckingTransport>;
  private warehouseRepository: Repository<WarehouseOperation>;
  private emptyReturnRepository: Repository<EmptyReturn>;

  constructor() {
    this.containerRepository = AppDataSource.getRepository(Container);
    this.orderRepository = AppDataSource.getRepository(ReplenishmentOrder);
    this.seaFreightRepository = AppDataSource.getRepository(SeaFreight);
    this.portOperationRepository = AppDataSource.getRepository(PortOperation);
    this.truckingRepository = AppDataSource.getRepository(TruckingTransport);
    this.warehouseRepository = AppDataSource.getRepository(WarehouseOperation);
    this.emptyReturnRepository = AppDataSource.getRepository(EmptyReturn);
  }

  /**
   * 导入Excel数据到数据库
   *
   * 数据结构:
   * {
   *   tables: {
   *     replenishment_orders: { ... },
   *     containers: { ... },
   *     sea_freight: { ... },
   *     port_operations: { ... },
   *     trucking_transports: { ... },
   *     warehouse_operations: { ... },
   *     empty_returns: { ... }
   *   }
   * }
   */
  async importExcelData(req: Request, res: Response): Promise<void> {
    const { tables } = req.body;

    if (!tables || typeof tables !== 'object') {
      res.status(400).json({
        success: false,
        message: '缺少tables参数'
      });
      return;
    }

    logger.info('[Import] 接收到导入请求:', JSON.stringify(tables, null, 2));

    const {
      replenishment_orders: orderData,
      containers: containerData,
      sea_freight: seaFreightData,
      port_operations: portData,
      trucking_transports: truckingData,
      warehouse_operations: warehouseData,
      empty_returns: returnData
    } = tables;

    try {
      // 使用事务确保数据一致性
      const queryRunner = AppDataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const resultData: any = {};

        // 1. 创建或更新备货单
        if (orderData?.orderNumber) {
          logger.info('[Import] 处理备货单:', orderData.orderNumber);

          const existingOrder = await queryRunner.manager.findOne(ReplenishmentOrder, {
            where: { orderNumber: orderData.orderNumber }
          });

          if (existingOrder) {
            Object.assign(existingOrder, orderData);
            await queryRunner.manager.save(existingOrder);
          } else {
            const order = queryRunner.manager.create(ReplenishmentOrder, orderData);
            await queryRunner.manager.save(order);
          }
          resultData.orderNumber = orderData.orderNumber;
        }

        // 2. 创建或更新货柜
        if (containerData?.containerNumber) {
          logger.info('[Import] 处理货柜:', containerData.containerNumber);

          const existingContainer = await queryRunner.manager.findOne(Container, {
            where: { containerNumber: containerData.containerNumber }
          });

          if (existingContainer) {
            Object.assign(existingContainer, containerData);
            await queryRunner.manager.save(existingContainer);
          } else {
            const container = queryRunner.manager.create(Container, {
              ...containerData,
              order_number: containerData.orderNumber,
              container_type_code: containerData.containerTypeCode
            });
            await queryRunner.manager.save(container);
          }
          resultData.containerNumber = containerData.containerNumber;
        }

        // 3. 创建或更新海运信息
        if (seaFreightData?.containerNumber || seaFreightData?.billOfLadingNumber) {
          logger.info('[Import] 处理海运信息:', seaFreightData);

          let existingSeaFreight;
          if (seaFreightData.billOfLadingNumber) {
            existingSeaFreight = await queryRunner.manager.findOne(SeaFreight, {
              where: { billOfLadingNumber: seaFreightData.billOfLadingNumber }
            });
          } else if (seaFreightData.containerNumber) {
            existingSeaFreight = await queryRunner.manager.findOne(SeaFreight, {
              where: { containerNumber: seaFreightData.containerNumber }
            });
          }

          if (existingSeaFreight) {
            Object.assign(existingSeaFreight, seaFreightData);
            await queryRunner.manager.save(existingSeaFreight);
          } else {
            const seaFreight = queryRunner.manager.create(SeaFreight, seaFreightData);
            await queryRunner.manager.save(seaFreight);
          }
        }

        // 4. 创建或更新港口操作
        if (portData?.containerNumber) {
          logger.info('[Import] 处理港口操作:', portData.containerNumber);

          const existingPort = await queryRunner.manager.findOne(PortOperation, {
            where: {
              containerNumber: portData.containerNumber,
              portType: portData.portType || 'destination'
            }
          });

          if (existingPort) {
            Object.assign(existingPort, portData);
            await queryRunner.manager.save(existingPort);
          } else {
            const portOperation = queryRunner.manager.create(PortOperation, {
              ...portData,
              id: `${portData.containerNumber}-${portData.portType || 'destination'}`,
              portType: portData.portType || 'destination',
              portSequence: portData.portSequence || 1
            });
            await queryRunner.manager.save(portOperation);
          }
        }

        // 5. 创建或更新拖卡运输
        if (truckingData?.containerNumber) {
          logger.info('[Import] 处理拖卡运输:', truckingData.containerNumber);

          const existingTrucking = await queryRunner.manager.findOne(TruckingTransport, {
            where: { containerNumber: truckingData.containerNumber }
          });

          if (existingTrucking) {
            Object.assign(existingTrucking, truckingData);
            await queryRunner.manager.save(existingTrucking);
          } else {
            const trucking = queryRunner.manager.create(TruckingTransport, truckingData);
            await queryRunner.manager.save(trucking);
          }
        }

        // 6. 创建或更新仓库操作
        if (warehouseData?.containerNumber) {
          logger.info('[Import] 处理仓库操作:', warehouseData.containerNumber);

          const existingWarehouse = await queryRunner.manager.findOne(WarehouseOperation, {
            where: { containerNumber: warehouseData.containerNumber }
          });

          if (existingWarehouse) {
            Object.assign(existingWarehouse, warehouseData);
            await queryRunner.manager.save(existingWarehouse);
          } else {
            const warehouse = queryRunner.manager.create(WarehouseOperation, warehouseData);
            await queryRunner.manager.save(warehouse);
          }
        }

        // 7. 创建或更新还空箱
        if (returnData?.containerNumber) {
          logger.info('[Import] 处理还空箱:', returnData.containerNumber);

          const existingReturn = await queryRunner.manager.findOne(EmptyReturn, {
            where: { containerNumber: returnData.containerNumber }
          });

          if (existingReturn) {
            Object.assign(existingReturn, returnData);
            await queryRunner.manager.save(existingReturn);
          } else {
            const emptyReturn = queryRunner.manager.create(EmptyReturn, returnData);
            await queryRunner.manager.save(emptyReturn);
          }
        }

        await queryRunner.commitTransaction();
        logger.info('[Import] 导入成功:', resultData);

        res.json({
          success: true,
          message: '数据导入成功',
          data: resultData
        });

      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }

    } catch (error: any) {
      logger.error('[Import] 导入失败:', error);

      // 判断是否是唯一约束冲突
      if (error.code === '23505') {
        res.status(409).json({
          success: false,
          message: '数据已存在，唯一约束冲突',
          error: error.detail || '未知字段',
        });
        return;
      }

      // 判断是否是外键约束失败
      if (error.code === '23503') {
        res.status(400).json({
          success: false,
          message: '外键约束失败，关联数据不存在',
          error: error.detail || '未知字段',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: '导入失败',
        error: error.message,
      });
    }
  }

  /**
   * 批量导入Excel数据到数据库
   *
   * 数据结构:
   * {
   *   batch: [
   *     {
   *       tables: {
   *         replenishment_orders: { ... },
   *         containers: { ... },
   *         sea_freight: { ... },
   *         port_operations: { ... },
   *         trucking_transports: { ... },
   *         warehouse_operations: { ... },
   *         empty_returns: { ... }
   *       }
   *     },
   *     ...
   *   ]
   * }
   */
  async importBatchExcelData(req: Request, res: Response): Promise<void> {
    const { batch } = req.body;

    if (!Array.isArray(batch)) {
      logger.error('[Import] batch参数必须是数组');
      res.status(400).json({
        success: false,
        message: 'batch参数必须是数组'
      });
      return;
    }

    // 检查数据库连接状态
    if (!AppDataSource.isInitialized) {
      logger.error('[Import] 数据库未初始化');
      res.status(503).json({
        success: false,
        message: '数据库连接未就绪，请稍后重试'
      });
      return;
    }

    logger.info(`[Import] 接收到批量导入请求，共 ${batch.length} 条记录`);

    const results: any[] = [];
    const errors: any[] = [];

    // 逐条处理，每条记录独立事务
    for (let i = 0; i < batch.length; i++) {
      const item = batch[i];

      if (!item || !item.tables) {
        errors.push({
          rowIndex: i + 1,
          error: '数据格式错误：缺少tables对象'
        });
        results.push({ success: false, rowIndex: i + 1 });
        continue;
      }

      const { tables } = item;
      let queryRunner;

      try {
        queryRunner = AppDataSource.createQueryRunner();

        // 等待连接可用
        await queryRunner.connect();

        // 检查连接状态
        if (!queryRunner.isTransactionActive) {
          await queryRunner.startTransaction();
        }

        try {
          const {
            replenishment_orders: orderData,
            containers: containerData,
            sea_freight: seaFreightData,
            port_operations: portData,
            trucking_transports: truckingData,
            warehouse_operations: warehouseData,
            empty_returns: returnData
          } = tables;

          const resultData: any = { rowIndex: i + 1 };

          // 1. 创建或更新备货单
          if (orderData?.orderNumber) {
            const existingOrder = await queryRunner.manager.findOne(ReplenishmentOrder, {
              where: { orderNumber: orderData.orderNumber }
            });

            if (existingOrder) {
              Object.assign(existingOrder, orderData);
              await queryRunner.manager.save(existingOrder);
            } else {
              const order = queryRunner.manager.create(ReplenishmentOrder, orderData);
              await queryRunner.manager.save(order);
            }
            resultData.orderNumber = orderData.orderNumber;
          }

          // 2. 创建或更新货柜
          if (containerData?.containerNumber) {
            const existingContainer = await queryRunner.manager.findOne(Container, {
              where: { containerNumber: containerData.containerNumber }
            });

            if (existingContainer) {
              Object.assign(existingContainer, containerData);
              await queryRunner.manager.save(existingContainer);
            } else {
              const container = queryRunner.manager.create(Container, {
                ...containerData,
                order_number: containerData.orderNumber, // 设置外键列的值
                container_type_code: containerData.containerTypeCode // 设置柜型外键列的值
              });
              await queryRunner.manager.save(container);
            }
            resultData.containerNumber = containerData.containerNumber;
          }

          // 3. 创建或更新海运信息
          if (seaFreightData?.containerNumber || seaFreightData?.billOfLadingNumber) {
            let existingSeaFreight;
            if (seaFreightData.billOfLadingNumber) {
              existingSeaFreight = await queryRunner.manager.findOne(SeaFreight, {
                where: { billOfLadingNumber: seaFreightData.billOfLadingNumber }
              });
            } else if (seaFreightData.containerNumber) {
              existingSeaFreight = await queryRunner.manager.findOne(SeaFreight, {
                where: { containerNumber: seaFreightData.containerNumber }
              });
            }

            if (existingSeaFreight) {
              Object.assign(existingSeaFreight, seaFreightData);
              await queryRunner.manager.save(existingSeaFreight);
            } else {
              const seaFreight = queryRunner.manager.create(SeaFreight, seaFreightData);
              await queryRunner.manager.save(seaFreight);
            }
          }

          // 4. 创建或更新港口操作
          if (portData?.containerNumber) {
            const existingPort = await queryRunner.manager.findOne(PortOperation, {
              where: {
                containerNumber: portData.containerNumber,
                portType: portData.portType || 'destination'
              }
            });

            if (existingPort) {
              Object.assign(existingPort, portData);
              await queryRunner.manager.save(existingPort);
            } else {
              const portOperation = queryRunner.manager.create(PortOperation, {
                ...portData,
                id: `${portData.containerNumber}-${portData.portType || 'destination'}`,
                portType: portData.portType || 'destination',
                portSequence: portData.portSequence || 1
              });
              await queryRunner.manager.save(portOperation);
            }
          }

          // 5. 创建或更新拖卡运输
          if (truckingData?.containerNumber) {
            const existingTrucking = await queryRunner.manager.findOne(TruckingTransport, {
              where: { containerNumber: truckingData.containerNumber }
            });

            if (existingTrucking) {
              Object.assign(existingTrucking, truckingData);
              await queryRunner.manager.save(existingTrucking);
            } else {
              const trucking = queryRunner.manager.create(TruckingTransport, truckingData);
              await queryRunner.manager.save(trucking);
            }
          }

          // 6. 创建或更新仓库操作
          if (warehouseData?.containerNumber) {
            const existingWarehouse = await queryRunner.manager.findOne(WarehouseOperation, {
              where: { containerNumber: warehouseData.containerNumber }
            });

            if (existingWarehouse) {
              Object.assign(existingWarehouse, warehouseData);
              await queryRunner.manager.save(existingWarehouse);
            } else {
              const warehouse = queryRunner.manager.create(WarehouseOperation, warehouseData);
              await queryRunner.manager.save(warehouse);
            }
          }

          // 7. 创建或更新还空箱
          if (returnData?.containerNumber) {
            const existingReturn = await queryRunner.manager.findOne(EmptyReturn, {
              where: { containerNumber: returnData.containerNumber }
            });

            if (existingReturn) {
              Object.assign(existingReturn, returnData);
              await queryRunner.manager.save(existingReturn);
            } else {
              const emptyReturn = queryRunner.manager.create(EmptyReturn, returnData);
              await queryRunner.manager.save(emptyReturn);
            }
          }

          await queryRunner.commitTransaction();
          results.push({ success: true, ...resultData });

        } catch (error: any) {
          await queryRunner.rollbackTransaction();
          logger.error(`[Import] 第 ${i + 1} 行导入失败:`, error);
          errors.push({
            rowIndex: i + 1,
            error: error.message || '未知错误'
          });
          results.push({ success: false, rowIndex: i + 1 });
        }
      } catch (error: any) {
        logger.error(`[Import] 第 ${i + 1} 行处理异常:`, error);
        errors.push({
          rowIndex: i + 1,
          error: error.message || '系统错误'
        });
        results.push({ success: false, rowIndex: i + 1 });
      } finally {
        if (queryRunner && !queryRunner.isReleased) {
          try {
            await queryRunner.release();
          } catch (releaseError) {
            logger.error(`[Import] 第 ${i + 1} 行释放连接失败:`, releaseError);
          }
        }
      }
    }

    logger.info(`[Import] 批量导入完成: 成功 ${results.length - errors.length} 条，失败 ${errors.length} 条`);

    res.json({
      success: true,
      message: `批量导入完成: 成功 ${results.length - errors.length} 条，失败 ${errors.length} 条`,
      data: {
        total: results.length,
        success: results.length - errors.length,
        failed: errors.length,
        results,
        errors
      }
    });
  }
}
