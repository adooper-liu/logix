/**
 * 数据来源管理服务
 * 用于管理三种数据来源：飞驼API、手工维护、Excel导入
 * 确保数据一致性和优先级管理
 */

import { AppDataSource } from '../database';
import { Container } from '../entities/Container';
import { PortOperation } from '../entities/PortOperation';
import { logger } from '../utils/logger';
import { auditLogService } from './auditLog.service';

/**
 * 数据来源类型
 */
export enum DataSourceType {
  FEITUO_API = 'FeituoAPI',  // 飞驼API
  FEITUO_EXCEL = 'Feituo',   // 飞驼Excel导入
  MANUAL = 'Manual',        // 手工维护
  EXCEL = 'Excel',          // 普通Excel导入
  SYSTEM = 'System',        // 系统自动生成
}

/**
 * 数据来源优先级（数字越小优先级越高）
 */
export const DATA_SOURCE_PRIORITY: Record<DataSourceType, number> = {
  [DataSourceType.MANUAL]: 1,      // 手工维护优先级最高
  [DataSourceType.FEITUO_API]: 2,  // 飞驼API次之
  [DataSourceType.EXCEL]: 3,       // Excel导入
  [DataSourceType.FEITUO_EXCEL]: 3, // 飞驼Excel导入
  [DataSourceType.SYSTEM]: 4,      // 系统自动生成优先级最低
};

/**
 * 数据来源管理服务类
 */
export class DataSourceService {
  // 数据仓库
  private containerRepository = AppDataSource.getRepository(Container);
  private portOperationRepository = AppDataSource.getRepository(PortOperation);

  /**
   * 检查是否应该更新字段
   * @param currentSource 当前数据来源
   * @param newSource 新数据来源
   * @param currentValue 当前值
   * @param newValue 新值
   * @returns 是否应该更新
   */
  shouldUpdateField(
    currentSource: DataSourceType | null,
    newSource: DataSourceType,
    currentValue: any,
    newValue: any
  ): boolean {
    // 如果当前值为空，总是更新
    if (currentValue === null || currentValue === undefined) {
      return true;
    }

    // 如果新值为空，不更新
    if (newValue === null || newValue === undefined) {
      return false;
    }

    // 如果当前没有数据来源，总是更新
    if (!currentSource) {
      return true;
    }

    // 比较优先级
    const currentPriority = DATA_SOURCE_PRIORITY[currentSource];
    const newPriority = DATA_SOURCE_PRIORITY[newSource];

    // 优先级高的可以覆盖优先级低的
    if (newPriority < currentPriority) {
      return true;
    }

    // 相同优先级，只有当值不同时才更新
    if (newPriority === currentPriority) {
      return currentValue !== newValue;
    }

    // 优先级低的不能覆盖优先级高的
    return false;
  }

  /**
   * 更新港口操作记录的核心字段
   * @param containerNumber 集装箱号
   * @param fieldName 字段名
   * @param value 字段值
   * @param dataSource 数据来源
   */
  async updatePortOperationField(
    containerNumber: string,
    fieldName: string,
    value: any,
    dataSource: DataSourceType
  ): Promise<boolean> {
    try {
      // 查找港口操作记录
      const portOperations = await this.portOperationRepository
        .createQueryBuilder('po')
        .where('po.containerNumber = :containerNumber', { containerNumber })
        .getMany();

      if (portOperations.length === 0) {
        logger.warn(`[DataSourceService] 货柜 ${containerNumber} 没有港口操作记录`);
        return false;
      }

      let updated = false;

      for (const portOperation of portOperations) {
        const currentValue = (portOperation as any)[fieldName];
        const currentSource = portOperation.dataSource as DataSourceType | null;

        if (this.shouldUpdateField(currentSource, dataSource, currentValue, value)) {
          (portOperation as any)[fieldName] = value;
          portOperation.dataSource = dataSource;
          updated = true;

          logger.info(`[DataSourceService] 更新港口操作字段: ${containerNumber} - ${fieldName} = ${value} (来源: ${dataSource})`);
        }
      }

      if (updated) {
        await this.portOperationRepository.save(portOperations);

        // 记录数据变更日志
        await auditLogService.logChange({
          sourceType: dataSource.toLowerCase(),
          entityType: 'process_port_operations',
          entityId: containerNumber,
          action: 'UPDATE',
          changedFields: { [fieldName]: { new: value } },
          remark: `数据来源 ${dataSource} 更新字段 ${fieldName}`
        });
      }

      return updated;
    } catch (error) {
      logger.error(`[DataSourceService] 更新港口操作字段失败:`, error);
      throw error;
    }
  }

  /**
   * 更新货柜字段
   * @param containerNumber 集装箱号
   * @param fieldName 字段名
   * @param value 字段值
   * @param dataSource 数据来源
   */
  async updateContainerField(
    containerNumber: string,
    fieldName: string,
    value: any,
    dataSource: DataSourceType
  ): Promise<boolean> {
    try {
      // 查找货柜
      const container = await this.containerRepository.findOne({
        where: { containerNumber }
      });

      if (!container) {
        logger.warn(`[DataSourceService] 货柜 ${containerNumber} 不存在`);
        return false;
      }

      const currentValue = (container as any)[fieldName];
      
      // 货柜表没有dataSource字段，总是更新
      if (currentValue !== value) {
        (container as any)[fieldName] = value;
        await this.containerRepository.save(container);

        // 记录数据变更日志
        await auditLogService.logChange({
          sourceType: dataSource.toLowerCase(),
          entityType: 'biz_containers',
          entityId: containerNumber,
          action: 'UPDATE',
          changedFields: { [fieldName]: { old: currentValue, new: value } },
          remark: `数据来源 ${dataSource} 更新字段 ${fieldName}`
        });

        logger.info(`[DataSourceService] 更新货柜字段: ${containerNumber} - ${fieldName} = ${value} (来源: ${dataSource})`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`[DataSourceService] 更新货柜字段失败:`, error);
      throw error;
    }
  }

  /**
   * 批量更新多个字段
   * @param containerNumber 集装箱号
   * @param fields 字段映射
   * @param dataSource 数据来源
   */
  async updateMultipleFields(
    containerNumber: string,
    fields: Record<string, any>,
    dataSource: DataSourceType
  ): Promise<{ updated: boolean; updatedFields: string[] }> {
    try {
      let updated = false;
      const updatedFields: string[] = [];

      // 更新港口操作字段
      for (const [fieldName, value] of Object.entries(fields)) {
        const fieldUpdated = await this.updatePortOperationField(containerNumber, fieldName, value, dataSource);
        if (fieldUpdated) {
          updated = true;
          updatedFields.push(fieldName);
        }
      }

      return { updated, updatedFields };
    } catch (error) {
      logger.error(`[DataSourceService] 批量更新字段失败:`, error);
      throw error;
    }
  }

  /**
   * 获取数据来源统计
   */
  async getDataSourceStats(): Promise<Record<DataSourceType, number>> {
    try {
      const stats: Record<DataSourceType, number> = {
        [DataSourceType.FEITUO_API]: 0,
        [DataSourceType.FEITUO_EXCEL]: 0,
        [DataSourceType.MANUAL]: 0,
        [DataSourceType.EXCEL]: 0,
        [DataSourceType.SYSTEM]: 0,
      };

      // 统计港口操作记录的数据源
      const portOperationStats = await this.portOperationRepository
        .createQueryBuilder('po')
        .select('po.data_source, COUNT(*) as count')
        .groupBy('po.data_source')
        .getRawMany();

      portOperationStats.forEach(stat => {
        const source = stat.po_data_source as DataSourceType;
        if (source in stats) {
          stats[source] = parseInt(stat.count, 10);
        }
      });

      return stats;
    } catch (error) {
      logger.error(`[DataSourceService] 获取数据来源统计失败:`, error);
      throw error;
    }
  }

  /**
   * 获取指定货柜的数据来源信息
   * @param containerNumber 集装箱号
   */
  async getContainerDataSourceInfo(containerNumber: string): Promise<Record<string, any>> {
    try {
      // 获取港口操作记录的数据源
      const portOperations = await this.portOperationRepository
        .createQueryBuilder('po')
        .select('po.port_type, po.data_source, po.updated_at')
        .where('po.containerNumber = :containerNumber', { containerNumber })
        .getMany();

      const dataSourceInfo = {
        containerNumber,
        portOperations: portOperations.map(po => ({
          portType: po.portType,
          dataSource: po.dataSource,
          updatedAt: po.updatedAt
        })),
        lastUpdated: portOperations.length > 0 
          ? Math.max(...portOperations.map(po => po.updatedAt.getTime()))
          : null
      };

      return dataSourceInfo;
    } catch (error) {
      logger.error(`[DataSourceService] 获取货柜数据来源信息失败:`, error);
      throw error;
    }
  }

  /**
   * 清理过期的预计数据
   * @param days 保留天数
   */
  async cleanExpiredEstimatedData(days: number = 7): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // 清理过期的预计港口操作记录
      const result = await this.portOperationRepository
        .createQueryBuilder('po')
        .where('po.data_source IN (:...sources)', {
          sources: [DataSourceType.FEITUO_API, DataSourceType.FEITUO_EXCEL]
        })
        .andWhere('po.updated_at < :cutoffDate', { cutoffDate })
        .andWhere('(po.eta IS NOT NULL OR po.eta_correction IS NOT NULL)')
        .delete()
        .execute();

      logger.info(`[DataSourceService] 清理了 ${result.affected || 0} 条过期的预计数据`);
      return result.affected || 0;
    } catch (error) {
      logger.error(`[DataSourceService] 清理过期数据失败:`, error);
      throw error;
    }
  }
}

// 导出默认实例
export const dataSourceService = new DataSourceService();