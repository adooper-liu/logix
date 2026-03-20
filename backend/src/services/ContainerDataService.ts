/**
 * 货柜数据服务
 * 提供统一的货柜数据获取接口
 */

import { Repository } from 'typeorm';
import { Container } from '../entities/Container';
import { ContainerService } from './container.service';
import { ContainerQueryBuilder } from './statistics/common/ContainerQueryBuilder';

interface IListParams {
  page: number;
  pageSize: number;
  search?: string;
  startDate?: string;
  endDate?: string;
}

interface IStatsParams {
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
  async getContainersForList(params: IListParams) {
    const qb = ContainerQueryBuilder.createListQuery(this.containerRepository, params);
    const total = await qb.clone().getCount();
    const containers = await qb
      .skip((params.page - 1) * params.pageSize)
      .take(params.pageSize)
      .getMany();

    const enriched = await this.containerService.enrichContainersList(containers);
    return { items: enriched, total };
  }

  /**
   * 获取货柜列表（用于统计）
   */
  async getContainersForStats(params: IStatsParams) {
    const qb = ContainerQueryBuilder.createListQuery(this.containerRepository, params);
    const containers = await qb.getMany();

    const enriched = await this.containerService.enrichContainersList(containers);
    return enriched;
  }

  /**
   * 获取货柜详情
   */
  async getContainerDetail(containerNumber: string) {
    const container = await this.containerRepository.findOne({
      where: { containerNumber },
      relations: ['seaFreight', 'replenishmentOrders']
    });

    if (!container) return null;

    const [enriched] = await this.containerService.enrichContainersList([container]);
    return enriched;
  }
}
