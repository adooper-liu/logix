/**
 * 清关公司选择服务
 * Customs Broker Selection Service
 * 
 * 职责：根据国家和港口匹配清关公司
 * - 国家匹配
 * - 港口映射（未来扩展）
 * - 默认"未指定"策略
 * 
 * @since 2026-03-30 (从 IntelligentSchedulingService 拆分)
 */

import { AppDataSource } from '../database';
import { CustomsBroker } from '../entities/CustomsBroker';
import { logger } from '../utils/logger';

/**
 * 未指定的清关公司编码
 */
const UNSPECIFIED_CUSTOMS_BROKER = 'UNSPECIFIED';

export class CustomsBrokerSelectionService {
  private customsBrokerRepo = AppDataSource.getRepository(CustomsBroker);

  /**
   * 选择清关公司
   * 
   * **业务规则**:
   * 1. 优先根据国家匹配清关公司
   * 2. 如果没有匹配，返回"未指定"
   * 3. 支持港口映射（未来扩展）
   * 
   * **算法复杂度**: O(n)，n=清关公司表查询时间
   * 
   * @param countryCode 国家代码
   * @param portCode 港口代码（可选，预留扩展）
   * @returns 清关公司编码
   * 
   * @example
   * // 示例 1：有匹配的清关公司
   * const brokerCode = await selectCustomsBroker('US', 'USLAX');
   * // 返回：'CB-US-001'
   * 
   * @example
   * // 示例 2：无匹配
   * const brokerCode = await selectCustomsBroker('XX', 'USLAX');
   * // 返回：'UNSPECIFIED'
   */
  async selectCustomsBroker(countryCode?: string, portCode?: string): Promise<string> {
    try {
      // 1. 验证国家代码
      if (!countryCode) {
        return UNSPECIFIED_CUSTOMS_BROKER;
      }

      // 2. 优先尝试精确匹配（国家 + 港口）
      // TODO: 后续可能需要创建 dict_customs_port_mapping 表来实现更精细的匹配
      // 目前只基于国家匹配
      const brokers = await this.customsBrokerRepo.find({
        where: {
          country: countryCode
        },
        order: { brokerCode: 'ASC' },
        take: 1
      });

      if (brokers.length > 0) {
        logger.debug(
          `[CustomsBrokerSelection] Selected broker ${brokers[0].brokerCode} for country ${countryCode}`
        );
        return brokers[0].brokerCode;
      }

      // 3. 如果没有匹配到，返回"未指定"
      logger.info(
        `[CustomsBrokerSelection] No customs broker found for country: ${countryCode}, using UNSPECIFIED`
      );
      return UNSPECIFIED_CUSTOMS_BROKER;
    } catch (error) {
      logger.error('[CustomsBrokerSelection] Error selecting customs broker:', error);
      return UNSPECIFIED_CUSTOMS_BROKER;
    }
  }

  /**
   * 批量选择清关公司
   * 
   * **业务场景**:
   * - 批量排产时预先分配清关公司
   * - 避免重复查询数据库
   * 
   * **算法复杂度**: O(n * m)，n=国家列表长度，m=单次查询时间
   * 
   * @param countryCodes 国家代码列表
   * @returns 国家代码到清关公司编码的映射
   * 
   * @example
   * // 示例：批量选择
   * const mapping = await batchSelectCustomsBrokers(['US', 'CA', 'GB']);
   * // 返回：{ 'US': 'CB-US-001', 'CA': 'UNSPECIFIED', 'GB': 'CB-GB-001' }
   */
  async batchSelectCustomsBrokers(countryCodes: string[]): Promise<Record<string, string>> {
    const result: Record<string, string> = {};

    for (const countryCode of countryCodes) {
      result[countryCode] = await this.selectCustomsBroker(countryCode);
    }

    return result;
  }
}
