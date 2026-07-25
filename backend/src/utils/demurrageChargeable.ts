/**
 * 滞港费标准收费标记：
 * - 'N' = 收费项，参与计算（库表/实体默认值）
 * - 'Y' = 不收费，匹配时跳过
 *
 * 手工创建与 Excel 导入在未提供该字段时必须默认 'N'，
 * 否则标准会写入后永远无法参与计费。
 */
export function resolveDemurrageIsChargeable(raw: unknown): 'Y' | 'N' {
  if (raw === undefined || raw === null) return 'N';
  const normalized = String(raw).trim().toUpperCase();
  if (normalized === '') return 'N';
  if (normalized === 'Y') return 'Y';
  if (normalized === 'N') return 'N';
  return 'N';
}
