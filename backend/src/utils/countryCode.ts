/**
 * 国家代码规范化
 * 将别名映射为标准 dict_countries.code
 */

const ALIAS_TO_CODE: Record<string, string> = {
  UK: 'GB'
};

/**
 * 将国家代码或别名规范化为 dict_countries.code
 * @example normalizeCountryCode('UK') => 'GB'
 */
export function normalizeCountryCode(code: string | undefined | null): string {
  if (code === undefined || code === null) return '';
  const trimmed = String(code).trim();
  if (!trimmed) return '';
  const upper = trimmed.toUpperCase();
  return ALIAS_TO_CODE[upper] ?? upper;
}
