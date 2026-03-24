/**
 * 数据来源管理控制器
 * 用于暴露数据来源管理的API接口
 */

import { Request, Response } from 'express';
import { dataSourceService, DataSourceType } from '../services/dataSourceService';
import { logger } from '../utils/logger';

/**
 * 数据来源管理控制器类
 */
export class DataSourceController {
  /**
   * 获取数据来源统计
   */
  async getDataSourceStats(req: Request, res: Response): Promise<void> {
    try {
      logger.info('[DataSourceController] 获取数据来源统计');
      const stats = await dataSourceService.getDataSourceStats();
      res.status(200).json({
        success: true,
        data: stats,
        message: '获取数据来源统计成功'
      });
    } catch (error) {
      logger.error('[DataSourceController] 获取数据来源统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取数据来源统计失败'
      });
    }
  }

  /**
   * 获取指定货柜的数据来源信息
   */
  async getContainerDataSourceInfo(req: Request, res: Response): Promise<void> {
    try {
      const { containerNumber } = req.params;
      if (!containerNumber) {
        res.status(400).json({
          success: false,
          message: '缺少集装箱号参数'
        });
        return;
      }

      logger.info(`[DataSourceController] 获取货柜 ${containerNumber} 的数据来源信息`);
      const info = await dataSourceService.getContainerDataSourceInfo(containerNumber);
      res.status(200).json({
        success: true,
        data: info,
        message: '获取货柜数据来源信息成功'
      });
    } catch (error) {
      logger.error('[DataSourceController] 获取货柜数据来源信息失败:', error);
      res.status(500).json({
        success: false,
        message: '获取货柜数据来源信息失败'
      });
    }
  }

  /**
   * 清理过期的预计数据
   */
  async cleanExpiredEstimatedData(req: Request, res: Response): Promise<void> {
    try {
      const { days = 7 } = req.query;
      const daysNumber = parseInt(days as string, 10);

      logger.info(`[DataSourceController] 清理过期的预计数据，保留 ${daysNumber} 天`);
      const count = await dataSourceService.cleanExpiredEstimatedData(daysNumber);
      res.status(200).json({
        success: true,
        data: { count },
        message: `清理了 ${count} 条过期的预计数据`
      });
    } catch (error) {
      logger.error('[DataSourceController] 清理过期数据失败:', error);
      res.status(500).json({
        success: false,
        message: '清理过期数据失败'
      });
    }
  }

  /**
   * 获取数据来源优先级配置
   */
  async getDataSourcePriority(req: Request, res: Response): Promise<void> {
    try {
      logger.info('[DataSourceController] 获取数据来源优先级配置');
      // 导入优先级配置
      const { DATA_SOURCE_PRIORITY } = await import('../services/dataSourceService');
      res.status(200).json({
        success: true,
        data: {
          priorities: DATA_SOURCE_PRIORITY,
          sources: Object.values(DataSourceType)
        },
        message: '获取数据来源优先级配置成功'
      });
    } catch (error) {
      logger.error('[DataSourceController] 获取数据来源优先级配置失败:', error);
      res.status(500).json({
        success: false,
        message: '获取数据来源优先级配置失败'
      });
    }
  }
}

// 导出默认实例
export const dataSourceController = new DataSourceController();
