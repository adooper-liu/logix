/**
 * 物流路径控制器
 * Logistics Path Controller
 */

import { Request, Response, NextFunction } from 'express';
import { logisticsPathService } from '../services/logisticsPath.service.js';
import { AppError } from '../middleware/error.middleware.js';
import { log } from '../utils/logger.js';

/**
 * 根据集装箱号获取物流路径
 * GET /api/v1/logistics-path/container/:containerNumber
 */
export const getPathByContainer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { containerNumber } = req.params;

    if (!containerNumber) {
      throw new AppError(400, '集装箱号不能为空');
    }

    log.info('Fetching path by container:', { containerNumber });

    const pathData = await logisticsPathService.getStatusPathByContainer(containerNumber);

    res.json({
      success: true,
      data: pathData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 根据提单号获取物流路径
 * GET /api/v1/logistics-path/bl/:billOfLadingNumber
 */
export const getPathByBL = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { billOfLadingNumber } = req.params;

    if (!billOfLadingNumber) {
      throw new AppError(400, '提单号不能为空');
    }

    log.info('Fetching path by BL:', { billOfLadingNumber });

    const pathData = await logisticsPathService.getStatusPathByBL(billOfLadingNumber);

    res.json({
      success: true,
      data: pathData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 根据订舱号获取物流路径
 * GET /api/v1/logistics-path/booking/:bookingNumber
 */
export const getPathByBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { bookingNumber } = req.params;

    if (!bookingNumber) {
      throw new AppError(400, '订舱号不能为空');
    }

    log.info('Fetching path by booking:', { bookingNumber });

    const pathData = await logisticsPathService.getStatusPathByBooking(bookingNumber);

    res.json({
      success: true,
      data: pathData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取物流路径列表
 * GET /api/v1/logistics-paths
 */
export const getPaths = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      first = 10,
      after,
      containerNumber,
      overallStatus,
      startDate,
      endDate
    } = req.query;

    const filter: any = {};
    if (containerNumber) filter.containerNumber = String(containerNumber);
    if (overallStatus) filter.overallStatus = String(overallStatus);
    if (startDate) filter.startDate = new Date(String(startDate));
    if (endDate) filter.endDate = new Date(String(endDate));

    log.info('Fetching paths list:', { filter, first, after });

    const pathsData = await logisticsPathService.getStatusPaths({
      first: Number(first),
      after: after ? String(after) : undefined,
      filter: Object.keys(filter).length > 0 ? filter : undefined
    });

    res.json({
      success: true,
      data: pathsData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 验证物流路径
 * POST /api/v1/logistics-path/validate/:pathId
 */
export const validatePath = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { pathId } = req.params;

    if (!pathId) {
      throw new AppError(400, '路径ID不能为空');
    }

    log.info('Validating path:', { pathId });

    const validationResult = await logisticsPathService.validateStatusPath(pathId);

    res.json({
      success: true,
      data: validationResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 同步外部数据
 * POST /api/v1/logistics-path/sync
 */
export const syncExternalData = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { source, data, containerNumber } = req.body;

    if (!source || !data || !containerNumber) {
      throw new AppError(400, 'source、data、containerNumber 字段必填');
    }

    log.info('Syncing external data:', { source, containerNumber });

    const syncedData = await logisticsPathService.syncExternalData(
      source,
      data,
      containerNumber
    );

    res.json({
      success: true,
      data: syncedData,
      message: '数据同步成功',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 批量同步外部数据
 * POST /api/v1/logistics-path/batch-sync
 */
export const batchSyncExternalData = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { source, dataList } = req.body;

    if (!source || !dataList || !Array.isArray(dataList)) {
      throw new AppError(400, 'source 和 dataList (数组) 字段必填');
    }

    if (dataList.length === 0) {
      throw new AppError(400, 'dataList 不能为空数组');
    }

    log.info('Batch syncing external data:', { source, count: dataList.length });

    const result = await logisticsPathService.batchSyncExternalData(source, dataList);

    res.json({
      success: true,
      data: result,
      message: `批量同步完成：成功 ${result.successCount}，失败 ${result.failureCount}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 健康检查
 * GET /api/v1/logistics-path/health
 */
export const healthCheck = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const healthData = await logisticsPathService.healthCheck();

    res.json({
      success: true,
      data: healthData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: '物流路径服务不可用',
      timestamp: new Date().toISOString()
    });
  }
};
