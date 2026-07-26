/**
 * 从请求体读取字段：优先 camelCase，其次 snake_case。
 * 用于 raw SQL 控制器，避免前端漏转命名时把 undefined 写成 NULL。
 */

export function camelToSnakeKey(camelKey: string): string {
  return camelKey.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function pickBodyField(body: unknown, camelKey: string): unknown {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return undefined;
  }
  const record = body as Record<string, unknown>;
  if (record[camelKey] !== undefined) {
    return record[camelKey];
  }
  const snakeKey = camelToSnakeKey(camelKey);
  if (record[snakeKey] !== undefined) {
    return record[snakeKey];
  }
  return undefined;
}

export function pickBodyString(body: unknown, camelKey: string): string | undefined {
  const value = pickBodyField(body, camelKey);
  if (value === undefined || value === null) return undefined;
  return String(value);
}

export function firstMissingRequiredBodyString(
  body: unknown,
  camelKeys: string[]
): string | undefined {
  for (const key of camelKeys) {
    const value = pickBodyString(body, key);
    if (value === undefined || value.trim() === '') {
      return key;
    }
  }
  return undefined;
}

export function pickBodyBoolean(body: unknown, camelKey: string, defaultValue: boolean): boolean {
  const value = pickBodyField(body, camelKey);
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return defaultValue;
}

export function pickBodyNumber(body: unknown, camelKey: string, defaultValue: number): number {
  const value = pickBodyField(body, camelKey);
  if (value === undefined || value === null || value === '') return defaultValue;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : defaultValue;
}
