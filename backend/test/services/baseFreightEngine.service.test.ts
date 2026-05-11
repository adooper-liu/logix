import { baseFreightEngineService } from '../../src/services/baseFreightEngine.service';

describe('BaseFreightEngineService', () => {
  it('FIRST_ADDITIONAL: 首重内仅收首重费', () => {
    const result = baseFreightEngineService.calculate({
      calcMode: 'FIRST_ADDITIONAL',
      billableWeightKg: 0.8,
      firstWeight: 1,
      firstFee: 10,
      additionalStepWeight: 0.5,
      additionalFeePerStep: 3
    });
    expect(result.amount).toBe(10);
    expect(result.steps).toBe(0);
  });

  it('FIRST_ADDITIONAL: 超首重按续重步进计费', () => {
    const result = baseFreightEngineService.calculate({
      calcMode: 'FIRST_ADDITIONAL',
      billableWeightKg: 2.2,
      firstWeight: 1,
      firstFee: 10,
      additionalStepWeight: 0.5,
      additionalFeePerStep: 3
    });
    expect(result.steps).toBe(3);
    expect(result.amount).toBe(19);
  });

  it('TIER_FLAT: 命中阶梯返回固定价', () => {
    const result = baseFreightEngineService.calculate({
      calcMode: 'TIER_FLAT',
      billableWeightKg: 4.5,
      weightFrom: 3,
      weightTo: 5,
      flatFee: 28
    });
    expect(result.amount).toBe(28);
  });

  it('支持 minCharge/maxCharge 截断', () => {
    const minApplied = baseFreightEngineService.calculate({
      calcMode: 'TIER_FLAT',
      billableWeightKg: 2,
      weightFrom: 1,
      weightTo: 3,
      flatFee: 8,
      minCharge: 10
    });
    expect(minApplied.amount).toBe(10);

    const maxApplied = baseFreightEngineService.calculate({
      calcMode: 'TIER_FLAT',
      billableWeightKg: 2,
      weightFrom: 1,
      weightTo: 3,
      flatFee: 30,
      maxCharge: 25
    });
    expect(maxApplied.amount).toBe(25);
  });
});

