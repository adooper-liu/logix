/**
 * 滞港费记录写回服务
 * Demurrage Record Writer Service
 * 
 * 职责：将计算结果写回数据库
 * - ExtDemurrageRecord CRUD 操作
 * - 单条记录保存
 * - 批量记录保存
 * - 临时/永久数据管理
 * 
 * @since 2026-03-30 (从 DemurrageService 拆分)
 */

import { Repository, LessThan } from 'typeorm';
import { ExtDemurrageRecord } from '../entities/ExtDemurrageRecord';
import type { DemurrageCalculationResult } from './demurrage.service';
import { logger } from '../utils/logger';

export interface SaveRecordOptions {
  isFinal: boolean;
  destinationPort?: string;
  logisticsStatus?: string;
}

export interface BatchSaveResult {
  saved: number;
  finalized: number;
  failed: number;
}

export class DemurrageRecordWriter {
  constructor(private recordRepo: Repository<ExtDemurrageRecord>) {}

  /**
   * 保存单条货柜的计算结果到记录表
   * 
   * **业务规则**:
   * 1. 先删除该货柜的所有旧记录（覆盖写入）
   * 2. 为每个费用项创建一条新记录
   * 3. 标注临时/永久状态（isFinal）
   * 4. 已还箱 = 永久数据，未还箱 = 临时数据
   * 
   * **算法复杂度**: O(n)，n=费用项数量
   * 
   * @param result 计算结果
   * @param options 保存选项
   * @returns 保存的记录数
   * 
   * @example
   * // 示例：保存临时数据（未还箱）
   * await saveToRecords(result, { isFinal: false });
   * 
   * @example
   * // 示例：保存永久数据（已还箱）
   * await saveToRecords(result, { isFinal: true });
   */
  async saveToRecords(
    result: DemurrageCalculationResult,
    options: SaveRecordOptions
  ): Promise<number> {
    const { isFinal, destinationPort, logisticsStatus } = options;
    const containerNumber = result.containerNumber;
    const now = new Date();

    try {
      // 1. 删除旧记录（覆盖写入）
      await this.recordRepo.delete({ containerNumber });

      // 2. 创建并保存新记录
      let count = 0;
      for (const item of result.items) {
        const rec = this.recordRepo.create({
          containerNumber,
          destinationPort: destinationPort ?? undefined,
          logisticsStatus: logisticsStatus ?? undefined,
          chargeType: item.chargeTypeCode,
          chargeName: item.chargeName,
          freeDays: item.freeDays,
          freeDaysBasis: item.freeDaysBasis ?? undefined,
          calculationBasis: item.calculationBasis ?? undefined,
          calculationMode: item.calculationMode,
          startDateMode: item.startDateMode,
          endDateMode: item.endDateMode,
          lastFreeDateMode: item.lastFreeDateMode,
          chargeStartDate: item.startDate,
          chargeEndDate: item.endDate,
          chargeDays: item.chargeDays,
          chargeAmount: item.amount,
          currency: item.currency,
          chargeStatus: isFinal ? 'FINAL' : 'TEMP',
          isFinal,
          computedAt: now
        });

        await this.recordRepo.save(rec);
        count++;
      }

      logger.debug(`[DemurrageRecord] Saved ${count} records for ${containerNumber}`, {
        isFinal,
        itemCount: result.items.length
      });

      return count;
    } catch (error) {
      logger.error(`[DemurrageRecord] Failed to save records for ${containerNumber}:`, error);
      throw error;
    }
  }

  /**
   * 批量保存多个货柜的计算结果
   * 
   * **业务规则**:
   * 1. 支持并发控制（Promise.allSettled）
   * 2. 单个货柜失败不影响其他货柜
   * 3. 统计成功/失败数量
   * 4. 区分临时/永久数据
   * 
   * **算法复杂度**: O(n*m)，n=货柜数，m=平均每个货柜的费用项数
   * 
   * @param results 计算结果数组
   * @param isFinal 是否为永久数据
   * @returns 保存统计结果
   */
  async batchSaveToRecords(
    results: DemurrageCalculationResult[],
    isFinal: boolean
  ): Promise<BatchSaveResult> {
    logger.info(`[DemurrageRecord] Batch saving ${results.length} containers...`, {
      isFinal
    });

    const promises = results.map((result) =>
      this.saveToRecords(result, { isFinal }).catch((error) => {
        logger.error(
          `[DemurrageRecord] Failed to save for ${result.containerNumber}:`,
          error.message
        );
        return null;
      })
    );

    const outcomes = await Promise.allSettled(promises);

    let saved = 0;
    let failed = 0;

    for (const outcome of outcomes) {
      if (outcome.status === 'fulfilled' && outcome.value !== null) {
        saved += outcome.value;
      } else {
        failed++;
      }
    }

    const finalized = isFinal ? results.length - failed : 0;

    logger.info(`[DemurrageRecord] Batch save completed:`, {
      total: results.length,
      saved,
      failed,
      finalized
    });

    return { saved, finalized, failed };
  }

  /**
   * 根据柜号查询记录
   * 
   * **业务规则**:
   * 1. 支持查询临时或永久数据
   * 2. 按费用项分组返回
   * 
   * @param containerNumber 柜号
   * @param isFinal 是否只查永久数据
   * @returns 记录列表
   */
  async findByContainerNumber(
    containerNumber: string,
    isFinal?: boolean
  ): Promise<ExtDemurrageRecord[]> {
    const where: any = { containerNumber };
    
    if (isFinal !== undefined) {
      where.isFinal = isFinal;
    }

    return this.recordRepo.find({
      where,
      order: { chargeType: 'ASC' }
    });
  }

  /**
   * 删除指定柜号的记录
   * 
   * **业务规则**:
   * 1. 支持删除临时或永久数据
   * 2. 支持全部删除
   * 
   * @param containerNumber 柜号
   * @param isFinal 是否只删永久数据（undefined=全部删除）
   * @returns 删除的记录数
   */
  async deleteByContainerNumber(
    containerNumber: string,
    isFinal?: boolean
  ): Promise<number> {
    const where: any = { containerNumber };
    
    if (isFinal !== undefined) {
      where.isFinal = isFinal;
    }

    const result = await this.recordRepo.delete(where);
    return result.affected || 0;
  }

  /**
   * 查询过期的临时数据
   * 
   * **业务规则**:
   * 1. 临时数据超过 7 天自动清理
   * 2. 防止数据库膨胀
   * 
   * @param daysAgo 多少天前的数据（默认 7）
   * @returns 过期记录列表
   */
  async findExpiredTempRecords(daysAgo: number = 7): Promise<ExtDemurrageRecord[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

    return this.recordRepo.find({
      where: {
        isFinal: false,
        computedAt: LessThan(cutoffDate)
      },
      order: { computedAt: 'ASC' }
    });
  }

  /**
   * 清理过期的临时数据
   * 
   * **业务规则**:
   * 1. 定期清理（每周执行）
   * 2. 保留最近 7 天的临时数据
   * 
   * @param daysAgo 多少天前的数据（默认 7）
   * @returns 清理的记录数
   */
  async cleanupExpiredTempRecords(daysAgo: number = 7): Promise<number> {
    const expiredRecords = await this.findExpiredTempRecords(daysAgo);
    
    if (expiredRecords.length === 0) {
      return 0;
    }

    const uniqueContainers = [...new Set(expiredRecords.map((r) => r.containerNumber))];
    let deletedCount = 0;

    for (const containerNumber of uniqueContainers) {
      const deleted = await this.deleteByContainerNumber(containerNumber, false);
      deletedCount += deleted;
    }

    logger.info(`[DemurrageRecord] Cleaned up ${deletedCount} expired temp records`);
    return deletedCount;
  }

  /**
   * 检查柜号是否有永久数据
   * 
   * **业务规则**:
   * 1. 已还箱的货柜有永久数据
   * 2. 用于判断是否需要重新计算
   * 
   * @param containerNumber 柜号
   * @returns 是否存在
   */
  async hasFinalRecord(containerNumber: string): Promise<boolean> {
    return this.recordRepo.exists({
      where: { containerNumber, isFinal: true }
    });
  }

  /**
   * 获取统计信息
   * 
   * **业务规则**:
   * 1. 统计总记录数
   * 2. 区分临时/永久数据
   * 3. 按日期范围统计
   * 
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 统计信息
   */
  async getStatistics(startDate?: Date, endDate?: Date): Promise<{
    totalCount: number;
    tempCount: number;
    finalCount: number;
    uniqueContainers: number;
  }> {
    const qb = this.recordRepo.createQueryBuilder('record');

    if (startDate) {
      qb.andWhere('record.computed_at >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('record.computed_at <= :endDate', { endDate });
    }

    const [totalCount, tempCount, finalCount] = await Promise.all([
      qb.getCount(),
      qb.clone().andWhere('record.is_final = :isFinal', { isFinal: false }).getCount(),
      qb.clone().andWhere('record.is_final = :isFinal', { isFinal: true }).getCount()
    ]);

    const uniqueContainers = await qb
      .clone()
      .select('DISTINCT record.container_number', 'container_number')
      .getCount();

    return { totalCount, tempCount, finalCount, uniqueContainers };
  }
}
