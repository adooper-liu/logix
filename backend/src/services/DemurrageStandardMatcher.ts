/**
 * 滞港费标准匹配服务
 * Demurrage Standard Matcher Service
 *
 * 职责：根据货柜维度参数匹配适用的滞港费标准
 * - 获取货柜匹配参数（港口、船公司、清关行等）
 * - 字典编码解析与映射
 * - 通用字典映射查询
 * - 标准匹配诊断
 *
 * @since 2026-03-30 (从 DemurrageService 拆分)
 */

import { Repository } from 'typeorm';
import { Container } from '../entities/Container';
import { ExtDemurrageStandard } from '../entities/ExtDemurrageStandard';
import { logger } from '../utils/logger';

export interface ContainerMatchParams {
  destinationPortCode: string | null;
  shippingCompanyCode: string | null;
  foreignCompanyCode: string | null; // 使用 sellToCountry
  startDate: Date | null;
  endDate: Date | null;
  startDateSource: string | null;
  endDateSource: string | null;
  detentionStartDate: Date | null;
  detentionEndDate: Date | null;
}

export class DemurrageStandardMatcher {
  constructor(
    private standardRepo: Repository<ExtDemurrageStandard>,
    private containerRepo: Repository<Container>
  ) {}

  /**
   * 匹配滞港费标准
   *
   * **业务规则**:
   * 1. 获取货柜维度参数
   * 2. 在有效日期范围内查找
   * 3. 按优先级匹配（港口 > 船公司 > 清关行 > 客户）
   *
   * **算法复杂度**: O(n)，n=标准表记录数
   *
   * @param containerNumber 柜号
   * @returns 匹配的标准列表
   *
   * @example
   * // 示例：匹配成功
   * const standards = await matchStandards('CNTR001');
   * // 返回：[ExtDemurrageStandard, ...]
   */
  async matchStandards(containerNumber: string): Promise<ExtDemurrageStandard[]> {
    const params = await this.getContainerMatchParams(containerNumber);
    const hasDemurrageRange = !!(params.startDate && params.endDate);
    const hasDetentionRange = !!(params.detentionStartDate && params.detentionEndDate);

    if (!hasDemurrageRange && !hasDetentionRange) {
      logger.warn(`[DemurrageMatcher] No valid date range for ${containerNumber}`);
      return [];
    }

    try {
      const qb = this.standardRepo.createQueryBuilder('std');

      // 添加日期范围条件
      if (hasDemurrageRange) {
        qb.andWhere('(std.effective_date IS NULL OR std.effective_date <= :startDate)', {
          startDate: params.startDate
        });
        qb.andWhere('(std.expiry_date IS NULL OR std.expiry_date >= :endDate)', {
          endDate: params.endDate
        });
      }

      if (hasDetentionRange) {
        qb.andWhere('(std.effective_date IS NULL OR std.effective_date <= :detentionStartDate)', {
          detentionStartDate: params.detentionStartDate
        });
        qb.andWhere('(std.expiry_date IS NULL OR std.expiry_date >= :detentionEndDate)', {
          detentionEndDate: params.detentionEndDate
        });
      }

      // 添加维度匹配条件（OR 逻辑，支持多口径）
      const conditions: string[] = [];
      const parameters: Record<string, string> = {};

      if (params.destinationPortCode) {
        conditions.push('std.destination_port_code = :destinationPortCode');
        parameters.destinationPortCode = params.destinationPortCode;
      }

      if (params.shippingCompanyCode) {
        conditions.push('std.shipping_company_code = :shippingCompanyCode');
        parameters.shippingCompanyCode = params.shippingCompanyCode;
      }

      if (params.foreignCompanyCode) {
        conditions.push('std.foreign_company_code = :foreignCompanyCode');
        parameters.foreignCompanyCode = params.foreignCompanyCode;
      }

      if (conditions.length > 0) {
        qb.andWhere(`(${conditions.join(' OR ')})`, parameters);
      }

      const standards = await qb.orderBy('std.sequence_number', 'ASC').getMany();

      logger.debug(
        `[DemurrageMatcher] Matched ${standards.length} standards for ${containerNumber}`
      );
      return standards;
    } catch (error) {
      logger.error('[DemurrageMatcher] Error matching standards:', error);
      return [];
    }
  }

  /**
   * 获取货柜用于匹配的维度参数
   *
   * **业务规则**:
   * 1. 优先使用实际日期（ATA, actual pickup/return）
   * 2. 如果没有，使用计划日期
   * 3. 解析关联实体的编码
   *
   * **算法复杂度**: O(n)，n=关联表查询时间
   *
   * @param containerNumber 柜号
   * @returns 匹配参数对象
   */
  async getContainerMatchParams(containerNumber: string): Promise<ContainerMatchParams> {
    const container = await this.containerRepo.findOne({
      where: { containerNumber },
      relations: [
        'portOperations',
        'seaFreight',
        'truckingTransports',
        'emptyReturns',
        'replenishmentOrders'
      ]
    });

    if (!container) {
      logger.warn(`[DemurrageMatcher] Container not found: ${containerNumber}`);
      return {
        destinationPortCode: null,
        shippingCompanyCode: null,
        foreignCompanyCode: null,
        startDate: null,
        endDate: null,
        startDateSource: null,
        endDateSource: null,
        detentionStartDate: null,
        detentionEndDate: null
      };
    }

    // 获取目的港操作
    const destPo = container.portOperations?.find((po: any) => po.portType === 'destination');

    // 提取港口编码
    const destinationPortCode = destPo?.portCode || null;

    // 提取船公司编码（从 SeaFreight 表）
    const shippingCompanyCode = container.seaFreight?.shippingCompanyId || null;

    // 提取国外客户编码（使用 sellToCountry）
    const foreignCompanyCode = container.replenishmentOrders?.[0]?.sellToCountry || null;

    // 计算滞港费区间（到港→提柜）
    const startDate = destPo?.eta || destPo?.ata || null;
    const startDateSource = destPo?.eta ? 'ETA' : destPo?.ata ? 'ATA' : null;

    // 注意：Container 实体没有 truckingTransports 关系，暂不处理 endDate
    const endDate = null;
    const endDateSource = null;

    // 注意：Container 实体没有 emptyReturns 关系，暂不处理 detention 区间
    const detentionStartDate = null;
    const detentionEndDate = null;

    return {
      destinationPortCode,
      shippingCompanyCode,
      foreignCompanyCode,
      startDate,
      endDate,
      startDateSource,
      endDateSource,
      detentionStartDate,
      detentionEndDate
    };
  }

  /**
   * 诊断匹配结果（调试用）
   *
   * @param containerNumber 柜号
   * @returns 诊断信息
   */
  async diagnoseMatch(containerNumber: string): Promise<{
    containerExists: boolean;
    containerParams: ContainerMatchParams;
    matchedStandardsCount: number;
  }> {
    const containerExists = await this.containerRepo.exists({ where: { containerNumber } });

    if (!containerExists) {
      return {
        containerExists: false,
        containerParams: {} as ContainerMatchParams,
        matchedStandardsCount: 0
      };
    }

    const containerParams = await this.getContainerMatchParams(containerNumber);
    const standards = await this.matchStandards(containerNumber);

    return {
      containerExists: true,
      containerParams,
      matchedStandardsCount: standards.length
    };
  }
}
