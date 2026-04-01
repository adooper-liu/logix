/**
 * 调度系统缓存策略
 * 
 * 定义智能排柜系统中热点数据的缓存策略
 * 
 * @since 2026-04-01
 */

/**
 * 缓存键前缀
 */
export enum SchedulingCacheKeys {
  /** 港口-车队映射关系 */
  PORT_TRUCKING_MAPPING = 'scheduling:port_trucking:',
  
  /** 仓库-车队映射关系 */
  WAREHOUSE_TRUCKING_MAPPING = 'scheduling:warehouse_trucking:',
  
  /** 滞港费标准列表 */
  DEMURRAGE_STANDARDS = 'demurrage:standards:',
  
  /** 滞港费标准全量列表 */
  DEMURRAGE_ALL_STANDARDS = 'demurrage:all_standards',
  
  /** 仓库日产能 */
  WAREHOUSE_OCCUPANCY = 'scheduling:warehouse_occupancy:',
  
  /** 车队档期 */
  TRUCKING_SLOT = 'scheduling:trucking_slot:',
}

/**
 * 缓存TTL配置（秒）
 */
export const SchedulingCacheTTL = {
  /** 映射关系缓存（6小时）：港口-车队、仓库-车队映射变更不频繁 */
  MAPPING: 6 * 60 * 60,
  
  /** 滞港费标准缓存（24小时）：标准表变更不频繁 */
  DEMURRAGE_STANDARD: 24 * 60 * 60,
  
  /** 滞港费匹配结果（1小时）：按货柜号缓存 */
  DEMURRAGE_MATCH: 60 * 60,
  
  /** 日产能缓存（5分钟）：档期数据可能频繁变更 */
  DAILY_OCCUPANCY: 5 * 60,
  
  /** 车队档期缓存（5分钟） */
  TRUCKING_SLOT: 5 * 60,
};

/**
 * 生成缓存键
 * 
 * @param prefix - 缓存键前缀
 * @param params - 缓存键参数
 * @returns 缓存键字符串
 */
export function getSchedulingCacheKey(prefix: string, ...params: (string | number)[]): string {
  return `${prefix}${params.join(':')}`;
}
