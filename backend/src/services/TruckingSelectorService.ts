import { Repository, In } from 'typeorm';
import { AppDataSource } from '../database';
import { TruckingCompany } from '../entities/TruckingCompany';
import { WarehouseTruckingMapping } from '../entities/WarehouseTruckingMapping';
import { TruckingPortMapping } from '../entities/TruckingPortMapping';
import { ExtTruckingSlotOccupancy } from '../entities/ExtTruckingSlotOccupancy';
import { logger } from '../utils/logger';
import { CacheService } from './CacheService';
import {
  SchedulingCacheKeys,
  SchedulingCacheTTL,
  getSchedulingCacheKey
} from '../constants/SchedulingCacheStrategy';

/**
 * 车队选择服务
 *
 * 职责：负责基于映射关系、档期可用性和综合评分选择最优车队
 * - 候选车队筛选（基于仓库 - 车队 - 港口映射链）
 * - 车队可用性检查
 * - 多维度综合评分（成本、能力、合作关系）
 *
 * @packageDocumentation
 */

/**
 * 车队候选者接口
 */
export interface TruckingCandidate {
  /** 车队代码 */
  truckingCompanyId: string;

  /** 是否有剩余能力 */
  hasCapacity: boolean;
}

/**
 * 车队评分结果接口
 */
export interface TruckingScoreResult {
  /** 车队代码 */
  truckingCompanyId: string;

  /** 成本评分（0-100） */
  costScore: number;

  /** 能力评分（0-100） */
  capacityScore: number;

  /** 合作关系评分（0-100） */
  relationshipScore: number;

  /** 卸柜模式兼容度评分（0-100） */
  unloadModeScore: number;

  /** 综合得分 */
  totalScore: number;

  /** 运输成本 */
  transportCost: number;

  /** 是否有堆场 */
  hasYard: boolean;
}

/**
 * 车队选择选项接口
 */
export interface TruckingSelectionOptions {
  /** 仓库代码 */
  warehouseCode: string;

  /** 港口代码 */
  portCode?: string;

  /** 国家代码 */
  countryCode?: string;

  /** 计划日期 */
  plannedDate?: Date;

  /** 卸柜模式偏好（可选，2026-04-01新增） */
  preferredUnloadMode?: 'Drop off' | 'Live load' | 'any';

  /** 免费期截止日（可选，用于判断是否需要 Drop off 模式） */
  lastFreeDate?: Date;

  /** 基础提柜日（可选，用于计算延迟天数） */
  basePickupDate?: Date;
}

/**
 * 车队选择服务类
 *
 * @example
 * ```typescript
 * const selector = new TruckingSelectorService();
 *
 * // 选择最优车队
 * const trucking = await selector.selectTruckingCompany({
 *   warehouseCode: 'WH001',
 *   portCode: 'USLAX',
 *   countryCode: 'US',
 *   plannedDate: new Date()
 * });
 * ```
 */
export class TruckingSelectorService {
  private warehouseTruckingMappingRepo: Repository<WarehouseTruckingMapping>;
  private truckingPortMappingRepo: Repository<TruckingPortMapping>;
  private truckingCompanyRepo: Repository<TruckingCompany>;
  private truckingOccupancyRepo: Repository<ExtTruckingSlotOccupancy>;
  private cacheService: CacheService;

  /**
   * 创建车队选择服务实例
   */
  constructor() {
    this.warehouseTruckingMappingRepo = AppDataSource.getRepository(WarehouseTruckingMapping);
    this.truckingPortMappingRepo = AppDataSource.getRepository(TruckingPortMapping);
    this.truckingCompanyRepo = AppDataSource.getRepository(TruckingCompany);
    this.truckingOccupancyRepo = AppDataSource.getRepository(ExtTruckingSlotOccupancy);
    this.cacheService = new CacheService();
  }

  /**
   * 选择最优车队
   *
   * 执行流程：
   * 1. 筛选候选车队
   * 2. 对候选车队评分
   * 3. 选择得分最高的车队
   *
   * @param options - 选择选项
   * @returns 最优车队，找不到返回 null
   */
  async selectTruckingCompany(options: TruckingSelectionOptions): Promise<TruckingCompany | null> {
    logger.info('[TruckingSelectorService] 开始选择车队', {
      warehouseCode: options.warehouseCode,
      portCode: options.portCode,
      plannedDate: options.plannedDate
    });

    try {
      const checkDate = options.plannedDate || new Date();
      const dateOnly = new Date(checkDate);
      dateOnly.setHours(0, 0, 0, 0);

      // 阶段 1: 筛选候选车队
      const candidates = await this.filterCandidateTruckingCompanies({
        warehouseCode: options.warehouseCode,
        portCode: options.portCode,
        countryCode: options.countryCode,
        plannedDate: dateOnly
      });

      if (candidates.length === 0) {
        logger.warn('[TruckingSelectorService] 无候选车队');
        return null;
      }

      // 阶段 2: 综合评分（含卸柜模式兼容度）
      const scored = await this.scoreTruckingCompanies(
        candidates,
        options.warehouseCode,
        options.portCode,
        {
          preferredUnloadMode: options.preferredUnloadMode,
          lastFreeDate: options.lastFreeDate,
          basePickupDate: options.basePickupDate
        }
      );

      // 阶段 3: 选择最优车队
      const sorted = scored.sort((a, b) => b.totalScore - a.totalScore);
      const best = sorted[0];

      logger.debug('[TruckingSelectorService] 选择车队', {
        truckingCompanyId: best.truckingCompanyId,
        totalScore: best.totalScore.toFixed(2),
        transportCost: best.transportCost,
        hasYard: best.hasYard,
        preferredUnloadMode: options.preferredUnloadMode
      });

      return this.truckingCompanyRepo.findOne({
        where: { companyCode: best.truckingCompanyId }
      });
    } catch (error) {
      logger.error('[TruckingSelectorService] 选择车队失败', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 筛选候选车队
   *
   * 筛选逻辑：
   * 1. 从 warehouse_trucking_mapping 获取仓库映射的车队
   * 2. 如果指定了港口，进一步过滤（trucking_port_mapping）
   * 3. 检查每个车队的可用性（档期约束）
   *
   * @param filter - 筛选条件
   * @returns 候选车队列表
   */
  private async filterCandidateTruckingCompanies(filter: {
    warehouseCode: string;
    portCode?: string;
    countryCode?: string;
    plannedDate: Date;
  }): Promise<TruckingCandidate[]> {
    logger.info('[TruckingSelectorService] 开始筛选候选车队', {
      warehouseCode: filter.warehouseCode,
      portCode: filter.portCode,
      plannedDate: filter.plannedDate
    });

    const candidates: TruckingCandidate[] = [];

    try {
      // Step 1: 从 warehouse_trucking_mapping 获取仓库映射的车队 - 带缓存
      const mappingWhere: any = { warehouseCode: filter.warehouseCode, isActive: true };
      if (filter.countryCode) mappingWhere.country = filter.countryCode;

      const warehouseTruckingCacheKey = getSchedulingCacheKey(
        SchedulingCacheKeys.WAREHOUSE_TRUCKING_MAPPING,
        filter.countryCode || '',
        filter.warehouseCode
      );
      let mappings = await this.cacheService.get<WarehouseTruckingMapping[]>(warehouseTruckingCacheKey);
      
      if (!mappings) {
        mappings = await this.warehouseTruckingMappingRepo.find({
          where: mappingWhere,
          take: 20 // 限制数量，避免过多
        });
        // 缓存映射关系（6小时）
        if (mappings.length > 0) {
          await this.cacheService.set(warehouseTruckingCacheKey, mappings, SchedulingCacheTTL.MAPPING);
        }
      }

      let candidateIds = mappings.map((m) => m.truckingCompanyId);

      // Step 2: 如果指定了港口，进一步过滤 - 带缓存
      if (filter.portCode && filter.countryCode) {
        const portTruckingCacheKey = getSchedulingCacheKey(
          SchedulingCacheKeys.PORT_TRUCKING_MAPPING,
          filter.countryCode,
          filter.portCode
        );
        let portMappings = await this.cacheService.get<TruckingPortMapping[]>(portTruckingCacheKey);
        
        if (!portMappings) {
          portMappings = await this.truckingPortMappingRepo.find({
            where: { portCode: filter.portCode, country: filter.countryCode, isActive: true }
          });
          // 缓存映射关系（6小时）
          if (portMappings.length > 0) {
            await this.cacheService.set(portTruckingCacheKey, portMappings, SchedulingCacheTTL.MAPPING);
          }
        }
        
        const portTruckingIds = new Set(portMappings.map((pm) => pm.truckingCompanyId));
        candidateIds = candidateIds.filter((id) => portTruckingIds.has(id));
      }

      // Step 3: 检查每个车队的可用性
      for (const truckingId of candidateIds) {
        // 车队档期不做全局缓存（因为是按日期查询），但可以使用短期缓存
        const occupancy = await this.truckingOccupancyRepo.findOne({
          where: {
            truckingCompanyId: truckingId,
            date: filter.plannedDate,
            portCode: filter.portCode ?? undefined,
            warehouseCode: filter.warehouseCode
          }
        });

        const hasCapacity = !occupancy || occupancy.plannedTrips < occupancy.capacity;

        if (hasCapacity) {
          candidates.push({
            truckingCompanyId: truckingId,
            hasCapacity
          });
        }
      }

      logger.info('[TruckingSelectorService] 候选车队筛选完成', {
        count: candidates.length
      });

      return candidates;
    } catch (error) {
      logger.error('[TruckingSelectorService] 筛选候选车队失败', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 对候选车队进行综合评分
   *
   * 评分维度：
   * 1. 成本评分（30% 权重）- 成本越低分数越高
   * 2. 能力评分（20% 权重）- 有剩余能力=100 分
   * 3. 关系评分（20% 权重）- 基于合作关系级别
   * 4. 卸柜模式兼容度（30% 权重）- 2026-04-01新增
   *
   * @param candidates - 候选车队列表
   * @param warehouseCode - 仓库代码
   * @param portCode - 港口代码
   * @param modeOptions - 卸柜模式偏好选项
   * @returns 评分结果列表
   */
  private async scoreTruckingCompanies(
    candidates: TruckingCandidate[],
    warehouseCode: string,
    portCode?: string,
    modeOptions?: {
      preferredUnloadMode?: 'Drop off' | 'Live load' | 'any';
      lastFreeDate?: Date;
      basePickupDate?: Date;
    }
  ): Promise<TruckingScoreResult[]> {
    logger.info('[TruckingSelectorService] 开始车队评分', {
      count: candidates.length
    });

    const scoredCandidates: TruckingScoreResult[] = [];

    try {
      // Step 1: 批量计算每个车队的运输成本（优化 N+1 问题）
      const costMap = new Map<string, number>();
      // 批量获取所有映射关系
      const allMappings = await this.warehouseTruckingMappingRepo.find({
        where: {
          warehouseCode,
          truckingCompanyId: In(candidates.map(c => c.truckingCompanyId)),
          isActive: true
        }
      });
      const mappingByTrucking = new Map(allMappings.map(m => [m.truckingCompanyId, m]));
      
      for (const candidate of candidates) {
        const mapping = mappingByTrucking.get(candidate.truckingCompanyId);
        costMap.set(candidate.truckingCompanyId, Number(mapping?.transportFee || 100));
      }

      // Step 2: 归一化成本评分（最低成本=100 分）
      const costs = Array.from(costMap.values());
      const minCost = Math.min(...costs);
      const maxCost = Math.max(...costs);
      const costRange = maxCost - minCost || 1;

      // Step 3: 批量获取所有车队的 hasYard 和 partnershipLevel 信息（优化 N+1 问题）
      const truckingCompanies = await this.truckingCompanyRepo.find({
        where: { companyCode: In(candidates.map(c => c.truckingCompanyId)) },
        select: ['companyCode', 'hasYard', 'partnershipLevel']
      });
      const truckingYardMap = new Map(truckingCompanies.map(t => [t.companyCode, t?.hasYard ?? false]));
      const truckingLevelMap = new Map(truckingCompanies.map(t => [t.companyCode, t?.partnershipLevel]));

      // Step 4: 计算卸柜模式兼容度
      // 评估逻辑：
      // - 如果有 lastFreeDate 和 basePickupDate，计算延迟天数
      // - daysDiff > 1 且车队无堆场 → 需要 Drop off，但车队不支持 → 兼容度低
      // - daysDiff <= 1 → Live load 和 Drop off 都可 → 兼容度高
      // - preferredUnloadMode 指定模式 → 与车队匹配度高
      const calculateUnloadModeScore = (hasYard: boolean): number => {
        if (!modeOptions?.lastFreeDate || !modeOptions?.basePickupDate) {
          // 无模式偏好信息，默认 50 分
          return 50;
        }

        // 计算延迟天数
        const daysDiff = Math.ceil(
          (modeOptions.lastFreeDate.getTime() - modeOptions.basePickupDate.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        const preferredMode = modeOptions.preferredUnloadMode || 'any';

        // 如果延迟>1天且无堆场，但需要 Drop off → 低分
        if (daysDiff > 1 && !hasYard && preferredMode === 'Drop off') {
          return 20; // 需要 Drop off 但车队无堆场
        }

        // 如果延迟<=1天，Live load 是最优选择
        if (daysDiff <= 1 && preferredMode === 'Live load') {
          return hasYard ? 80 : 100; // 无堆场更匹配
        }

        // 如果延迟>1天，Drop off 是最优选择
        if (daysDiff > 1 && preferredMode === 'Drop off') {
          return hasYard ? 100 : 30; // 有堆场更匹配
        }

        // 无偏好或 any
        return 50;
      };

      // Step 5: 对每个车队评分（使用已批量加载的数据，无需额外查询）
      for (const candidate of candidates) {
        const cost = costMap.get(candidate.truckingCompanyId) || 100;
        const hasYard = truckingYardMap.get(candidate.truckingCompanyId) ?? false;

        // 成本评分（30% 权重）- 成本越低分数越高
        const costScore = ((maxCost - cost) / costRange) * 100;

        // 能力评分（20% 权重）- 有剩余能力=100 分
        const capacityScore = candidate.hasCapacity ? 100 : 0;

        // 关系评分（20% 权重）- 基于合作关系级别（使用已加载的 truckingLevelMap）
        const partnershipLevel = truckingLevelMap.get(candidate.truckingCompanyId);
        let relationshipScore: number;
        switch (partnershipLevel) {
          case 'STRATEGIC': relationshipScore = 100; break;
          case 'CORE': relationshipScore = 80; break;
          case 'NORMAL': relationshipScore = 60; break;
          case 'TEMPORARY': relationshipScore = 40; break;
          default: relationshipScore = 50;
        }

        // 卸柜模式兼容度（30% 权重）
        const unloadModeScore = calculateUnloadModeScore(hasYard);

        // 综合得分
        const totalScore =
          costScore * 0.3 + capacityScore * 0.2 + relationshipScore * 0.2 + unloadModeScore * 0.3;

        scoredCandidates.push({
          truckingCompanyId: candidate.truckingCompanyId,
          costScore,
          capacityScore,
          relationshipScore,
          unloadModeScore,
          totalScore,
          transportCost: cost,
          hasYard
        });
      }

      logger.info('[TruckingSelectorService] 车队评分完成', {
        count: scoredCandidates.length
      });

      return scoredCandidates;
    } catch (error) {
      logger.error('[TruckingSelectorService] 车队评分失败', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 计算单个车队的运输成本
   *
   * @param truckingCompanyId - 车队代码
   * @param warehouseCode - 仓库代码
   * @param portCode - 港口代码
   * @returns 运输成本
   */
  private async calculateTruckingCost(
    truckingCompanyId: string,
    warehouseCode: string,
    _portCode?: string
  ): Promise<number> {
    try {
      // 从 warehouse_trucking_mapping 获取基础运费
      const mapping = await this.warehouseTruckingMappingRepo.findOne({
        where: {
          warehouseCode,
          truckingCompanyId,
          isActive: true
        }
      });

      const transportFee = Number(mapping?.transportFee || 100);

      // TODO: 如果车队有堆场且需要 Drop off，考虑堆场费
      // 这部分逻辑可以后续提取

      return transportFee;
    } catch (error) {
      logger.error('[TruckingSelectorService] 计算运输成本失败', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 100; // 返回默认值
    }
  }

  /**
   * 计算合作关系评分
   *
   * 基于车队合作关系级别进行评分：
   * - 战略合作伙伴（STRATEGIC）：100 分
   * - 核心合作伙伴（CORE）：80 分
   * - 一般合作伙伴（NORMAL）：60 分
   * - 临时合作伙伴（TEMPORARY）：40 分
   *
   * @param truckingCompanyId - 车队代码
   * @returns 关系评分（0-100）
   */
  private async calculateRelationshipScore(truckingCompanyId: string): Promise<number> {
    try {
      const trucking = await this.truckingCompanyRepo.findOne({
        where: { companyCode: truckingCompanyId },
        select: ['partnershipLevel']
      });

      const level = trucking?.partnershipLevel;

      // 根据合作关系级别评分
      switch (level) {
        case 'STRATEGIC':
          return 100;
        case 'CORE':
          return 80;
        case 'NORMAL':
          return 60;
        case 'TEMPORARY':
          return 40;
        default:
          return 50; // 未知级别默认 50 分
      }
    } catch (error) {
      logger.error('[TruckingSelectorService] 计算关系评分失败', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 50;
    }
  }
}
