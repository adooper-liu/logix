/**
 * 外部数据控制器
 * 用于管理外部数据源（如飞驼）的数据同步
 */

import { Request, Response } from 'express';
import { feituoAdapter } from '../adapters/FeiTuoAdapter';
import { ContainerStatusEvent } from '../entities/ContainerStatusEvent';
import { AppDataSource } from '../database';
import { logger } from '../utils/logger';

export class ExternalDataController {
  private eventRepository = AppDataSource.getRepository(ContainerStatusEvent);
  /**
   * 同步单个货柜的状态事件
   * POST /api/external/sync/:containerNumber
   */
  syncContainer = async (req: Request, res: Response): Promise<void> => {
    try {
      const { containerNumber } = req.params;
      const { dataSource = 'Feituo' } = req.body;

      if (!containerNumber) {
        res.status(400).json({
          success: false,
          message: '缺少集装箱号',
        });
        return;
      }

      logger.info(`[ExternalDataController] 收到同步请求: ${containerNumber}, 数据源: ${dataSource}`);

      let events: any[] = [];

      // 根据数据源类型调用不同的适配器
      if (dataSource === 'Feituo') {
        const result = await feituoAdapter.getContainerStatusEvents(containerNumber);
        if (result.success && result.data) {
          events = this.convertToStatusEvents(containerNumber, result.data);
        } else {
          throw new Error(result.error || '获取飞驼数据失败');
        }
      } else {
        throw new Error(`不支持的数据源: ${dataSource}`);
      }

      // 保存到数据库
      const savedEvents = await this.saveStatusEvents(events);

      res.json({
        success: true,
        message: `成功同步 ${savedEvents.length} 个状态事件`,
        data: {
          containerNumber,
          eventCount: savedEvents.length,
          events: savedEvents,
        },
      });

    } catch (error: any) {
      logger.error('[ExternalDataController] 同步货柜失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '同步失败',
      });
    }
  };

  /**
   * 将适配器返回的数据转换为状态事件实体
   */
  private convertToStatusEvents(containerNumber: string, nodes: any[]): ContainerStatusEvent[] {
    return nodes.map((node, index) => {
      const event = new ContainerStatusEvent();
      event.id = `${containerNumber}-${node.statusCode || 'STATUS'}-${Date.now()}-${index}`;
      event.containerNumber = containerNumber;
      event.statusCode = node.statusCode || 'STATUS';
      event.occurredAt = node.occurredAt;
      event.isEstimated = node.isEstimated !== undefined ? node.isEstimated : false;
      event.locationCode = node.locationCode;
      event.locationNameEn = node.locationNameEn;
      event.locationNameCn = node.locationNameCn;
      event.locationNameOriginal = node.locationNameEn || node.locationNameCn;
      event.statusType = node.statusType || 'STATUS';
      event.latitude = node.latitude;
      event.longitude = node.longitude;
      event.timezone = node.timezone;
      event.terminalName = node.terminalName;
      event.cargoLocation = node.cargoLocation;
      event.dataSource = node.dataSource || 'Feituo';
      event.descriptionEn = node.statusNameEn;
      event.descriptionCn = node.statusNameCn;
      event.descriptionOriginal = node.statusNameEn || node.statusNameCn;
      return event;
    });
  }

  /**
   * 保存状态事件到数据库
   */
  private async saveStatusEvents(events: ContainerStatusEvent[]): Promise<ContainerStatusEvent[]> {
    const savedEvents: ContainerStatusEvent[] = [];

    for (const event of events) {
      // 检查是否已存在相同的事件
      const existingEvent = await this.eventRepository.findOne({
        where: {
          containerNumber: event.containerNumber,
          statusCode: event.statusCode,
          occurredAt: event.occurredAt,
        },
      });

      if (existingEvent) {
        // 更新现有事件
        Object.assign(existingEvent, event);
        const updated = await this.eventRepository.save(existingEvent);
        savedEvents.push(updated);
        logger.info(`[ExternalDataController] 更新状态事件: ${event.containerNumber} - ${event.statusCode}`);
      } else {
        // 创建新事件
        const saved = await this.eventRepository.save(event);
        savedEvents.push(saved);
        logger.info(`[ExternalDataController] 创建状态事件: ${event.containerNumber} - ${event.statusCode}`);
      }
    }

    return savedEvents;
  }

  /**
   * 批量同步货柜状态事件
   * POST /api/external/sync/batch
   */
  syncBatch = async (req: Request, res: Response): Promise<void> => {
    try {
      const { containerNumbers, dataSource = 'Feituo' } = req.body;

      if (!Array.isArray(containerNumbers) || containerNumbers.length === 0) {
        res.status(400).json({
          success: false,
          message: '请提供集装箱号数组',
        });
        return;
      }

      if (containerNumbers.length > 50) {
        res.status(400).json({
          success: false,
          message: '单次批量同步最多支持50个货柜',
        });
        return;
      }

      logger.info(`[ExternalDataController] 收到批量同步请求: ${containerNumbers.length} 个货柜`);

      const result = {
        success: [] as string[],
        failed: [] as { containerNumber: string; error: string }[],
      };

      for (const containerNumber of containerNumbers) {
        try {
          await this.syncContainer({ params: { containerNumber }, body: { dataSource } } as any);
          result.success.push(containerNumber);
        } catch (error: any) {
          result.failed.push({
            containerNumber,
            error: error.message || '未知错误',
          });
          logger.error(`[ExternalDataController] 同步货柜 ${containerNumber} 失败:`, error);
        }
      }

      res.json({
        success: true,
        message: `批量同步完成: 成功 ${result.success.length}, 失败 ${result.failed.length}`,
        data: result,
      });

    } catch (error: any) {
      logger.error('[ExternalDataController] 批量同步失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '批量同步失败',
      });
    }
  };

  /**
   * 获取货柜的状态事件列表
   * GET /api/external/events/:containerNumber
   */
  getContainerEvents = async (req: Request, res: Response): Promise<void> => {
    try {
      const { containerNumber } = req.params;
      const { limit = 50 } = req.query;

      const eventRepository = AppDataSource.getRepository(ContainerStatusEvent);

      const events = await eventRepository
        .createQueryBuilder('event')
        .where('event.containerNumber = :containerNumber', { containerNumber })
        .orderBy('event.occurredAt', 'DESC')
        .limit(Number(limit))
        .getMany();

      res.json({
        success: true,
        data: events,
        total: events.length,
      });

    } catch (error: any) {
      logger.error('[ExternalDataController] 获取状态事件失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取状态事件失败',
      });
    }
  };

  /**
   * 删除货柜的状态事件
   * DELETE /api/external/events/:containerNumber
   */
  deleteContainerEvents = async (req: Request, res: Response): Promise<void> => {
    try {
      const { containerNumber } = req.params;

      const eventRepository = AppDataSource.getRepository(ContainerStatusEvent);

      const result = await eventRepository
        .createQueryBuilder('event')
        .where('event.containerNumber = :containerNumber', { containerNumber })
        .delete()
        .execute();

      logger.info(`[ExternalDataController] 删除了 ${result.affected || 0} 个状态事件`);

      res.json({
        success: true,
        message: `成功删除 ${result.affected || 0} 个状态事件`,
        data: {
          containerNumber,
          deletedCount: result.affected || 0,
        },
      });

    } catch (error: any) {
      logger.error('[ExternalDataController] 删除状态事件失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '删除状态事件失败',
      });
    }
  };

  /**
   * 清理过期的预计状态事件
   * POST /api/external/cleanup
   */
  cleanupExpiredEvents = async (req: Request, res: Response): Promise<void> => {
    try {
      const { days = 7 } = req.body;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const deleteResult = await this.eventRepository
        .createQueryBuilder('event')
        .where('event.isEstimated = :isEstimated', { isEstimated: true })
        .andWhere('event.occurredAt < :cutoffDate', { cutoffDate })
        .andWhere('event.dataSource IN (:...dataSources)', {
          dataSources: ['Feituo', 'AIS'],
        })
        .delete()
        .execute();

      const deletedCount = deleteResult.affected || 0;

      res.json({
        success: true,
        message: `成功清理 ${deletedCount} 个过期的预计状态事件`,
        data: {
          deletedCount,
          retentionDays: days,
        },
      });

    } catch (error: any) {
      logger.error('[ExternalDataController] 清理过期事件失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '清理过期事件失败',
      });
    }
  };

  /**
   * 获取数据源统计信息
   * GET /api/external/stats
   */
  getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const eventRepository = AppDataSource.getRepository(ContainerStatusEvent);

      // 总事件数
      const totalEvents = await eventRepository.count();

      // 按数据源统计
      const dataSourceStats = await eventRepository
        .createQueryBuilder('event')
        .select('event.dataSource', 'dataSource')
        .addSelect('COUNT(*)', 'count')
        .groupBy('event.dataSource')
        .getRawMany();

      // 按是否预计统计
      const estimatedStats = await eventRepository
        .createQueryBuilder('event')
        .select('event.isEstimated', 'isEstimated')
        .addSelect('COUNT(*)', 'count')
        .groupBy('event.isEstimated')
        .getRawMany();

      // 最近更新的货柜
      const recentContainers = await eventRepository
        .createQueryBuilder('event')
        .select('event.containerNumber', 'containerNumber')
        .addSelect('MAX(event.updated_at)', 'lastUpdate')
        .addGroupBy('event.containerNumber')
        .orderBy('lastUpdate', 'DESC')
        .limit(10)
        .getRawMany();

      res.json({
        success: true,
        data: {
          totalEvents,
          dataSourceStats,
          estimatedStats,
          recentContainers,
        },
      });

    } catch (error: any) {
      logger.error('[ExternalDataController] 获取统计信息失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取统计信息失败',
      });
    }
  };
}

export const externalDataController = new ExternalDataController();
