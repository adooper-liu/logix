/**
 * 规则引擎 API 服务
 * Rule Engine API Service
 */

import api from './api';
import type { AxiosRequestConfig } from 'axios';

// ==================== 类型定义 ====================

/** 规则类型 */
export type RuleType = 'WAREHOUSE_SCORING' | 'TRUCKING_SCORING' | 'DATE_CALCULATION' | 'CAPACITY_PLANNING' | 'COST_ESTIMATION';

/** 变更类型 */
export type ChangeType = 'CREATE' | 'UPDATE' | 'DELETE' | 'ACTIVATE' | 'DEACTIVATE';

/** 规则条件配置 */
export interface RuleConditions {
  countryCodes?: string[];
  portCodes?: string[];
  warehouseCodes?: string[];
  warehouseTypes?: string[];
  truckingCodes?: string[];
  truckingTypes?: string[];
  timeRange?: {
    startHour?: number;
    endHour?: number;
    daysOfWeek?: number[];
  };
}

/** 评分调整配置 */
export interface ScoreAdjustment {
  costWeight?: number;
  capacityWeight?: number;
  relationshipWeight?: number;
  propertyPriorityBonus?: Record<string, number>;
  scoreWeights?: {
    cost: number;
    capacity: number;
    relationship: number;
  };
}

/** 加分项配置 */
export interface BonusConfig {
  partnershipLevel?: Record<string, number>;
  capacityThreshold?: number;
  capacityBonus?: number;
  collaborationBonusFactor?: number;
  collaborationBonusMax?: number;
}

/** 过滤条件配置 */
export interface FilterConfig {
  minCapacity?: number;
  excludeTypes?: string[];
}

/** 规则动作配置 */
export interface RuleActions {
  scoreAdjustments?: ScoreAdjustment;
  bonusPoints?: BonusConfig;
  filters?: FilterConfig;
}

/** 规则实体 */
export interface SchedulingRule {
  ruleId: string;
  ruleName: string;
  ruleNameEn?: string;
  ruleCode: string;
  ruleDescription?: string;
  ruleType: RuleType;
  conditions: RuleConditions;
  actions: RuleActions;
  priority: number;
  isActive: boolean;
  isDefault: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  applyTo: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  version: number;
}

/** 规则历史 */
export interface RuleHistory {
  historyId: number;
  ruleId: string;
  ruleSnapshot: Partial<SchedulingRule>;
  changeType: ChangeType;
  changeReason?: string;
  changedBy?: string;
  changedAt: string;
}

/** 创建规则请求 */
export interface CreateRuleDto {
  ruleId: string;
  ruleName: string;
  ruleNameEn?: string;
  ruleCode: string;
  ruleDescription?: string;
  ruleType: RuleType;
  conditions?: RuleConditions;
  actions?: RuleActions;
  priority?: number;
  isActive?: boolean;
  isDefault?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  applyTo: string;
}

/** 更新规则请求 */
export interface UpdateRuleDto {
  ruleName?: string;
  ruleNameEn?: string;
  ruleDescription?: string;
  conditions?: RuleConditions;
  actions?: RuleActions;
  priority?: number;
  isActive?: boolean;
  isDefault?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
}

/** 查询规则请求 */
export interface QueryRulesDto {
  ruleType?: RuleType;
  applyTo?: string;
  isActive?: boolean;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

/** 规则列表响应 */
export interface RuleListResponse {
  items: SchedulingRule[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 测试规则执行请求 */
export interface ExecuteRuleTestDto {
  executionId: string;
  countryCode?: string;
  portCode?: string;
  warehouseCode?: string;
  warehouseType?: string;
  truckingCode?: string;
  truckingType?: string;
  baseCostScore?: number;
  baseCapacityScore?: number;
  baseRelationshipScore?: number;
}

/** 测试规则执行响应 */
export interface ExecuteRuleResponse {
  matchedRule: {
    ruleId: string;
    ruleCode: string;
    ruleName: string;
    priority: number;
  } | null;
  appliedActions: RuleActions | null;
  originalScores: {
    cost: number;
    capacity: number;
    relationship: number;
  };
  adjustedScores: {
    cost: number;
    capacity: number;
    relationship: number;
    weights: {
      cost: number;
      capacity: number;
      relationship: number;
    };
  };
  executionTimeMs: number;
}

// ==================== API 服务 ====================

const BASE_URL = '/scheduling/rules';

/**
 * 规则引擎 API
 */
export const schedulingRuleApi = {
  // ========== 规则 CRUD ==========

  /**
   * 创建规则
   */
  createRule: (data: CreateRuleDto) => {
    return api.post<SchedulingRule>(`${BASE_URL}`, data);
  },

  /**
   * 更新规则
   */
  updateRule: (ruleId: string, data: UpdateRuleDto) => {
    return api.put<SchedulingRule>(`${BASE_URL}/${ruleId}`, data);
  },

  /**
   * 删除规则
   */
  deleteRule: (ruleId: string) => {
    return api.delete<{ success: boolean }>(`${BASE_URL}/${ruleId}`);
  },

  /**
   * 查询规则列表
   */
  queryRules: (params?: QueryRulesDto) => {
    return api.get<RuleListResponse>(`${BASE_URL}`, { params });
  },

  /**
   * 获取所有启用规则
   */
  getActiveRules: (applyTo?: string) => {
    return api.get<SchedulingRule[]>(`${BASE_URL}/active`, {
      params: applyTo ? { applyTo } : undefined
    });
  },

  /**
   * 获取规则详情
   */
  getRuleById: (ruleId: string) => {
    return api.get<SchedulingRule>(`${BASE_URL}/${ruleId}`);
  },

  /**
   * 获取规则变更历史
   */
  getRuleHistory: (ruleId: string, limit?: number) => {
    return api.get<RuleHistory[]>(`${BASE_URL}/${ruleId}/history`, {
      params: limit ? { limit } : undefined
    });
  },

  // ========== 规则状态管理 ==========

  /**
   * 激活规则
   */
  activateRule: (ruleId: string) => {
    return api.post<SchedulingRule>(`${BASE_URL}/${ruleId}/activate`);
  },

  /**
   * 停用规则
   */
  deactivateRule: (ruleId: string) => {
    return api.post<SchedulingRule>(`${BASE_URL}/${ruleId}/deactivate`);
  },

  /**
   * 重新加载规则缓存
   */
  reloadRules: () => {
    return api.post<{ success: boolean; message: string }>(`${BASE_URL}/reload`);
  },

  // ========== 规则测试 ==========

  /**
   * 测试规则执行
   */
  testExecute: (data: ExecuteRuleTestDto) => {
    return api.post<ExecuteRuleResponse>(`${BASE_URL}/test-execute`, data);
  }
};

export default schedulingRuleApi;
