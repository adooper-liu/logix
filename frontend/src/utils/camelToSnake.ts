/**
 * 请求体 camelCase 转 snake_case
 * 用于与后端 API 约定：请求体与数据库对齐使用 snake_case
 */

/**
 * 将对象的 key 从 camelCase 转为 snake_case（仅一层，用于 API 请求体）
 */
export function camelToSnake<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }
  const result: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      const value = obj[key];
      result[snakeKey] =
        value !== null && typeof value === 'object' && !Array.isArray(value) && value.constructor === Object
          ? camelToSnake(value as Record<string, any>)
          : value;
    }
  }
  return result;
}
