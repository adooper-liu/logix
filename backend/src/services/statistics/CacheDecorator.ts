/**
 * 统计查询缓存装饰器
 *
 * 为统计服务方法添加 Redis 缓存,减少数据库负载
 * 缓存键格式: statistics:{method}:{startDate}:{endDate}:{country}
 * 默认 TTL: 300秒 (5分钟)
 */

import { normalizeCountryCode } from '../../utils/countryCode';
import { logger } from '../../utils/logger';
import { getScopedCountryCode } from '../../utils/requestContext';
import { CacheService } from '../CacheService';

const cacheService = new CacheService();
const STATISTICS_CACHE_TTL = 300; // 5分钟
const CACHE_PREFIX = 'statistics';

/**
 * 生成统计缓存键
 */
function generateCacheKey(
  methodName: string,
  startDate?: string,
  endDate?: string,
  country?: string
): string {
  const parts = [CACHE_PREFIX, methodName];

  if (startDate) parts.push(startDate);
  if (endDate) parts.push(endDate);
  if (country) parts.push(country);

  return parts.join(':');
}

/**
 * 统计方法缓存装饰器工厂
 *
 * @param ttl - 缓存过期时间(秒),默认300秒
 * @returns 方法装饰器
 *
 * @example
 * ```typescript
 * class StatisticsService {
 *   @cacheStatistics(300)
 *   async getStatusDistribution(startDate?: string, endDate?: string) {
 *     // 实际查询逻辑
 *   }
 * }
 * ```
 */
export function cacheStatistics(ttl: number = STATISTICS_CACHE_TTL) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // 提取参数(假设前两个参数是 startDate, endDate；第三参若未传则从请求作用域取国家，与 DateFilterBuilder.addCountryFilters 一致)
      const [startDate, endDate, explicitCountry] = args;
      const rawCountry =
        explicitCountry !== undefined &&
        explicitCountry !== null &&
        String(explicitCountry).trim() !== ''
          ? String(explicitCountry).trim()
          : getScopedCountryCode();
      const countrySegment = normalizeCountryCode(rawCountry || '') || 'all';

      const cacheKey = generateCacheKey(propertyKey, startDate, endDate, countrySegment);

      try {
        // 尝试从缓存读取
        const cached = await cacheService.get(cacheKey);
        if (cached !== null) {
          logger.debug(`[StatisticsCache] HIT: ${cacheKey}`);
          return cached;
        }

        logger.debug(`[StatisticsCache] MISS: ${cacheKey}`);

        // 执行原始方法
        const result = await originalMethod.apply(this, args);

        // 写入缓存
        if (result !== null && result !== undefined) {
          await cacheService.set(cacheKey, result, ttl);
          logger.debug(`[StatisticsCache] SET: ${cacheKey}, TTL=${ttl}s`);
        }

        return result;
      } catch (error) {
        // 缓存失败不影响主流程
        logger.error(`[StatisticsCache] Error for key ${cacheKey}:`, error);
        return await originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

/**
 * 清除统计缓存
 *
 * @param methodName - 方法名,不传则清除所有统计缓存
 * @param startDate - 开始日期
 * @param endDate - 结束日期
 * @param country - 国家代码
 */
export async function invalidateStatisticsCache(
  methodName?: string,
  startDate?: string,
  endDate?: string,
  country?: string
): Promise<void> {
  let pattern = `${CACHE_PREFIX}:`;

  if (methodName) {
    pattern += `${methodName}:`;

    if (startDate) {
      pattern += `${startDate}:`;

      if (endDate) {
        pattern += `${endDate}`;

        if (country) {
          pattern += `:${country}`;
        }
      }
    }
  }

  pattern += '*';

  logger.info(`[StatisticsCache] INVALIDATE: ${pattern}`);
  await cacheService.invalidate(pattern);
}

/**
 * 清除所有统计缓存
 */
export async function clearAllStatisticsCache(): Promise<void> {
  logger.info('[StatisticsCache] CLEAR ALL');
  await cacheService.invalidate(`${CACHE_PREFIX}:*`);
}
