/**
 * 飞驼「集装箱综合跟踪」(/application/v1/query) 同步分支决策。
 *
 * 官方 schema 中 data.result.places 为必返回数组，元素为：
 * - type: integer（1 起运 / 2 中转 / 3 目的，不是 POL/POD 字符串）
 * - code: 地点五字码（不是 locationCode）
 *
 * 现有 FeituoPlacesProcessor / updatePortOperationFromPlaces 按 POL/POD + locationCode
 * 解析，且用 shouldUpdateCoreField('ata', date) 误把字段名当状态码，无法写核。
 * 因此只要 containers[].status 轨迹存在，就必须走 updatePortOperationCoreFields，
 * 不能因为 places 非空而跳过。
 */

export interface FeituoApiSyncPlan {
  persistPlacesRaw: boolean;
  runPlacesProcessor: boolean;
  runTrackingCoreFieldUpdate: boolean;
}

export function planFeituoApiSync(payload: {
  places?: unknown[] | null;
  trackingEvents?: unknown[] | null;
}): FeituoApiSyncPlan {
  const hasPlaces = Array.isArray(payload.places) && payload.places.length > 0;
  const hasTracking = Array.isArray(payload.trackingEvents) && payload.trackingEvents.length > 0;
  return {
    persistPlacesRaw: hasPlaces,
    runPlacesProcessor: hasPlaces,
    runTrackingCoreFieldUpdate: hasTracking
  };
}
