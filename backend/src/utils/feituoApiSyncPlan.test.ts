import { shouldUpdateCoreField } from '../constants/FeiTuoStatusMapping';
import { planFeituoApiSync } from './feituoApiSyncPlan';

describe('planFeituoApiSync', () => {
  it('官方综合跟踪同时返回 places 与 status 时，仍必须走 status 写核', () => {
    const plan = planFeituoApiSync({
      places: [{ type: 3, code: 'USLAX', ata: '2026-09-01 08:00:00' }],
      trackingEvents: [{ eventCode: 'BDAR', eventTime: '2026-09-01 08:00:00' }]
    });

    expect(plan.persistPlacesRaw).toBe(true);
    expect(plan.runPlacesProcessor).toBe(true);
    expect(plan.runTrackingCoreFieldUpdate).toBe(true);
  });

  it('仅有 status 轨迹时走写核', () => {
    const plan = planFeituoApiSync({
      places: [],
      trackingEvents: [{ eventCode: 'GTOT' }]
    });
    expect(plan.runTrackingCoreFieldUpdate).toBe(true);
    expect(plan.runPlacesProcessor).toBe(false);
  });

  it('仅有 places 时不虚构 tracking 写核', () => {
    const plan = planFeituoApiSync({
      places: [{ type: 1, code: 'CNSHA' }],
      trackingEvents: []
    });
    expect(plan.runPlacesProcessor).toBe(true);
    expect(plan.runTrackingCoreFieldUpdate).toBe(false);
  });
});

describe('shouldUpdateCoreField 不能用字段名代替状态码', () => {
  it('places 处理器传入 ata/eta 字段名时不会更新核心字段', () => {
    expect(shouldUpdateCoreField('ATA', true)).toBe(true);
    expect(shouldUpdateCoreField('ETA', true)).toBe(true);
    expect(shouldUpdateCoreField('ata', true)).toBe(false);
    expect(shouldUpdateCoreField('eta', true)).toBe(false);
  });
});
