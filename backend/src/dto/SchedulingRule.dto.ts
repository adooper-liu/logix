/**
 * 规则管理 DTO
 * Rule Management Data Transfer Objects
 */

import {
  IsString,
  IsBoolean,
  IsInt,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  ValidateNested,
  Min,
  Max,
  IsDateString
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  RuleType,
  DimensionType,
  OperatorType,
  ScoreDimension,
  ActionType
} from '../entities/SchedulingRule.entities';

/**
 * 时间范围条件
 */
export class TimeRangeConditionDto {
  @IsOptional()
  @IsInt()
  startHour?: number;

  @IsOptional()
  @IsInt()
  endHour?: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  daysOfWeek?: number[];
}

/**
 * 规则条件配置
 */
export class RuleConditionsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  countryCodes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  portCodes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  warehouseCodes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  warehouseTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  truckingCodes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  truckingTypes?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => TimeRangeConditionDto)
  timeRange?: TimeRangeConditionDto;
}

/**
 * 评分调整配置
 */
export class ScoreAdjustmentDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  costWeight?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  capacityWeight?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  relationshipWeight?: number;

  @IsOptional()
  @IsObject()
  propertyPriorityBonus?: Record<string, number>;
}

/**
 * 加分项配置
 */
export class BonusConfigDto {
  @IsOptional()
  @IsObject()
  partnershipLevel?: Record<string, number>;

  @IsOptional()
  @IsInt()
  minCapacity?: number;

  @IsOptional()
  @IsInt()
  capacityBonus?: number;

  @IsOptional()
  @IsInt()
  collaborationBonusFactor?: number;

  @IsOptional()
  @IsInt()
  collaborationBonusMax?: number;
}

/**
 * 过滤条件配置
 */
export class FilterConfigDto {
  @IsOptional()
  @IsInt()
  minCapacity?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeTypes?: string[];
}

/**
 * 规则动作配置
 */
export class RuleActionsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ScoreAdjustmentDto)
  scoreAdjustments?: ScoreAdjustmentDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BonusConfigDto)
  bonusPoints?: BonusConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FilterConfigDto)
  filters?: FilterConfigDto;
}

/**
 * 创建规则请求
 */
export class CreateRuleDto {
  @IsString()
  ruleId!: string;

  @IsString()
  ruleName!: string;

  @IsOptional()
  @IsString()
  ruleNameEn?: string;

  @IsString()
  ruleCode!: string;

  @IsOptional()
  @IsString()
  ruleDescription?: string;

  @IsEnum(RuleType)
  ruleType!: RuleType;

  @IsOptional()
  @ValidateNested()
  @Type(() => RuleConditionsDto)
  conditions?: RuleConditionsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => RuleActionsDto)
  actions?: RuleActionsDto;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsString()
  applyTo!: string;
}

/**
 * 更新规则请求
 */
export class UpdateRuleDto {
  @IsOptional()
  @IsString()
  ruleName?: string;

  @IsOptional()
  @IsString()
  ruleNameEn?: string;

  @IsOptional()
  @IsString()
  ruleDescription?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => RuleConditionsDto)
  conditions?: RuleConditionsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => RuleActionsDto)
  actions?: RuleActionsDto;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}

/**
 * 查询规则列表请求
 */
export class QueryRulesDto {
  @IsOptional()
  @IsEnum(RuleType)
  ruleType?: RuleType;

  @IsOptional()
  @IsString()
  applyTo?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

/**
 * 规则列表响应
 */
export class RuleListResponseDto {
  items!: any[];
  total!: number;
  page!: number;
  pageSize!: number;
  totalPages!: number;
}

/**
 * 规则历史查询
 */
export class QueryRuleHistoryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}

/**
 * 规则执行请求（用于测试）
 */
export class ExecuteRuleTestDto {
  @IsString()
  executionId!: string;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsString()
  portCode?: string;

  @IsOptional()
  @IsString()
  warehouseCode?: string;

  @IsOptional()
  @IsString()
  warehouseType?: string;

  @IsOptional()
  @IsString()
  truckingCode?: string;

  @IsOptional()
  @IsString()
  truckingType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  baseCostScore?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  baseCapacityScore?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  baseRelationshipScore?: number;
}

/**
 * 规则执行响应
 */
export class ExecuteRuleResponseDto {
  matchedRule!: {
    ruleId: string;
    ruleCode: string;
    ruleName: string;
    priority: number;
  } | null;

  appliedActions!: any;

  originalScores!: {
    cost: number;
    capacity: number;
    relationship: number;
  };

  adjustedScores!: {
    cost: number;
    capacity: number;
    relationship: number;
    weights: {
      cost: number;
      capacity: number;
      relationship: number;
    };
  };

  executionTimeMs!: number;
}
