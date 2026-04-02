/**
 * 智能排产评分规则配置
 * Intelligent Scheduling Scoring Rules Configuration
 *
 * 集中管理车队/仓库评分相关的硬编码规则，便于调整和维护
 * 包含：评分权重、关系级别加分、能力阈值等
 */

import { COST_OPTIMIZATION_CONFIG } from '../config/scheduling.config';

/**
 * 评分权重配置
 */
export const SCORING_WEIGHTS = {
  /** 成本评分权重 */
  COST: 0.4,

  /** 能力评分权重 */
  CAPACITY: 0.3,

  /** 关系评分权重 */
  RELATIONSHIP: 0.3
} as const;

/**
 * 车队关系级别加分配置
 * 用于基于合作紧密程度的评分加成
 */
export const PARTNERSHIP_LEVEL_BONUS: Record<string, number> = {
  /** 战略合作伙伴 - 最高优先级 */
  STRATEGIC: 30,
  /** 核心合作伙伴 */
  CORE: 20,
  /** 普通合作伙伴 - 默认级别 */
  NORMAL: 10,
  /** 临时合作伙伴 */
  TEMPORARY: 0
} as const;

/**
 * 能力评分配置
 */
export const CAPACITY_SCORING = {
  /** 有剩余能力时的评分 */
  HAS_CAPACITY_SCORE: 100,

  /** 无剩余能力时的评分 */
  NO_CAPACITY_SCORE: 0,

  /** 大运力车队加分阈值（日处理量） */
  LARGE_CAPACITY_THRESHOLD: 50,

  /** 大运力车队加分 */
  LARGE_CAPACITY_BONUS: 15
} as const;

/**
 * 关系评分配置
 */
export const RELATIONSHIP_SCORING = {
  /** 基础分 */
  BASE_SCORE: 50,

  /** 历史合作加分上限 */
  COLLABORATION_BONUS_MAX: 20,

  /** 历史合作加分系数（每个合作 * 系数） */
  COLLABORATION_BONUS_FACTOR: 2,

  /** 合作统计天数 */
  COLLABORATION_DAYS: 30,

  /** 服务质量加分（使用配置的基准分） */
  SERVICE_QUALITY_BONUS: COST_OPTIMIZATION_CONFIG.BASE_SERVICE_QUALITY_SCORE
} as const;

/**
 * 卸柜模式评分配置
 */
export const UNLOAD_MODE_SCORING = {
  /** 无偏好信息时的默认分 */
  DEFAULT_SCORE: 50,

  /** Drop off 模式兼容（有时间差+无堆场） */
  DROP_OFF_NO_YARD_PENALTY: 20,

  /** Live load 模式兼容（时间差小+有堆场） */
  LIVE_LOAD_WITH_YARD_SCORE: 80,

  /** Live load 模式兼容（时间差小+无堆场） */
  LIVE_LOAD_NO_YARD_SCORE: 100,

  /** Drop off 模式兼容（有时间差+有堆场） */
  DROP_OFF_WITH_YARD_SCORE: 100,

  /** Drop off 模式兼容（有时间差+无堆场） */
  DROP_OFF_NO_YARD_SCORE: 30,

  /** 偏好模式 + 时间差阈值（天） */
  MODE_PREFERENCE_DAYS_THRESHOLD: 1
} as const;

/**
 * 仓库属性优先级配置
 */
export const WAREHOUSE_PROPERTY_PRIORITY: Record<string, number> = {
  /** 自营仓库 */
  SELF_OPERATED: 1,
  /** 平台仓库 */
  PLATFORM: 2,
  /** 第三方仓库 */
  THIRD_PARTY: 3
} as const;

/**
 * 导出所有规则配置
 */
export const SCHEDULING_RULES = {
  SCORING_WEIGHTS,
  PARTNERSHIP_LEVEL_BONUS,
  CAPACITY_SCORING,
  RELATIONSHIP_SCORING,
  UNLOAD_MODE_SCORING,
  WAREHOUSE_PROPERTY_PRIORITY
} as const;

/**
 * 获取合作关系级别加分
 */
export function getPartnershipLevelBonus(level: string | null | undefined): number {
  return PARTNERSHIP_LEVEL_BONUS[level || 'NORMAL'] ?? PARTNERSHIP_LEVEL_BONUS.NORMAL;
}

/**
 * 获取仓库属性优先级
 */
export function getWarehousePropertyPriority(property: string | null | undefined): number {
  return WAREHOUSE_PROPERTY_PRIORITY[property || 'THIRD_PARTY'] ?? 999;
}
