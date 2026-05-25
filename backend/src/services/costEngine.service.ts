/**
 * 快递费成本引擎服务
 * Express Cost Engine Service
 *
 * 负责：
 * 1. 计费重计算（实重 vs 体积重）
 * 2. 规则匹配（尺寸/重量阈值判定）
 * 3. 互斥策略应用（IF_THEN_DISABLE / MAX_GROUP）
 * 4. 费用汇总与归因
 */

import { AppDataSource } from '../database';
import { BaseRateRow } from '../entities/BaseRateRow';
import { ExpressCarrierService } from '../entities/ExpressCarrierService';
import { ExpressStackPolicy } from '../entities/ExpressStackPolicy';
import { ExpressSurchargeRule } from '../entities/ExpressSurchargeRule';
import { PricingScheme } from '../entities/PricingScheme';
import { PricingVersion } from '../entities/PricingVersion';
import { ZoneLaneMapping } from '../entities/ZoneLaneMapping';
import { CalcMode } from '../types/pricing';
import { baseFreightEngineService } from './baseFreightEngine.service';
import { logger } from '../utils/logger';

// ==================== 类型定义 ====================

export interface ScenarioInput {
  // 基础信息
  countryCode: string;
  carrierServiceId: number;
  versionKey?: string; // 可选，默认使用最新版本

  // 包裹尺寸（英寸）
  longestIn: number;
  secondIn: number;
  shortestIn: number;

  // 重量（磅）
  grossWeightLbs: number;

  // 数量（用于多箱计价）
  quantity?: number;

  // 包装类型（用于 PACKAGING 规则）
  packagingType?: 'CARTON' | 'CYLINDER' | 'SOFT_PACK' | 'NON_CORRUGATED';

  // 基础价扩展（Phase A+）
  carrierCode?: string;
  serviceCode?: string;
  productLine?: 'PARCEL_EXPRESS' | 'LINEHAUL_INTL' | 'MID_LARGE_PIECE' | 'TRUCKING_CARD';
  destinationPostal?: string;
  originCode?: string;
  destinationCode?: string;
  grossWeightKg?: number;
}

export interface ChargeItem {
  type: string;
  typeRaw: string;
  amount: number;
  triggered: boolean;
  disabledBy?: string; // 被哪个规则禁用
  ruleId?: number;
  notes?: string;
}

export interface CostResult {
  status: 'OK' | 'REJECTED';
  rejectReason?: string;
  charges: ChargeItem[];
  totalSurcharge: number;
  baseFreight?: number;
  grandTotal?: number;
  zoneCode?: string;
  laneCode?: string;
  billableWeightLbs: number;
  volumeWeightLbs: number;
  metadata?: {
    rulesMatched: number;
    rulesDisabled: number;
  };
}

interface DimensionCheck {
  field: keyof ExpressSurchargeRule;
  operator: '>' | '>=' | '<' | '<=' | '==';
  value: number;
}

type LiteralOperator = '>' | '>=' | '<' | '<=' | '==' | '=';

interface LiteralCondition {
  field: string;
  operator: LiteralOperator;
  value: number;
}

// ==================== 成本引擎服务 ====================

export class CostEngineService {
  private ruleRepo = AppDataSource.getRepository(ExpressSurchargeRule);
  private policyRepo = AppDataSource.getRepository(ExpressStackPolicy);
  private carrierServiceRepo = AppDataSource.getRepository(ExpressCarrierService);
  private pricingVersionRepo = AppDataSource.getRepository(PricingVersion);
  private pricingSchemeRepo = AppDataSource.getRepository(PricingScheme);
  private baseRateRepo = AppDataSource.getRepository(BaseRateRow);
  private zoneLaneRepo = AppDataSource.getRepository(ZoneLaneMapping);

  /**
   * 计算附加费
   */
  async calculate(input: ScenarioInput): Promise<CostResult> {
    try {
      logger.info('[CostEngine] 开始计算', {
        countryCode: input.countryCode,
        carrierServiceId: input.carrierServiceId
      });

      // Step 1: 获取承运商服务信息
      const carrierService = await this.carrierServiceRepo.findOne({
        where: { id: input.carrierServiceId }
      });

      if (!carrierService) {
        throw new Error(`未找到承运商服务: ID=${input.carrierServiceId}`);
      }
      if (carrierService.countryCode !== input.countryCode) {
        throw new Error(
          `承运商服务国家不匹配: 请求国家=${input.countryCode}, 承运商国家=${carrierService.countryCode}`
        );
      }

      // Step 2: 计算计费重
      const volumeWeightLbs = this.calculateVolumeWeight(
        input.longestIn,
        input.secondIn,
        input.shortestIn
      );
      const billableWeightLbs = Math.max(input.grossWeightLbs, volumeWeightLbs);

      // Step 3: 获取版本ID
      const versionId = await this.getVersionId(input.versionKey);

      // Step 4: 收集所有命中的规则
      const allCharges = await this.collectCharges(
        versionId,
        input.carrierServiceId,
        input,
        billableWeightLbs
      );

      // Step 5: 检查拒收
      const rejectCharge = allCharges.find((c) => c.type === 'REJECT' && c.triggered);
      if (rejectCharge) {
        return {
          status: 'REJECTED',
          rejectReason: rejectCharge.notes || '超过渠道硬上限',
          charges: allCharges,
          totalSurcharge: 0,
          billableWeightLbs,
          volumeWeightLbs,
          metadata: {
            rulesMatched: allCharges.filter((c) => c.triggered).length,
            rulesDisabled: 0
          }
        };
      }

      // Step 6: 应用互斥策略
      const policies = await this.policyRepo.find({
        where: {
          versionId,
          countryCode: input.countryCode,
          carrierServiceId: input.carrierServiceId
        }
      });

      const foldedCharges = this.applyPolicies(allCharges, policies);

      // Step 7: 基础价（可选，Phase A+）
      const baseFreightResult = await this.calculateBaseFreight(input, billableWeightLbs);

      // Step 8: 汇总费用
      const totalSurcharge = Number(foldedCharges.reduce((sum, c) => sum + c.amount, 0));
      const baseFreight = baseFreightResult?.baseFreight;
      const grandTotal =
        baseFreight !== undefined ? Number((baseFreight + totalSurcharge).toFixed(2)) : undefined;

      return {
        status: 'OK',
        charges: foldedCharges,
        totalSurcharge,
        baseFreight,
        grandTotal,
        zoneCode: baseFreightResult?.zoneCode,
        laneCode: baseFreightResult?.laneCode,
        billableWeightLbs,
        volumeWeightLbs,
        metadata: {
          rulesMatched: allCharges.filter((c) => c.triggered).length,
          rulesDisabled: allCharges.filter((c) => !c.triggered && c.disabledBy).length
        }
      };
    } catch (error: any) {
      logger.error('[CostEngine] 计算失败', error);
      throw error;
    }
  }

  private async calculateBaseFreight(
    input: ScenarioInput,
    billableWeightLbs: number
  ): Promise<{ baseFreight: number; zoneCode?: string; laneCode?: string } | undefined> {
    if (!input.carrierCode || !input.serviceCode || !input.productLine) {
      return undefined;
    }

    const pricingVersion = await this.getPricingVersion(input.versionKey);
    if (!pricingVersion) {
      return undefined;
    }

    const scheme = await this.pricingSchemeRepo.findOne({
      where: {
        versionId: pricingVersion.id,
        countryCode: input.countryCode,
        carrierCode: input.carrierCode,
        serviceCode: input.serviceCode,
        productLine: input.productLine,
        isActive: true
      },
      order: { priority: 'ASC' }
    });

    if (!scheme) {
      return undefined;
    }

    const mapping = await this.resolveZoneOrLane(pricingVersion.id, input);
    const billableWeightKg =
      input.grossWeightKg || Number((billableWeightLbs / 2.20462).toFixed(3));
    const row = await this.pickBaseRateRow(
      scheme.id,
      mapping?.zoneCode,
      mapping?.laneCode,
      billableWeightKg
    );
    if (!row) {
      return undefined;
    }

    const computed = baseFreightEngineService.calculate({
      calcMode: scheme.calcMode as CalcMode,
      billableWeightKg,
      weightFrom: row.weightFrom,
      weightTo: row.weightTo,
      firstWeight: row.firstWeight,
      firstFee: row.firstFee,
      additionalStepWeight: row.additionalStepWeight,
      additionalFeePerStep: row.additionalFeePerStep,
      flatFee: row.flatFee,
      minCharge: row.minCharge,
      maxCharge: row.maxCharge
    });

    return {
      baseFreight: computed.amount,
      zoneCode: mapping?.zoneCode || undefined,
      laneCode: mapping?.laneCode || undefined
    };
  }

  private async getPricingVersion(versionKey?: string): Promise<PricingVersion | null> {
    if (versionKey) {
      return this.pricingVersionRepo.findOne({ where: { versionKey, status: 'ACTIVE' } });
    }
    return this.pricingVersionRepo
      .createQueryBuilder('v')
      .where('v.status = :status', { status: 'ACTIVE' })
      .andWhere('(v.effective_to IS NULL OR v.effective_to >= NOW())')
      .orderBy('v.effective_from', 'DESC')
      .addOrderBy('v.created_at', 'DESC')
      .getOne();
  }

  private async resolveZoneOrLane(
    versionId: number,
    input: ScenarioInput
  ): Promise<{ zoneCode?: string; laneCode?: string } | undefined> {
    if (input.originCode && input.destinationCode) {
      const lane = await this.zoneLaneRepo.findOne({
        where: {
          versionId,
          countryCode: input.countryCode,
          mappingType: 'LANE',
          originCode: input.originCode,
          destinationCode: input.destinationCode
        },
        order: { priority: 'ASC' }
      });
      if (lane) {
        return { laneCode: lane.laneCode || undefined };
      }
    }

    if (input.destinationPostal) {
      const candidates = await this.zoneLaneRepo.find({
        where: {
          versionId,
          countryCode: input.countryCode,
          mappingType: 'ZONE'
        },
        order: { priority: 'ASC' }
      });
      const hit = candidates.find((c) => {
        const from = c.postalPrefixFrom || '';
        const to = c.postalPrefixTo || '';
        const code = input.destinationPostal || '';
        if (!from) return false;
        if (!to) return code.startsWith(from);
        return code >= from && code <= to;
      });
      if (hit) {
        return { zoneCode: hit.zoneCode || undefined };
      }
    }

    return undefined;
  }

  private async pickBaseRateRow(
    schemeId: number,
    zoneCode: string | undefined,
    laneCode: string | undefined,
    billableWeightKg: number
  ): Promise<BaseRateRow | null> {
    const rows = await this.baseRateRepo.find({
      where: {
        schemeId
      },
      order: { weightFrom: 'ASC', id: 'ASC' }
    });

    const scopedRows = rows.filter((r) => {
      if (laneCode && r.laneCode && r.laneCode !== laneCode) return false;
      if (zoneCode && r.zoneCode && r.zoneCode !== zoneCode) return false;
      if (!zoneCode && !laneCode && (r.zoneCode || r.laneCode)) return false;
      return true;
    });

    return (
      scopedRows.find((r) => {
        const from = r.weightFrom === null ? null : Number(r.weightFrom);
        const to = r.weightTo === null ? null : Number(r.weightTo);
        if (from !== null && billableWeightKg < from) return false;
        if (to !== null && billableWeightKg > to) return false;
        return true;
      }) || null
    );
  }

  /**
   * 计算体积重（ FedEx/UPS divisor = 139）
   */
  private calculateVolumeWeight(longestIn: number, secondIn: number, shortestIn: number): number {
    const volumeCubicInches = longestIn * secondIn * shortestIn;
    const volumeWeightLbs = volumeCubicInches / 139;
    return Math.ceil(volumeWeightLbs); // 向上取整
  }

  /**
   * 获取版本ID
   */
  private async getVersionId(versionKey?: string): Promise<number> {
    if (versionKey) {
      const version = await AppDataSource.query(
        'SELECT id FROM dict_express_surcharge_version WHERE version_key = $1',
        [versionKey]
      );
      if (version.length === 0) {
        throw new Error(`未找到版本: ${versionKey}`);
      }
      return version[0].id;
    }

    // 默认使用最新版本
    const latestVersion = await AppDataSource.query(
      'SELECT id FROM dict_express_surcharge_version ORDER BY created_at DESC LIMIT 1'
    );
    if (latestVersion.length === 0) {
      throw new Error('数据库中没有任何版本记录');
    }
    return latestVersion[0].id;
  }

  /**
   * 收集所有命中的规则
   */
  private async collectCharges(
    versionId: number,
    carrierServiceId: number,
    input: ScenarioInput,
    billableWeightLbs: number
  ): Promise<ChargeItem[]> {
    // 查询该承运商的所有规则
    const rules = await this.ruleRepo.find({
      where: {
        versionId,
        carrierServiceId
      }
    });

    const charges: ChargeItem[] = [];

    for (const rule of rules) {
      const triggered = this.checkRuleTriggered(rule, input, billableWeightLbs);

      if (triggered) {
        const amount = this.calculateAmount(rule);
        charges.push({
          type: rule.typeNormalized || 'UNKNOWN',
          typeRaw: rule.typeRaw || '',
          amount,
          triggered: true,
          ruleId: rule.id,
          notes: rule.notes || undefined
        });
      } else {
        charges.push({
          type: rule.typeNormalized || 'UNKNOWN',
          typeRaw: rule.typeRaw || '',
          amount: 0,
          triggered: false,
          ruleId: rule.id
        });
      }
    }

    return charges;
  }

  /**
   * 检查规则是否触发
   */
  private checkRuleTriggered(
    rule: ExpressSurchargeRule,
    input: ScenarioInput,
    billableWeightLbs: number
  ): boolean {
    // 优先检查 conditions_json（复杂条件）
    if (rule.conditionsJson) {
      return this.checkComplexCondition(rule.conditionsJson, input, billableWeightLbs);
    }

    if (
      rule.conditionLiteral &&
      this.checkConditionLiteral(rule.conditionLiteral, input, billableWeightLbs)
    ) {
      return true;
    }

    // 简单阈值检查
    const checks: DimensionCheck[] = [];

    if (rule.longestIn !== null) {
      checks.push({ field: 'longestIn', operator: '>', value: rule.longestIn });
    }
    if (rule.secondIn !== null) {
      checks.push({ field: 'secondIn', operator: '>', value: rule.secondIn });
    }
    if (rule.shortestIn !== null) {
      checks.push({ field: 'shortestIn', operator: '>', value: rule.shortestIn });
    }
    if (rule.girthIn !== null) {
      // 周长 = 2 * (次长边 + 最短边)
      const girth = 2 * (input.secondIn + input.shortestIn);
      if (girth > rule.girthIn) {
        return true;
      }
    }
    if (rule.lPlusSIn !== null) {
      const lPlusS = input.longestIn + input.secondIn;
      if (lPlusS > rule.lPlusSIn) {
        return true;
      }
    }
    if (rule.threeSidesSumIn !== null) {
      const threeSides = input.longestIn + input.secondIn + input.shortestIn;
      if (threeSides > rule.threeSidesSumIn) {
        return true;
      }
    }
    if (rule.grossWtValue !== null) {
      if (input.grossWeightLbs > rule.grossWtValue) {
        return true;
      }
    }
    if (rule.minBillableLbs !== null) {
      if (billableWeightLbs > rule.minBillableLbs) {
        return true;
      }
    }

    // 所有条件都必须满足（AND 逻辑）
    for (const check of checks) {
      const actualValue = input[check.field as keyof ScenarioInput] as number;
      if (actualValue === undefined || actualValue === null) {
        continue;
      }

      switch (check.operator) {
        case '>':
          if (!(actualValue > check.value)) return false;
          break;
        case '>=':
          if (!(actualValue >= check.value)) return false;
          break;
        case '<':
          if (!(actualValue < check.value)) return false;
          break;
        case '<=':
          if (!(actualValue <= check.value)) return false;
          break;
        case '==':
          if (!(actualValue === check.value)) return false;
          break;
      }
    }

    return checks.length > 0;
  }

  /**
   * 检查复杂条件（conditions_json）
   */
  private checkComplexCondition(
    conditionsJson: any,
    input: ScenarioInput,
    billableWeightLbs: number
  ): boolean {
    if (!conditionsJson || !conditionsJson.operator) {
      return false;
    }

    const { operator, conditions } = conditionsJson;

    if (!Array.isArray(conditions)) {
      return false;
    }

    const results = conditions.map((cond: any) => {
      const fieldValue = this.getFieldValue(cond.field, input, billableWeightLbs);
      if (fieldValue === null) return false;

      switch (cond.operator) {
        case '>':
          return fieldValue > cond.value;
        case '>=':
          return fieldValue >= cond.value;
        case '<':
          return fieldValue < cond.value;
        case '<=':
          return fieldValue <= cond.value;
        case '==':
          return fieldValue === cond.value;
        default:
          return false;
      }
    });

    // AND/OR 逻辑
    if (operator === 'AND') {
      return results.every((r: boolean) => r);
    } else if (operator === 'OR') {
      return results.some((r: boolean) => r);
    }

    return false;
  }

  private checkConditionLiteral(
    conditionLiteral: string,
    input: ScenarioInput,
    billableWeightLbs: number
  ): boolean {
    const conditions = this.parseConditionLiteral(conditionLiteral);
    if (conditions.length === 0) {
      return false;
    }

    return conditions.every((condition) => {
      const fieldValue = this.getFieldValue(condition.field, input, billableWeightLbs);
      if (fieldValue === null) return false;
      return this.compareNumber(fieldValue, condition.operator, condition.value);
    });
  }

  private parseConditionLiteral(conditionLiteral: string): LiteralCondition[] {
    const legacyFields = ['longest_in', 'second_in', 'girth_in'];
    return conditionLiteral
      .split(/[;,]/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part, index) => {
        const withField = part.match(
          /^(longest_in|second_in|shortest_in|girth_in|l_plus_s_in|three_sides_sum_in|gross_wt_value|billable_weight|min_billable_lbs)\s*(>=|<=|==|=|>|<)\s*(-?\d+(?:\.\d+)?)$/i
        );
        if (withField) {
          return {
            field: withField[1].toLowerCase(),
            operator: withField[2] as LiteralOperator,
            value: Number(withField[3])
          };
        }

        const legacy = part.match(/^(>=|<=|==|=|>|<)\s*(-?\d+(?:\.\d+)?)$/);
        if (!legacy) {
          return null;
        }
        return {
          field: legacyFields[index] || legacyFields[0],
          operator: legacy[1] as LiteralOperator,
          value: Number(legacy[2])
        };
      })
      .filter((condition): condition is LiteralCondition => !!condition);
  }

  private compareNumber(
    actualValue: number,
    operator: LiteralOperator,
    expectedValue: number
  ): boolean {
    switch (operator) {
      case '>':
        return actualValue > expectedValue;
      case '>=':
        return actualValue >= expectedValue;
      case '<':
        return actualValue < expectedValue;
      case '<=':
        return actualValue <= expectedValue;
      case '==':
      case '=':
        return actualValue === expectedValue;
      default:
        return false;
    }
  }

  /**
   * 获取字段值
   */
  private getFieldValue(
    field: string,
    input: ScenarioInput,
    billableWeightLbs: number
  ): number | null {
    switch (field) {
      case 'longest_in':
        return input.longestIn;
      case 'second_in':
        return input.secondIn;
      case 'shortest_in':
        return input.shortestIn;
      case 'girth_in':
        return 2 * (input.secondIn + input.shortestIn);
      case 'l_plus_s_in':
        return input.longestIn + input.secondIn;
      case 'three_sides_sum_in':
        return input.longestIn + input.secondIn + input.shortestIn;
      case 'gross_wt_value':
        return input.grossWeightLbs;
      case 'billable_weight':
      case 'min_billable_lbs':
        return billableWeightLbs;
      default:
        return null;
    }
  }

  /**
   * 计算金额
   */
  private calculateAmount(rule: ExpressSurchargeRule): number {
    if (rule.amountFixed !== null && rule.amountFixed !== undefined) {
      return Number(rule.amountFixed);
    }
    if (
      rule.amountMin !== null &&
      rule.amountMin !== undefined &&
      rule.amountMax !== null &&
      rule.amountMax !== undefined
    ) {
      // 区间取平均值（或可根据业务需求调整）
      return Number((Number(rule.amountMin) + Number(rule.amountMax)) / 2);
    }
    return 0;
  }

  /**
   * 应用互斥策略
   */
  private applyPolicies(charges: ChargeItem[], policies: ExpressStackPolicy[]): ChargeItem[] {
    let result = [...charges];

    for (const policy of policies) {
      const policyJson = policy.policyJson;

      // IF_THEN_DISABLE 类型
      if (policy.policyType === 'IF_THEN_DISABLE' && policyJson.if_triggered) {
        const ifTriggered = result.some(
          (c) => c.triggered && policyJson.if_triggered.includes(c.type)
        );

        if (ifTriggered && policyJson.disable) {
          result.forEach((c) => {
            if (policyJson.disable.includes(c.type) && c.triggered) {
              c.triggered = false;
              c.disabledBy = `IF_THEN_DISABLE(${policyJson.if_triggered.join(',')})`;
            }
          });
        }
      }

      // MAX_GROUP 类型（只取最高一笔）
      if (policy.policyType === 'MAX_GROUP' && policyJson.max_group) {
        const groupTypes = policyJson.max_group;
        const groupCharges = result.filter((c) => c.triggered && groupTypes.includes(c.type));

        if (groupCharges.length > 1) {
          // 找出金额最高的
          const maxCharge = groupCharges.reduce((max, c) => (c.amount > max.amount ? c : max));

          // 禁用其他
          groupCharges.forEach((c) => {
            if (c !== maxCharge) {
              c.triggered = false;
              c.disabledBy = `MAX_GROUP(${groupTypes.join(',')})`;
            }
          });
        }
      }
    }

    // 只返回触发的费用
    return result.filter((c) => c.triggered);
  }
}

export const costEngineService = new CostEngineService();
