/**
 * 月度货量统计服务
 * Monthly Volume Service
 * 负责货柜的月度出运量统计
 */

import { Repository } from 'typeorm';
import { Container } from '../../entities/Container';
import { ContainerQueryBuilder } from './common/ContainerQueryBuilder';
import { SimplifiedStatus } from '../../utils/logisticsStatusMachine';

export interface MonthlyData {
  month: number;
  volume: number;
}

export interface YearlyData {
  year: number;
  volume: number;
  months: MonthlyData[];
}

export class MonthlyVolumeService {
  constructor(private containerRepository: Repository<Container>) {}

  /**
   * 获取最近3年的月度出运量统计
   */
  async getRecentYearsDistribution(): Promise<YearlyData[]> {
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear - 1, currentYear - 2];
    const yearlyData: YearlyData[] = [];

    for (const year of years) {
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

      // 统计该年度已出运的货柜数量
      const yearlyVolume = await this.getYearlyVolume(yearStart, yearEnd);

      // 只添加有数据的年份
      if (yearlyVolume > 0) {
        const monthlyData = await this.getMonthlyDataForYear(year);
        yearlyData.push({
          year,
          volume: yearlyVolume,
          months: monthlyData
        });
      }
    }

    // 按年份降序排列
    return yearlyData.sort((a, b) => b.year - a.year);
  }

  /**
   * 统计年度货量
   */
  private async getYearlyVolume(yearStart: Date, yearEnd: Date): Promise<number> {
    const result = await ContainerQueryBuilder.createBaseQuery(this.containerRepository)
      .select('COUNT(DISTINCT container.containerNumber)', 'count')
      .where('container.logisticsStatus IN (:...statuses)', {
        statuses: [
          SimplifiedStatus.SHIPPED,
          SimplifiedStatus.IN_TRANSIT,
          SimplifiedStatus.AT_PORT,
          SimplifiedStatus.PICKED_UP,
          SimplifiedStatus.UNLOADED,
          SimplifiedStatus.RETURNED_EMPTY
        ]
      })
      .andWhere(
        '(order.expectedShipDate >= :yearStart OR (order.expectedShipDate IS NULL AND order.actualShipDate >= :yearStart2) OR (order.expectedShipDate IS NULL AND order.actualShipDate IS NULL AND sf.shipmentDate >= :yearStart3))',
        { yearStart, yearStart2: yearStart, yearStart3: yearStart }
      )
      .andWhere(
        '(order.expectedShipDate < :yearEnd OR (order.expectedShipDate IS NULL AND order.actualShipDate < :yearEnd2) OR (order.expectedShipDate IS NULL AND order.actualShipDate IS NULL AND sf.shipmentDate < :yearEnd3))',
        { yearEnd, yearEnd2: yearEnd, yearEnd3: yearEnd }
      )
      .getRawOne<{ count: string }>();

    return parseInt(result?.count ?? '0', 10);
  }

  /**
   * 获取指定年份的月度数据
   */
  private async getMonthlyDataForYear(year: number): Promise<MonthlyData[]> {
    const monthlyData: MonthlyData[] = [];

    for (let month = 1; month <= 12; month++) {
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

      const monthlyVolume = await this.getMonthlyVolume(monthStart, monthEnd);

      monthlyData.push({
        month,
        volume: monthlyVolume
      });
    }

    return monthlyData;
  }

  /**
   * 统计月度货量
   */
  private async getMonthlyVolume(monthStart: Date, monthEnd: Date): Promise<number> {
    const result = await ContainerQueryBuilder.createBaseQuery(this.containerRepository)
      .select('COUNT(DISTINCT container.containerNumber)', 'count')
      .where('container.logisticsStatus IN (:...statuses)', {
        statuses: [
          SimplifiedStatus.SHIPPED,
          SimplifiedStatus.IN_TRANSIT,
          SimplifiedStatus.AT_PORT,
          SimplifiedStatus.PICKED_UP,
          SimplifiedStatus.UNLOADED,
          SimplifiedStatus.RETURNED_EMPTY
        ]
      })
      .andWhere(
        '(order.expectedShipDate >= :monthStart OR (order.expectedShipDate IS NULL AND order.actualShipDate >= :monthStart2) OR (order.expectedShipDate IS NULL AND order.actualShipDate IS NULL AND sf.shipmentDate >= :monthStart3))',
        { monthStart, monthStart2: monthStart, monthStart3: monthStart }
      )
      .andWhere(
        '(order.expectedShipDate <= :monthEnd OR (order.expectedShipDate IS NULL AND order.actualShipDate <= :monthEnd2) OR (order.expectedShipDate IS NULL AND order.actualShipDate IS NULL AND sf.shipmentDate <= :monthEnd3))',
        { monthEnd, monthEnd2: monthEnd, monthEnd3: monthEnd }
      )
      .getRawOne<{ count: string }>();

    return parseInt(result?.count ?? '0', 10);
  }
}
