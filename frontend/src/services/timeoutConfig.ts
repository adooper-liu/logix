/**
 * 分级超时配置
 *
 * 根据接口类型设置不同的 timeout,避免一刀切
 */

export interface TimeoutConfig {
  default: number
  fast: number // 字典/配置查询
  normal: number // 列表查询
  slow: number // 统计/导出
  upload: number // 文件上传
}

export const TIMEOUT_CONFIG: TimeoutConfig = {
  default: 10000, // 10秒
  fast: 5000, // 5秒
  normal: 15000, // 15秒
  slow: 30000, // 30秒
  upload: 60000, // 60秒
}

/**
 * 根据 URL 路径推断超时配置
 *
 * @param url - 请求 URL
 * @returns timeout 毫秒数
 */
export function getTimeoutByUrl(url: string): number {
  if (!url) {
    return TIMEOUT_CONFIG.default
  }

  // 统计接口
  if (url.includes('/statistics')) {
    return TIMEOUT_CONFIG.slow
  }

  // 导入/导出
  if (url.includes('/import') || url.includes('/export')) {
    return TIMEOUT_CONFIG.upload
  }

  // 字典/配置
  if (url.includes('/dict')) {
    return TIMEOUT_CONFIG.fast
  }

  // 外部数据同步
  if (url.includes('/external') || url.includes('/sync')) {
    return TIMEOUT_CONFIG.slow
  }

  // 默认
  return TIMEOUT_CONFIG.normal
}
