/**
 * 请求体 snake_case 转 camelCase
 * 用于 API 层接收与数据库对齐的 snake_case，转换为实体所需的 camelCase
 */

/**
 * 将对象的 key 从 snake_case 转为 camelCase（递归，不修改数组元素 key）
 */
export function snakeToCamel<T = any>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => snakeToCamel(item)) as T;
  }
  if (typeof obj === 'object' && obj.constructor === Object) {
    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = snakeToCamel((obj as any)[key]);
      }
    }
    return result as T;
  }
  return obj;
}
