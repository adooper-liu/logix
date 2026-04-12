/**
 * 请求体 camelCase 转 snake_case
 * 用于与后端 API 约定：请求体与数据库对齐使用 snake_case
 */

/**
 * 将对象的 key 从 camelCase 转为 snake_case（仅一层，用于 API 请求体）
 * 入参可为 null/undefined/非纯对象：原样返回，与测试及运行时防御一致。
 */
export function camelToSnake(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj
  }
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    return obj
  }
  const o = obj as Record<string, unknown>
  const result: Record<string, unknown> = {}
  for (const key in o) {
    if (Object.prototype.hasOwnProperty.call(o, key)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
      const value = o[key]
      result[snakeKey] =
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        (value as object).constructor === Object
          ? camelToSnake(value as Record<string, unknown>)
          : value
    }
  }
  return result
}
