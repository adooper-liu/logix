/**
 * 操作管理控制器
 * Operation Management Controller
 * 处理港口操作、拖卡运输、仓库操作和还空箱的创建/更新
 */

import { Request, Response } from 'express';
import { AppDataSource } from '../database';
import { PortOperation } from '../entities/PortOperation';
import { TruckingTransport } from '../entities/TruckingTransport';
import { WarehouseOperation } from '../entities/WarehouseOperation';
import { EmptyReturn } from '../entities/EmptyReturn';
import { ContainerStatusService } from '../services/containerStatus.service';
import { logger } from '../utils/logger';
import { snakeToCamel } from '../utils/snakeToCamel';
import { PICKUP_DATE_SOURCE } from '../constants/pickupDateSource';

export class OperationController {
  private portOperationRepository = AppDataSource.getRepository(PortOperation);
  private truckingTransportRepository = AppDataSource.getRepository(TruckingTransport);
  private warehouseOperationRepository = AppDataSource.getRepository(WarehouseOperation);
  private emptyReturnRepository = AppDataSource.getRepository(EmptyReturn);
  private containerStatusService = new ContainerStatusService();

  /**
   * POST /api/v1/operations/port
   * 创建港口操作
   */
  createPortOperation = async (req: Request, res: Response): Promise<void> => {
    try {
      const portData = snakeToCamel(req.body);
      const { containerNumber } = portData;

      if (!containerNumber) {
        res.status(400).json({ success: false, message: '缺少货柜号' });
        return;
      }

      const portOperation = this.portOperationRepository.create(portData);
      await this.portOperationRepository.save(portOperation);

      // 自动更新货柜状态
      try {
        await this.containerStatusService.updateStatus(containerNumber);
        logger.info(`[OperationController] 货柜 ${containerNumber} 状态已自动更新`);
      } catch (statusError) {
        logger.warn(`[OperationController] 自动更新货柜状态失败:`, statusError);
        // 不影响操作创建结果，只记录警告
      }

      res.json({
        success: true,
        message: '港口操作创建成功',
        data: portOperation
      });
    } catch (error: any) {
      logger.error('[OperationController] 创建港口操作失败:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * PUT /api/v1/operations/port/:id
   * 更新港口操作
   */
  updatePortOperation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const portData = snakeToCamel(req.body);

      const portOperation = await this.portOperationRepository.findOne({ where: { id } });
      if (!portOperation) {
        res.status(404).json({ success: false, message: '港口操作不存在' });
        return;
      }

      Object.assign(portOperation, portData);
      await this.portOperationRepository.save(portOperation);

      // 自动更新货柜状态
      try {
        await this.containerStatusService.updateStatus(portOperation.containerNumber);
        logger.info(`[OperationController] 货柜 ${portOperation.containerNumber} 状态已自动更新`);
      } catch (statusError) {
        logger.warn(`[OperationController] 自动更新货柜状态失败:`, statusError);
        // 不影响操作更新结果，只记录警告
      }

      res.json({
        success: true,
        message: '港口操作更新成功',
        data: portOperation
      });
    } catch (error: any) {
      logger.error('[OperationController] 更新港口操作失败:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * POST /api/v1/operations/trucking
   * 创建拖卡运输
   */
  createTruckingTransport = async (req: Request, res: Response): Promise<void> => {
    try {
      const truckingData = snakeToCamel(req.body);
      const { containerNumber } = truckingData;

      if (!containerNumber) {
        res.status(400).json({ success: false, message: '缺少货柜号' });
        return;
      }

      const truckingTransport = this.truckingTransportRepository.create(truckingData);
      if (truckingData.pickupDate != null && truckingData.pickupDate !== undefined) {
        truckingTransport.pickupDateSource = PICKUP_DATE_SOURCE.MANUAL;
      }
      await this.truckingTransportRepository.save(truckingTransport);

      // 自动更新货柜状态
      try {
        await this.containerStatusService.updateStatus(containerNumber);
        logger.info(`[OperationController] 货柜 ${containerNumber} 状态已自动更新`);
      } catch (statusError) {
        logger.warn(`[OperationController] 自动更新货柜状态失败:`, statusError);
        // 不影响操作创建结果，只记录警告
      }

      res.json({
        success: true,
        message: '拖卡运输创建成功',
        data: truckingTransport
      });
    } catch (error: any) {
      logger.error('[OperationController] 创建拖卡运输失败:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * PUT /api/v1/operations/trucking/:containerNumber
   * 更新拖卡运输
   */
  updateTruckingTransport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { containerNumber } = req.params;
      const truckingData = snakeToCamel(req.body);

      let truckingTransport = await this.truckingTransportRepository.findOne({ where: { containerNumber } });
      if (!truckingTransport) {
        truckingTransport = this.truckingTransportRepository.create({ containerNumber, ...truckingData });
      } else {
        Object.assign(truckingTransport, truckingData);
      }
      if (Object.prototype.hasOwnProperty.call(truckingData, 'pickupDate') && truckingData.pickupDate != null) {
        truckingTransport.pickupDateSource = PICKUP_DATE_SOURCE.MANUAL;
      }

      await this.truckingTransportRepository.save(truckingTransport);

      // 自动更新货柜状态
      try {
        await this.containerStatusService.updateStatus(containerNumber);
        logger.info(`[OperationController] 货柜 ${containerNumber} 状态已自动更新`);
      } catch (statusError) {
        logger.warn(`[OperationController] 自动更新货柜状态失败:`, statusError);
        // 不影响操作更新结果，只记录警告
      }

      res.json({
        success: true,
        message: '拖卡运输更新成功',
        data: truckingTransport
      });
    } catch (error: any) {
      logger.error('[OperationController] 更新拖卡运输失败:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * POST /api/v1/operations/warehouse
   * 创建仓库操作
   */
  createWarehouseOperation = async (req: Request, res: Response): Promise<void> => {
    try {
      const warehouseData = snakeToCamel(req.body);
      const { containerNumber } = warehouseData;

      if (!containerNumber) {
        res.status(400).json({ success: false, message: '缺少货柜号' });
        return;
      }

      const warehouseOperation = this.warehouseOperationRepository.create(warehouseData);
      await this.warehouseOperationRepository.save(warehouseOperation);

      // 自动更新货柜状态
      try {
        await this.containerStatusService.updateStatus(containerNumber);
        logger.info(`[OperationController] 货柜 ${containerNumber} 状态已自动更新`);
      } catch (statusError) {
        logger.warn(`[OperationController] 自动更新货柜状态失败:`, statusError);
        // 不影响操作创建结果，只记录警告
      }

      res.json({
        success: true,
        message: '仓库操作创建成功',
        data: warehouseOperation
      });
    } catch (error: any) {
      logger.error('[OperationController] 创建仓库操作失败:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * PUT /api/v1/operations/warehouse/:containerNumber
   * 更新仓库操作
   */
  updateWarehouseOperation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { containerNumber } = req.params;
      const warehouseData = snakeToCamel(req.body);

      let warehouseOperation = await this.warehouseOperationRepository.findOne({ where: { containerNumber } });
      if (!warehouseOperation) {
        warehouseOperation = this.warehouseOperationRepository.create({ containerNumber, ...warehouseData });
      } else {
        Object.assign(warehouseOperation, warehouseData);
      }

      await this.warehouseOperationRepository.save(warehouseOperation);

      // 自动更新货柜状态
      try {
        await this.containerStatusService.updateStatus(containerNumber);
        logger.info(`[OperationController] 货柜 ${containerNumber} 状态已自动更新`);
      } catch (statusError) {
        logger.warn(`[OperationController] 自动更新货柜状态失败:`, statusError);
        // 不影响操作更新结果，只记录警告
      }

      res.json({
        success: true,
        message: '仓库操作更新成功',
        data: warehouseOperation
      });
    } catch (error: any) {
      logger.error('[OperationController] 更新仓库操作失败:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * POST /api/v1/operations/empty-return
   * 创建还空箱
   */
  createEmptyReturn = async (req: Request, res: Response): Promise<void> => {
    try {
      const returnData = snakeToCamel(req.body);
      const { containerNumber } = returnData;

      if (!containerNumber) {
        res.status(400).json({ success: false, message: '缺少货柜号' });
        return;
      }

      const emptyReturn = this.emptyReturnRepository.create(returnData);
      await this.emptyReturnRepository.save(emptyReturn);

      // 自动更新货柜状态
      try {
        await this.containerStatusService.updateStatus(containerNumber);
        logger.info(`[OperationController] 货柜 ${containerNumber} 状态已自动更新`);
      } catch (statusError) {
        logger.warn(`[OperationController] 自动更新货柜状态失败:`, statusError);
        // 不影响操作创建结果，只记录警告
      }

      res.json({
        success: true,
        message: '还空箱创建成功',
        data: emptyReturn
      });
    } catch (error: any) {
      logger.error('[OperationController] 创建还空箱失败:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * PUT /api/v1/operations/empty-return/:containerNumber
   * 更新还空箱
   */
  updateEmptyReturn = async (req: Request, res: Response): Promise<void> => {
    try {
      const { containerNumber } = req.params;
      const returnData = snakeToCamel(req.body);

      let emptyReturn = await this.emptyReturnRepository.findOne({ where: { containerNumber } });
      if (!emptyReturn) {
        emptyReturn = this.emptyReturnRepository.create({ containerNumber, ...returnData });
      } else {
        Object.assign(emptyReturn, returnData);
      }

      await this.emptyReturnRepository.save(emptyReturn);

      // 自动更新货柜状态
      try {
        await this.containerStatusService.updateStatus(containerNumber);
        logger.info(`[OperationController] 货柜 ${containerNumber} 状态已自动更新`);
      } catch (statusError) {
        logger.warn(`[OperationController] 自动更新货柜状态失败:`, statusError);
        // 不影响操作更新结果，只记录警告
      }

      res.json({
        success: true,
        message: '还空箱更新成功',
        data: emptyReturn
      });
    } catch (error: any) {
      logger.error('[OperationController] 更新还空箱失败:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };
}

// 导出控制器实例
export const operationController = new OperationController();
