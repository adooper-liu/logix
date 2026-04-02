/**
 * 智能排产规则引擎服务
 * Intelligent Scheduling Rule Engine Service
 *
 * 功能：
 * 1. 规则存储和检索（从数据库加载规则）
 * 2. 规则匹配（根据上下文匹配适用规则）
 * 3. 规则执行（应用规则动作到评分）
 * 4. 规则历史记录
 */

import { AppDataSource } from '../database';
import {
  SchedulingRule,
  SchedulingRuleDimension,
  SchedulingRuleScoreAction,
  SchedulingRuleHistory,
  SchedulingRuleExecutionLog,
  RuleType,
  ChangeType,
  DimensionType,
  OperatorType,
  ScoreDimension,
  ActionType,
  RuleConditions,
  RuleActions
} from '../entities/SchedulingRule.entities';
import { SCHEDULING_RULES, SCORING_WEIGHTS, PARTNERSHIP_LEVEL_BONUS } from '../constants/SchedulingRules';
import { COST_OPTIMIZATION_CONFIG } from '../config/scheduling.config';
import { logger } from '../utils/logger';

/**
 * 规则执行上下文
 */
export interface RuleExecutionContext {
  // 基本信息
  executionId: string;
  countryCode?: string;
  portCode?: string;
  warehouseCode?: string;
  warehouseType?: string;
  truckingCode?: string;
  truckingType?: string;
  containerType?: string;

  // 时间信息
  executionDate?: Date;
  dayOfWeek?: number;

  // 评分相关
  baseScores?: {
    cost?: number;
    capacity?: number;
    relationship?: number;
    quality?: number;
    distance?: number;
  };
}

/**
 * 规则执行结果
 */
export interface RuleExecutionResult {
  matchedRule: SchedulingRule | null;
  matchedConditions: RuleConditions;
  nonMatchedConditions: RuleConditions;
  adjustedScores: {
    cost?: number;
    capacity?: number;
    relationship?: number;
    quality?: number;
    distance?: number;
    weights?: {
      cost?: number;
      capacity?: number;
      relationship?: number;
    };
  };
  executionTimeMs: number;
}

/**
 * 规则引擎服务
 */
export class RuleEngineService {
  private static instance: RuleEngineService;

  // 缓存
  private ruleCache: Map<string, { rules: SchedulingRule[]; cachedAt: Date }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5分钟缓存

  private constructor() {}

  static getInstance(): RuleEngineService {
    if (!RuleEngineService.instance) {
      RuleEngineService.instance = new RuleEngineService();
    }
    return RuleEngineService.instance;
  }

  // ==================== 规则存储操作 ====================

  /**
   * 创建规则
   */
  async createRule(rule: Partial<SchedulingRule>, createdBy?: string): Promise<SchedulingRule> {
    const repo = AppDataSource.getRepository(SchedulingRule);

    const newRule = repo.create(rule);
    newRule.createdBy = createdBy;
    newRule.updatedBy = createdBy;

    const savedRule = await repo.save(newRule);

    // 记录历史
    await this.recordHistory(savedRule.ruleId, ChangeType.CREATE, { ...savedRule }, createdBy);

    // 清除缓存
    this.clearCache();

    logger.info(`[RuleEngine] Created rule: ${savedRule.ruleCode}`);
    return savedRule;
  }

  /**
   * 更新规则
   */
  async updateRule(
    ruleId: string,
    updates: Partial<SchedulingRule>,
    updatedBy?: string,
    changeReason?: string
  ): Promise<SchedulingRule | null> {
    const repo = AppDataSource.getRepository(SchedulingRule);

    const existingRule = await repo.findOne({ where: { ruleId } });
    if (!existingRule) {
      logger.warn(`[RuleEngine] Rule not found: ${ruleId}`);
      return null;
    }

    // 记录变更前快照
    const beforeSnapshot = { ...existingRule };

    // 更新字段
    Object.assign(existingRule, updates);
    existingRule.updatedBy = updatedBy;
    existingRule.version += 1;

    const savedRule = await repo.save(existingRule);

    // 记录历史
    await this.recordHistory(
      savedRule.ruleId,
      ChangeType.UPDATE,
      { before: beforeSnapshot, after: savedRule, reason: changeReason },
      updatedBy
    );

    // 清除缓存
    this.clearCache();

    logger.info(`[RuleEngine] Updated rule: ${savedRule.ruleCode}`);
    return savedRule;
  }

  /**
   * 删除规则
   */
  async deleteRule(ruleId: string, deletedBy?: string): Promise<boolean> {
    const repo = AppDataSource.getRepository(SchedulingRule);

    const rule = await repo.findOne({ where: { ruleId } });
    if (!rule) {
      return false;
    }

    // 记录历史（删除前）
    await this.recordHistory(ruleId, ChangeType.DELETE, { ...rule }, deletedBy);

    await repo.remove(rule);

    // 清除缓存
    this.clearCache();

    logger.info(`[RuleEngine] Deleted rule: ${ruleId}`);
    return true;
  }

  /**
   * 获取所有启用的规则
   */
  async getActiveRules(applyTo?: string): Promise<SchedulingRule[]> {
    const cacheKey = `rules:${applyTo || 'all'}`;

    // 检查缓存
    const cached = this.ruleCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt.getTime() < this.CACHE_TTL_MS) {
      return cached.rules;
    }

    const repo = AppDataSource.getRepository(SchedulingRule);
    const now = new Date();

    const query = repo
      .createQueryBuilder('rule')
      .where('rule.is_active = :isActive', { isActive: true })
      .andWhere(
        '(rule.effective_from IS NULL OR rule.effective_from <= :now)',
        { now }
      )
      .andWhere(
        '(rule.effective_to IS NULL OR rule.effective_to >= :now)',
        { now }
      )
      .orderBy('rule.priority', 'ASC');

    if (applyTo) {
      query.andWhere('rule.apply_to = :applyTo', { applyTo });
    }

    const rules = await query.getMany();

    // 更新缓存
    this.ruleCache.set(cacheKey, { rules, cachedAt: new Date() });

    return rules;
  }

  /**
   * 获取规则历史
   */
  async getRuleHistory(ruleId: string, limit = 50): Promise<SchedulingRuleHistory[]> {
    const repo = AppDataSource.getRepository(SchedulingRuleHistory);
    return repo.find({
      where: { ruleId },
      order: { changedAt: 'DESC' },
      take: limit
    });
  }

  // ==================== 规则匹配 ====================

  /**
   * 根据上下文匹配规则
   */
  async matchRules(context: RuleExecutionContext): Promise<SchedulingRule[]> {
    const rules = await this.getActiveRules(context.executionId.split('-')[0]);

    const matchedRules: Array<{ rule: SchedulingRule; matchScore: number }> = [];

    for (const rule of rules) {
      const matchResult = this.evaluateRuleMatch(rule, context);
      if (matchResult.matched) {
        matchedRules.push({ rule, matchScore: matchResult.score });
      }
    }

    // 按匹配度排序（优先级高的先匹配）
    matchedRules.sort((a, b) => a.rule.priority - b.rule.priority);

    return matchedRules.map(m => m.rule);
  }

  /**
   * 评估规则匹配度
   */
  private evaluateRuleMatch(
    rule: SchedulingRule,
    context: RuleExecutionContext
  ): { matched: boolean; score: number } {
    const conditions = rule.conditions as RuleConditions;
    let matchScore = 0;
    let totalWeight = 0;

    // 逐个条件评估
    const evaluations: Array<{ dimension: string; matched: boolean; weight: number }> = [];

    // 国家匹配
    if (conditions.countryCodes && conditions.countryCodes.length > 0) {
      totalWeight += 1;
      const matched = !context.countryCode || conditions.countryCodes.includes(context.countryCode);
      if (matched) matchScore += 1;
      evaluations.push({ dimension: 'country', matched, weight: 1 });
    }

    // 港口匹配
    if (conditions.portCodes && conditions.portCodes.length > 0) {
      totalWeight += 1;
      const matched = !context.portCode || conditions.portCodes.includes(context.portCode);
      if (matched) matchScore += 1;
      evaluations.push({ dimension: 'port', matched, weight: 1 });
    }

    // 仓库类型匹配
    if (conditions.warehouseTypes && conditions.warehouseTypes.length > 0) {
      totalWeight += 1;
      const matched = !context.warehouseType || conditions.warehouseTypes.includes(context.warehouseType as any);
      if (matched) matchScore += 1;
      evaluations.push({ dimension: 'warehouseType', matched, weight: 1 });
    }

    // 车队类型匹配
    if (conditions.truckingTypes && conditions.truckingTypes.length > 0) {
      totalWeight += 1;
      const matched = !context.truckingType || conditions.truckingTypes.includes(context.truckingType as any);
      if (matched) matchScore += 1;
      evaluations.push({ dimension: 'truckingType', matched, weight: 1 });
    }

    // 如果没有任何条件，或者所有条件都匹配
    if (totalWeight === 0 || matchScore === totalWeight) {
      return { matched: true, score: 100 };
    }

    // 部分匹配
    const matchPercentage = (matchScore / totalWeight) * 100;
    return { matched: matchPercentage >= 50, score: matchPercentage };
  }

  // ==================== 规则执行 ====================

  /**
   * 执行规则（应用到评分）
   */
  async executeRules(context: RuleExecutionContext): Promise<RuleExecutionResult> {
    const startTime = Date.now();
    const matchedRules = await this.matchRules(context);

    const result: RuleExecutionResult = {
      matchedRule: matchedRules[0] || null,
      matchedConditions: {},
      nonMatchedConditions: {},
      adjustedScores: {},
      executionTimeMs: 0
    };

    // 初始化分数（使用默认配置）
    let adjustedScores = {
      cost: context.baseScores?.cost ?? 50,
      capacity: context.baseScores?.capacity ?? 50,
      relationship: context.baseScores?.relationship ?? 50,
      quality: context.baseScores?.quality ?? 50,
      distance: context.baseScores?.distance ?? 50,
      weights: {
        cost: SCORING_WEIGHTS.COST,
        capacity: SCORING_WEIGHTS.CAPACITY,
        relationship: SCORING_WEIGHTS.RELATIONSHIP
      }
    };

    // 应用匹配到的规则
    for (const rule of matchedRules) {
      adjustedScores = this.applyRuleActions(rule, adjustedScores, context);
    }

    // 如果没有匹配到任何规则，尝试使用默认规则
    if (!result.matchedRule) {
      const defaultRules = await this.getActiveRules();
      const defaultRule = defaultRules.find(r => r.isDefault);
      if (defaultRule) {
        result.matchedRule = defaultRule;
        adjustedScores = this.applyRuleActions(defaultRule, adjustedScores, context);
      }
    }

    result.adjustedScores = adjustedScores;
    result.executionTimeMs = Date.now() - startTime;

    // 记录执行日志
    await this.logExecution(context, result);

    return result;
  }

  /**
   * 应用规则动作
   */
  private applyRuleActions(
    rule: SchedulingRule,
    currentScores: any,
    _context: RuleExecutionContext
  ): any {
    const actions = rule.actions as RuleActions;
    const newScores = { ...currentScores };

    // 应用评分权重调整
    if (actions.scoreAdjustments?.scoreWeights) {
      const weights = actions.scoreAdjustments.scoreWeights;
      if (weights.cost !== undefined) newScores.weights.cost = weights.cost;
      if (weights.capacity !== undefined) newScores.weights.capacity = weights.capacity;
      if (weights.relationship !== undefined) newScores.weights.relationship = weights.relationship;
    }

    // 应用加分项
    if (actions.bonusPoints) {
      const bonus = actions.bonusPoints;

      // 合作关系级别加分
      if (bonus.partnershipLevel) {
        const truckingType = _context.truckingType || 'NORMAL';
        const levelBonus = bonus.partnershipLevel[truckingType] ?? 0;
        newScores.relationship = (newScores.relationship || 50) + levelBonus;
      }

      // 能力加分（如果满足阈值）
      if (bonus.capacityThreshold && bonus.capacityBonus) {
        if (newScores.capacity && newScores.capacity >= bonus.capacityThreshold) {
          newScores.capacity += bonus.capacityBonus;
        }
      }
    }

    // 确保分数在有效范围内
    newScores.cost = Math.max(0, Math.min(100, newScores.cost || 0));
    newScores.capacity = Math.max(0, Math.min(100, newScores.capacity || 0));
    newScores.relationship = Math.max(0, Math.min(100, newScores.relationship || 0));

    return newScores;
  }

  // ==================== 辅助方法 ====================

  /**
   * 记录规则历史
   */
  private async recordHistory(
    ruleId: string,
    changeType: ChangeType,
    snapshot: any,
    changedBy?: string
  ): Promise<void> {
    const repo = AppDataSource.getRepository(SchedulingRuleHistory);

    const history = repo.create({
      ruleId,
      ruleSnapshot: snapshot,
      changeType,
      changedBy
    });

    await repo.save(history);
  }

  /**
   * 记录执行日志
   */
  private async logExecution(
    context: RuleExecutionContext,
    result: RuleExecutionResult
  ): Promise<void> {
    try {
      const repo = AppDataSource.getRepository(SchedulingRuleExecutionLog);

      const log = repo.create({
        executionId: context.executionId,
        matchedRuleId: result.matchedRule?.ruleId,
        matchedConditions: result.matchedConditions,
        nonMatchedConditions: result.nonMatchedConditions,
        actionTaken: result.matchedRule?.actions,
        scoreBefore: context.baseScores?.relationship,
        scoreAfter: result.adjustedScores.relationship,
        contextData: {
          countryCode: context.countryCode,
          portCode: context.portCode,
          warehouseCode: context.warehouseCode,
          truckingCode: context.truckingCode
        },
        executionTimeMs: result.executionTimeMs
      });

      await repo.save(log);
    } catch (error) {
      logger.warn('[RuleEngine] Failed to log execution:', error);
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.ruleCache.clear();
    logger.debug('[RuleEngine] Cache cleared');
  }

  /**
   * 重新加载规则
   */
  async reloadRules(): Promise<void> {
    this.clearCache();
    await this.getActiveRules();
    logger.info('[RuleEngine] Rules reloaded');
  }
}

// 导出单例
export const ruleEngineService = RuleEngineService.getInstance();
