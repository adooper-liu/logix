/**
 * 智能排产规则引擎实体
 * Intelligent Scheduling Rule Engine Entities
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany
} from 'typeorm';
import { IsString, IsBoolean, IsInt, IsDate, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 规则类型枚举
 */
export enum RuleType {
  WAREHOUSE_SCORING = 'WAREHOUSE_SCORING',
  TRUCKING_SCORING = 'TRUCKING_SCORING',
  DATE_CALCULATION = 'DATE_CALCULATION',
  CAPACITY_PLANNING = 'CAPACITY_PLANNING',
  COST_ESTIMATION = 'COST_ESTIMATION'
}

/**
 * 变更类型枚举
 */
export enum ChangeType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  ACTIVATE = 'ACTIVATE',
  DEACTIVATE = 'DEACTIVATE'
}

/**
 * 维度类型枚举
 */
export enum DimensionType {
  COUNTRY = 'COUNTRY',
  PORT = 'PORT',
  WAREHOUSE = 'WAREHOUSE',
  WAREHOUSE_TYPE = 'WAREHOUSE_TYPE',
  TRUCKING = 'TRUCKING',
  TRUCKING_TYPE = 'TRUCKING_TYPE',
  TIME_RANGE = 'TIME_RANGE',
  DAY_OF_WEEK = 'DAY_OF_WEEK',
  CONTAINER_TYPE = 'CONTAINER_TYPE'
}

/**
 * 操作符枚举
 */
export enum OperatorType {
  IN = 'IN',
  NOT_IN = 'NOT_IN',
  EQ = 'EQ',
  NEQ = 'NEQ',
  GT = 'GT',
  GTE = 'GTE',
  LT = 'LT',
  LTE = 'LTE',
  BETWEEN = 'BETWEEN',
  LIKE = 'LIKE'
}

/**
 * 评分维度枚举
 */
export enum ScoreDimension {
  COST = 'COST',
  CAPACITY = 'CAPACITY',
  RELATIONSHIP = 'RELATIONSHIP',
  QUALITY = 'QUALITY',
  DISTANCE = 'DISTANCE'
}

/**
 * 动作类型枚举
 */
export enum ActionType {
  SET_WEIGHT = 'SET_WEIGHT',
  ADD_BONUS = 'ADD_BONUS',
  MULTIPLY_FACTOR = 'MULTIPLY_FACTOR',
  SET_OVERRIDE = 'SET_OVERRIDE',
  ADD_PENALTY = 'ADD_PENALTY'
}

// ==================== 条件配置类型 ====================

/** 仓库类型 */
export type WarehouseType = 'SELF_OPERATED' | 'PLATFORM' | 'THIRD_PARTY';

/** 车队关系级别 */
export type PartnershipLevel = 'STRATEGIC' | 'CORE' | 'NORMAL' | 'TEMPORARY';

/** 时间范围 */
export interface TimeRangeCondition {
  startHour?: number;
  endHour?: number;
  daysOfWeek?: number[];
}

/** 规则条件配置 */
export interface RuleConditions {
  countryCodes?: string[];
  portCodes?: string[];
  warehouseCodes?: string[];
  warehouseTypes?: WarehouseType[];
  truckingCodes?: string[];
  truckingTypes?: PartnershipLevel[];
  timeRange?: TimeRangeCondition;
}

/** 评分调整配置 */
export interface ScoreAdjustment {
  costWeight?: number;
  capacityWeight?: number;
  relationshipWeight?: number;
  propertyPriorityBonus?: Record<string, number>;
  [key: string]: any;
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
  [key: string]: any;
}

// ==================== 实体类 ====================

/**
 * 规则表实体
 */
@Entity('scheduling_rules')
@Index(['ruleType'])
@Index(['applyTo'])
@Index(['isActive'])
export class SchedulingRule {
  @PrimaryColumn({ name: 'rule_id', type: 'varchar', length: 50 })
  @IsString()
  ruleId!: string;

  @Column({ name: 'rule_name', type: 'varchar', length: 200 })
  @IsString()
  ruleName!: string;

  @Column({ name: 'rule_name_en', type: 'varchar', length: 200, nullable: true })
  @IsOptional()
  @IsString()
  ruleNameEn?: string;

  @Column({ name: 'rule_code', type: 'varchar', length: 100, unique: true })
  @IsString()
  ruleCode!: string;

  @Column({ name: 'rule_description', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  ruleDescription?: string;

  @Column({ name: 'rule_type', type: 'varchar', length: 50 })
  ruleType!: RuleType;

  @Column({ name: 'conditions', type: 'jsonb', default: {} })
  conditions!: RuleConditions;

  @Column({ name: 'actions', type: 'jsonb', default: {} })
  actions!: RuleActions;

  @Column({ name: 'priority', type: 'int', default: 100 })
  @IsInt()
  priority!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  @IsBoolean()
  isActive!: boolean;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  @IsBoolean()
  isDefault!: boolean;

  @Column({ name: 'effective_from', type: 'date', nullable: true })
  @IsOptional()
  @Type(() => Date)
  effectiveFrom?: Date;

  @Column({ name: 'effective_to', type: 'date', nullable: true })
  @IsOptional()
  @Type(() => Date)
  effectiveTo?: Date;

  @Column({ name: 'apply_to', type: 'varchar', length: 50 })
  @IsString()
  applyTo!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  @IsString()
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  @IsString()
  updatedBy?: string;

  @Column({ name: 'version', type: 'int', default: 1 })
  @IsInt()
  version!: number;
}

/**
 * 规则历史表实体
 */
@Entity('scheduling_rule_history')
export class SchedulingRuleHistory {
  @PrimaryColumn({ name: 'history_id', type: 'int' })
  historyId!: number;

  @Column({ name: 'rule_id', type: 'varchar', length: 50 })
  @IsString()
  ruleId!: string;

  @Column({ name: 'rule_snapshot', type: 'jsonb' })
  ruleSnapshot!: Partial<SchedulingRule>;

  @Column({ name: 'change_type', type: 'varchar', length: 20 })
  changeType!: ChangeType;

  @Column({ name: 'change_reason', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  changeReason?: string;

  @Column({ name: 'changed_by', type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  @IsString()
  changedBy?: string;

  @CreateDateColumn({ name: 'changed_at' })
  changedAt!: Date;
}

/**
 * 规则维度表实体
 */
@Entity('scheduling_rule_dimensions')
@Index(['ruleId'])
@Index(['dimensionType'])
export class SchedulingRuleDimension {
  @PrimaryColumn({ name: 'dimension_id', type: 'int' })
  dimensionId!: number;

  @Column({ name: 'rule_id', type: 'varchar', length: 50 })
  @IsString()
  ruleId!: string;

  @Column({ name: 'dimension_type', type: 'varchar', length: 50 })
  dimensionType!: DimensionType;

  @Column({ name: 'dimension_values', type: 'jsonb', default: [] })
  dimensionValues!: string[];

  @Column({ name: 'operator', type: 'varchar', length: 20, default: OperatorType.IN })
  operator!: OperatorType;

  @Column({ name: 'range_min', type: 'decimal', precision: 10, scale: 2, nullable: true })
  @IsOptional()
  rangeMin?: number;

  @Column({ name: 'range_max', type: 'decimal', precision: 10, scale: 2, nullable: true })
  @IsOptional()
  rangeMax?: number;
}

/**
 * 规则评分动作表实体
 */
@Entity('scheduling_rule_score_actions')
@Index(['ruleId'])
@Index(['scoreDimension'])
export class SchedulingRuleScoreAction {
  @PrimaryColumn({ name: 'action_id', type: 'int' })
  actionId!: number;

  @Column({ name: 'rule_id', type: 'varchar', length: 50 })
  @IsString()
  ruleId!: string;

  @Column({ name: 'score_dimension', type: 'varchar', length: 50 })
  scoreDimension!: ScoreDimension;

  @Column({ name: 'action_type', type: 'varchar', length: 50 })
  actionType!: ActionType;

  @Column({ name: 'action_value', type: 'decimal', precision: 10, scale: 4 })
  actionValue!: number;

  @Column({ name: 'condition_threshold', type: 'decimal', precision: 10, scale: 4, nullable: true })
  @IsOptional()
  conditionThreshold?: number;

  @Column({ name: 'condition_operator', type: 'varchar', length: 20, nullable: true })
  @IsOptional()
  conditionOperator?: OperatorType;

  @Column({ name: 'min_value', type: 'decimal', precision: 10, scale: 4, nullable: true })
  @IsOptional()
  minValue?: number;

  @Column({ name: 'max_value', type: 'decimal', precision: 10, scale: 4, nullable: true })
  @IsOptional()
  maxValue?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

/**
 * 规则执行日志表实体
 */
@Entity('scheduling_rule_execution_log')
@Index(['executionId'])
@Index(['ruleId'])
@Index(['executedAt'])
export class SchedulingRuleExecutionLog {
  @PrimaryColumn({ name: 'log_id', type: 'bigint' })
  logId!: number;

  @Column({ name: 'execution_id', type: 'varchar', length: 100 })
  @IsString()
  executionId!: string;

  @Column({ name: 'matched_rule_id', type: 'varchar', length: 50, nullable: true })
  @IsOptional()
  @IsString()
  matchedRuleId?: string;

  @Column({ name: 'matched_conditions', type: 'jsonb', nullable: true })
  matchedConditions?: RuleConditions;

  @Column({ name: 'non_matched_conditions', type: 'jsonb', nullable: true })
  nonMatchedConditions?: RuleConditions;

  @Column({ name: 'action_taken', type: 'jsonb', nullable: true })
  actionTaken?: RuleActions;

  @Column({ name: 'score_before', type: 'decimal', precision: 10, scale: 4, nullable: true })
  scoreBefore?: number;

  @Column({ name: 'score_after', type: 'decimal', precision: 10, scale: 4, nullable: true })
  scoreAfter?: number;

  @Column({ name: 'context_data', type: 'jsonb', nullable: true })
  contextData?: Record<string, any>;

  @Column({ name: 'execution_time_ms', type: 'int', nullable: true })
  @IsOptional()
  executionTimeMs?: number;

  @CreateDateColumn({ name: 'executed_at' })
  executedAt!: Date;
}
