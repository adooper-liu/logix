import { BaseFreightContext, BaseFreightResult } from '../types/pricing';

export class BaseFreightEngineService {
  calculate(context: BaseFreightContext): BaseFreightResult {
    let result: BaseFreightResult;
    switch (context.calcMode) {
      case 'FIRST_ADDITIONAL':
        result = this.calculateFirstAdditional(context);
        break;
      case 'TIER_FLAT':
        result = this.calculateTierFlat(context);
        break;
      default:
        throw new Error(`暂不支持的 calcMode: ${context.calcMode}`);
    }

    result.amount = this.applyFloorAndCap(result.amount, context.minCharge, context.maxCharge);
    return result;
  }

  private calculateFirstAdditional(context: BaseFreightContext): BaseFreightResult {
    const firstWeight = Number(context.firstWeight || 0);
    const firstFee = Number(context.firstFee || 0);
    const stepWeight = Number(context.additionalStepWeight || 0);
    const stepFee = Number(context.additionalFeePerStep || 0);
    const billable = Number(context.billableWeightKg || 0);

    if (firstWeight <= 0 || firstFee < 0 || stepWeight <= 0 || stepFee < 0) {
      throw new Error('FIRST_ADDITIONAL 参数不完整');
    }

    if (billable <= firstWeight) {
      return { amount: firstFee, steps: 0 };
    }

    const extraWeight = billable - firstWeight;
    const steps = Math.ceil(extraWeight / stepWeight);
    const amount = firstFee + steps * stepFee;
    return { amount, steps };
  }

  private calculateTierFlat(context: BaseFreightContext): BaseFreightResult {
    const billable = Number(context.billableWeightKg || 0);
    const from = context.weightFrom ?? null;
    const to = context.weightTo ?? null;
    const flat = Number(context.flatFee || 0);
    if (flat < 0) {
      throw new Error('TIER_FLAT flatFee 非法');
    }
    if (from !== null && billable < Number(from)) {
      throw new Error('计费重未命中当前阶梯');
    }
    if (to !== null && billable > Number(to)) {
      throw new Error('计费重未命中当前阶梯');
    }
    return { amount: flat };
  }

  private applyFloorAndCap(amount: number, minCharge?: number | null, maxCharge?: number | null): number {
    let normalized = amount;
    if (minCharge !== null && minCharge !== undefined) {
      normalized = Math.max(normalized, Number(minCharge));
    }
    if (maxCharge !== null && maxCharge !== undefined) {
      normalized = Math.min(normalized, Number(maxCharge));
    }
    return Number(normalized.toFixed(2));
  }
}

export const baseFreightEngineService = new BaseFreightEngineService();

