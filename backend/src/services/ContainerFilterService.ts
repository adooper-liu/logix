import { Repository } from 'typeorm';
import { AppDataSource } from '../database';
import { Container } from '../entities/Container';
import { logger } from '../utils/logger';

/**
 * 货柜筛选服务
 * 
 * 职责：根据各种业务条件筛选待排产的货柜
 * 
 * @packageDocumentation
 */

/**
 * 筛选条件接口
 */
export interface FilterOptions {
  /** 港口代码列表 */
  portCodes?: string[];
  
  /** 最小免费天数 */
  minFreeDays?: number;
  
  /** 跳过数量（分页） */
  skip?: number;
  
  /** 限制数量（分页） */
  limit?: number;
}

/**
 * 货柜筛选服务类
 * 
 * @example
 * ```typescript
 * const filterService = new ContainerFilterService();
 * const containers = await filterService.filter({
 *   portCodes: ['USLAX', 'USLGB'],
 *   minFreeDays: 3,
 *   skip: 0,
 *   limit: 50
 * });
 * ```
 */
export class ContainerFilterService {
  private containerRepo: Repository<Container>;
  
  /**
   * 创建货柜筛选服务实例
   */
  constructor() {
    this.containerRepo = AppDataSource.getRepository(Container);
  }
  
  /**
   * 筛选待排产货柜
   * 
   * @param options - 筛选条件
   * @returns 符合条件的货柜列表
   * 
   * @throws Error 当筛选条件无效时抛出异常
   * 
   * @example
   * ```typescript
   * // 基本用法
   * const containers = await filterService.filter({
   *   portCodes: ['USLAX'],
   *   minFreeDays: 3
   * });
   * 
   * // 分页查询
   * const page1 = await filterService.filter({
   *   portCodes: ['USLAX'],
   *   minFreeDays: 3,
   *   skip: 0,
   *   limit: 20
   * });
   * ```
   */
  async filter(options: FilterOptions): Promise<Container[]> {
    logger.info('[ContainerFilterService] 开始筛选货柜', {
      portCodes: options.portCodes,
      minFreeDays: options.minFreeDays,
      skip: options.skip,
      limit: options.limit
    });
    
    try {
      // 构建查询
      const query = this.containerRepo
        .createQueryBuilder('c')
        .leftJoinAndSelect('c.portOperations', 'po')
        .leftJoinAndSelect('c.seaFreight', 'sf')
        .leftJoinAndSelect('c.replenishmentOrders', 'o')
        .leftJoinAndSelect('o.customer', 'cust')
        .where('c.scheduleStatus IN (:...statuses)', { statuses: ['initial', 'issued'] });
      
      // 港口过滤
      if (options.portCodes && options.portCodes.length > 0) {
        query.andWhere('po.portCode IN (:...portCodes)', { portCodes: options.portCodes });
      }
      
      // 日期范围过滤（如果有）
      if (options.minFreeDays) {
        // TODO: 实现日期范围过滤逻辑
        // 这里可以根据 lastFreeDate 进行过滤
      }
      
      const containers = await query.getMany();
      
      logger.info('[ContainerFilterService] 货柜筛选完成', {
        count: containers.length
      });
      
      return containers;
      
    } catch (error) {
      logger.error('[ContainerFilterService] 货柜筛选失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }
}
