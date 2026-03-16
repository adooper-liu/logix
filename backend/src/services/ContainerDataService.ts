/**
 * 货柜数据服务
 * 提供统一的货柜数据获取接口
 */

import { Repository } from 'typeorm';
import { Container } from '../entities/Container';
import { ContainerService } from './container.service';
import { ContainerQueryBuilder } from './statistics/common/ContainerQueryBuilder';

interface ListParams {
  page: number;
  pageSize: number;
  search?: string;
  startDate?: string;
  endDate?: string;
}

interface StatsParams {
  startDate?: string;
  endDate?: string;
}

export class ContainerDataService {
  constructor(
    private containerRepository: Repository<Container>,
    private containerService: ContainerService
  ) {}

  /**
   * 获取货柜列表（用于列表页面）
   */
  async getContainersForList(params: ListParams) {
    const qb = ContainerQueryBuilder.createListQuery(this.containerRepository, params);
    
    // 应用分页
    const [containers, total] = await qb
      .skip((params.page - 1) * params.pageSize)
      .take(params.pageSize)
      .getManyAndCount();
    
    // 使用现有enrichContainersList方法
    const enriched = await this.containerService.enrichContainersList(containers);
    return { items: enriched, total };
  }

  /**
   * 获取货柜列表（用于统计）
   */
  async getContainersForStats(params: StatsParams) {
    const qb = ContainerQueryBuilder.createListQuery(this.containerRepository, params);
    const containers = await qb.getMany();
    
    // 使用现有enrichContainersList方法
    const enriched = await this.containerService.enrichContainersList(containers);
    return enriched;
  }

  /**
   * 获取货柜详情
   */
  async getContainerDetail(containerNumber: string) {
    const container = await this.containerRepository.findOne({
      where: { containerNumber },
      relations: ['seaFreight', 'replenishmentOrders'] // 去掉portOperations，由enrich处理
    });
    
    if (!container) return null;
    
    // 使用现有enrichContainersList方法（传入单元素数组）
    const [enriched] = await this.containerService.enrichContainersList([container]);
    return enriched;
  }
}