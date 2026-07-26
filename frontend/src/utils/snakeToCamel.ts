/**
 * 将对象的 key 从 snake_case 转为 camelCase（递归）
 * 用于把后端 SELECT * 返回的行映射到前端表单字段
 */
export function snakeToCamel<T = unknown>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj
  }
  if (Array.isArray(obj)) {
    return obj.map(item => snakeToCamel(item)) as T
  }
  if (typeof obj === 'object' && (obj as object).constructor === Object) {
    const result: Record<string, unknown> = {}
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
      result[camelKey] = snakeToCamel((obj as Record<string, unknown>)[key])
    }
    return result as T
  }
  return obj
}
