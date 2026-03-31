/**
 * 成本分析报告服务
 * Cost Analytics & Reporting Service
 *
 * 功能：
 * 1. 生成月度/季度成本分析报告
 * 2. 总成本趋势分析
 * 3. 各项费用占比分析
 * 4. 异常费用预警
 * 5. 成本优化建议
 */

import { Repository, SelectQueryBuilder } from 'typeorm';
import { AppDataSource } from '../database';
import { log } from '../utils/logger';

interface CostReportPeriod {
  startDate: Date;
  endDate: Date;
  periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly';
}

interface CostTrendItem {
  date: string;
  totalCost: number;
  demurrageCost: number;
  detentionCost: number;
  storageCost: number;
  yardStorageCost: number;
  transportationCost: number;
  handlingCost: number;
  containerCount: number;
  avgCostPerContainer: number;
}

interface CostVarianceItem {
  containerNumber: string;
  forecastCost: number;
  actualCost: number;
  variance: number;
  variancePercent: number;
  reason: string | null;
}

interface OptimizationOpportunity {
  containerNumber: string;
  currentStrategy: string;
  suggestedStrategy: string;
  currentCost: number;
  optimizedCost: number;
  potentialSavings: number;
}

export interface CostAnalyticsReport {
  // 基础信息
  period: CostReportPeriod;
  generatedAt: Date;

  // 总体统计
  summary: {
    totalContainers: number;
    totalCost: number;
    avgCostPerContainer: number;
    costWithSavings: number; // 有节省的货柜数
    costOverBudget: number; // 超支的货柜数
  };

  // 成本趋势
  trends: CostTrendItem[];

  // 费用构成
  breakdown: {
    demurrageCost: number;
    detentionCost: number;
    storageCost: number;
    yardStorageCost: number;
    transportationCost: number;
    handlingCost: number;
    percentages: {
      demurragePercent: number;
      detentionPercent: number;
      storagePercent: number;
      yardStoragePercent: number;
      transportationPercent: number;
      handlingPercent: number;
    };
  };

  // 差异分析
  variances: CostVarianceItem[];

  // 优化机会
  opportunities: OptimizationOpportunity[];

  // 预警信息
  alerts: Array<{
    type: 'high_cost' | 'variance' | 'trend';
    severity: 'low' | 'medium' | 'high';
    message: string;
    containerNumber?: string;
    amount?: number;
  }>;

  // 建议
  recommendations: string[];
}

export class CostAnalyticsService {
  private forecastRepo: Repository<any>; // ext_cost_forecast_vs_actual

  constructor() {
    this.forecastRepo = AppDataSource.getRepository('ext_cost_forecast_vs_actual');
  }

  /**
   * 📊 生成成本分析报告
   *
   * @param period 报告周期
   * @returns 完整的成本分析报告
   */
  async generateReport(period: CostReportPeriod): Promise<CostAnalyticsReport> {
    try {
      log.info(
        `[CostAnalytics] Generating ${period.periodType} report from ${period.startDate} to ${period.endDate}`
      );

      const report: CostAnalyticsReport = {
        period,
        generatedAt: new Date(),
        summary: await this.generateSummary(period),
        trends: await this.analyzeTrends(period),
        breakdown: await this.analyzeBreakdown(period),
        variances: await this.analyzeVariances(period),
        opportunities: await this.identifyOptimizationOpportunities(period),
        alerts: await this.generateAlerts(period),
        recommendations: await this.generateRecommendations(period)
      };

      log.info(`[CostAnalytics] Report generated successfully`);
      log.info(`  - Total containers: ${report.summary.totalContainers}`);
      log.info(`  - Total cost: $${report.summary.totalCost.toFixed(2)}`);
      log.info(`  - Avg cost per container: $${report.summary.avgCostPerContainer.toFixed(2)}`);

      return report;
    } catch (error) {
      log.error('[CostAnalytics] Failed to generate report:', error);
      throw error;
    }
  }

  /**
   * 生成总体统计
   */
  private async generateSummary(period: CostReportPeriod): Promise<CostAnalyticsReport['summary']> {
    const query = this.createBaseQuery(period);

    const result = await query
      .select('COUNT(DISTINCT container_number)', 'totalContainers')
      .addSelect('SUM(actual_total_cost)', 'totalCost')
      .addSelect('AVG(actual_total_cost)', 'avgCostPerContainer')
      .addSelect(`COUNT(CASE WHEN cost_variance < 0 THEN 1 END)`, 'costWithSavings')
      .addSelect(`COUNT(CASE WHEN cost_variance > 0 THEN 1 END)`, 'costOverBudget')
      .getRawOne();

    return {
      totalContainers: parseInt(result.totalContainers) || 0,
      totalCost: parseFloat(result.totalCost) || 0,
      avgCostPerContainer: parseFloat(result.avgCostPerContainer) || 0,
      costWithSavings: parseInt(result.costWithSavings) || 0,
      costOverBudget: parseInt(result.costOverBudget) || 0
    };
  }

  /**
   * 分析成本趋势
   */
  private async analyzeTrends(period: CostReportPeriod): Promise<CostTrendItem[]> {
    const query = this.createBaseQuery(period);

    // 根据周期类型分组
    let dateExpr: string;
    switch (period.periodType) {
      case 'daily':
        dateExpr = 'DATE(forecast_created_at)';
        break;
      case 'weekly':
        dateExpr = "DATE_TRUNC('week', forecast_created_at)::date";
        break;
      case 'monthly':
        dateExpr = "DATE_TRUNC('month', forecast_created_at)::date";
        break;
      case 'quarterly':
        dateExpr = "DATE_TRUNC('quarter', forecast_created_at)::date";
        break;
      default:
        dateExpr = 'DATE(forecast_created_at)';
    }

    const results = await query
      .select(dateExpr, 'date')
      .addSelect('SUM(actual_total_cost)', 'totalCost')
      .addSelect('SUM(actual_demurrage_cost)', 'demurrageCost')
      .addSelect('SUM(actual_detention_cost)', 'detentionCost')
      .addSelect('SUM(actual_storage_cost)', 'storageCost')
      .addSelect('SUM(actual_yard_storage_cost)', 'yardStorageCost')
      .addSelect('SUM(actual_transportation_cost)', 'transportationCost')
      .addSelect('SUM(actual_handling_cost)', 'handlingCost')
      .addSelect('COUNT(DISTINCT container_number)', 'containerCount')
      .addSelect('AVG(actual_total_cost)', 'avgCostPerContainer')
      .groupBy(dateExpr)
      .orderBy('date', 'ASC')
      .getRawMany();

    return results.map((r: any) => ({
      date: r.date,
      totalCost: parseFloat(r.totalCost) || 0,
      demurrageCost: parseFloat(r.demurrageCost) || 0,
      detentionCost: parseFloat(r.detentionCost) || 0,
      storageCost: parseFloat(r.storageCost) || 0,
      yardStorageCost: parseFloat(r.yardStorageCost) || 0,
      transportationCost: parseFloat(r.transportationCost) || 0,
      handlingCost: parseFloat(r.handlingCost) || 0,
      containerCount: parseInt(r.containerCount) || 0,
      avgCostPerContainer: parseFloat(r.avgCostPerContainer) || 0
    }));
  }

  /**
   * 分析费用构成
   */
  private async analyzeBreakdown(
    period: CostReportPeriod
  ): Promise<CostAnalyticsReport['breakdown']> {
    const query = this.createBaseQuery(period);

    const result = await query
      .select('SUM(actual_demurrage_cost)', 'demurrageCost')
      .addSelect('SUM(actual_detention_cost)', 'detentionCost')
      .addSelect('SUM(actual_storage_cost)', 'storageCost')
      .addSelect('SUM(actual_yard_storage_cost)', 'yardStorageCost')
      .addSelect('SUM(actual_transportation_cost)', 'transportationCost')
      .addSelect('SUM(actual_handling_cost)', 'handlingCost')
      .addSelect('SUM(actual_total_cost)', 'totalCost')
      .getRawOne();

    const total = parseFloat(result.totalCost) || 0;

    return {
      demurrageCost: parseFloat(result.demurrageCost) || 0,
      detentionCost: parseFloat(result.detentionCost) || 0,
      storageCost: parseFloat(result.storageCost) || 0,
      yardStorageCost: parseFloat(result.yardStorageCost) || 0,
      transportationCost: parseFloat(result.transportationCost) || 0,
      handlingCost: parseFloat(result.handlingCost) || 0,
      percentages: {
        demurragePercent: total > 0 ? (parseFloat(result.demurrageCost) / total) * 100 : 0,
        detentionPercent: total > 0 ? (parseFloat(result.detentionCost) / total) * 100 : 0,
        storagePercent: total > 0 ? (parseFloat(result.storageCost) / total) * 100 : 0,
        yardStoragePercent: total > 0 ? (parseFloat(result.yardStorageCost) / total) * 100 : 0,
        transportationPercent:
          total > 0 ? (parseFloat(result.transportationCost) / total) * 100 : 0,
        handlingPercent: total > 0 ? (parseFloat(result.handlingCost) / total) * 100 : 0
      }
    };
  }

  /**
   * 分析差异
   */
  private async analyzeVariances(period: CostReportPeriod): Promise<CostVarianceItem[]> {
    const query = this.createBaseQuery(period);

    const results = await query
      .select('container_number', 'containerNumber')
      .addSelect('forecast_total_cost', 'forecastCost')
      .addSelect('actual_total_cost', 'actualCost')
      .addSelect('cost_variance', 'variance')
      .addSelect('variance_percent', 'variancePercent')
      .addSelect('variance_reason', 'reason')
      .where('actual_total_cost IS NOT NULL')
      .andWhere('cost_variance != 0')
      .orderBy('ABS(cost_variance)', 'DESC')
      .limit(50)
      .getRawMany();

    return results.map((r: any) => ({
      containerNumber: r.containerNumber,
      forecastCost: parseFloat(r.forecastCost) || 0,
      actualCost: parseFloat(r.actualCost) || 0,
      variance: parseFloat(r.variance) || 0,
      variancePercent: parseFloat(r.variancePercent) || 0,
      reason: r.reason
    }));
  }

  /**
   * 识别优化机会
   */
  private async identifyOptimizationOpportunities(
    period: CostReportPeriod
  ): Promise<OptimizationOpportunity[]> {
    const query = this.createBaseQuery(period);

    const results = await query
      .select('container_number', 'containerNumber')
      .addSelect('forecast_strategy', 'currentStrategy')
      .addSelect('suggested_strategy', 'suggestedStrategy')
      .addSelect('forecast_total_cost', 'currentCost')
      .addSelect('(forecast_total_cost - potential_savings)', 'optimizedCost')
      .addSelect('potential_savings', 'potentialSavings')
      .where('potential_savings IS NOT NULL')
      .andWhere('potential_savings > 0')
      .orderBy('potential_savings', 'DESC')
      .limit(20)
      .getRawMany();

    return results.map((r: any) => ({
      containerNumber: r.containerNumber,
      currentStrategy: r.currentStrategy,
      suggestedStrategy: r.suggestedStrategy,
      currentCost: parseFloat(r.currentCost) || 0,
      optimizedCost: parseFloat(r.optimizedCost) || 0,
      potentialSavings: parseFloat(r.potentialSavings) || 0
    }));
  }

  /**
   * 生成预警信息
   */
  private async generateAlerts(period: CostReportPeriod): Promise<CostAnalyticsReport['alerts']> {
    const alerts: CostAnalyticsReport['alerts'] = [];

    // 1. 高成本预警（超过平均成本 50%）
    const highCostQuery = this.createBaseQuery(period);
    const avgCostResult = await highCostQuery
      .select('AVG(actual_total_cost)', 'avgCost')
      .getRawOne();
    const avgCost = parseFloat(avgCostResult.avgCost) || 0;
    const threshold = avgCost * 1.5;

    const highCostContainers = await this.createBaseQuery(period)
      .select('container_number', 'containerNumber')
      .addSelect('actual_total_cost', 'cost')
      .where('actual_total_cost > :threshold', { threshold })
      .getRawMany();

    for (const r of highCostContainers) {
      alerts.push({
        type: 'high_cost',
        severity: 'high',
        message: `柜号 ${r.containerNumber} 成本 $${r.cost.toFixed(2)} 超出平均值 50%`,
        containerNumber: r.containerNumber,
        amount: parseFloat(r.cost)
      });
    }

    // 2. 差异预警（实际比预测超过 30%）
    const varianceAlerts = await this.createBaseQuery(period)
      .select('container_number', 'containerNumber')
      .addSelect('variance_percent', 'variancePercent')
      .addSelect('cost_variance', 'variance')
      .where('variance_percent > 30')
      .getRawMany();

    for (const r of varianceAlerts) {
      alerts.push({
        type: 'variance',
        severity: 'medium',
        message: `柜号 ${r.containerNumber} 成本超支 ${r.variancePercent.toFixed(1)}% ($${r.variance.toFixed(2)})`,
        containerNumber: r.containerNumber,
        amount: parseFloat(r.variance)
      });
    }

    // 3. 趋势预警（连续上涨）
    const trends = await this.analyzeTrends(period);
    if (trends.length >= 3) {
      const lastThree = trends.slice(-3);
      const isIncreasing = lastThree.every(
        (t, i, arr) => i === 0 || t.totalCost > arr[i - 1].totalCost
      );

      if (isIncreasing) {
        alerts.push({
          type: 'trend',
          severity: 'medium',
          message: '成本连续上涨，建议关注并分析原因'
        });
      }
    }

    return alerts;
  }

  /**
   * 生成优化建议
   */
  private async generateRecommendations(period: CostReportPeriod): Promise<string[]> {
    const recommendations: string[] = [];

    // 基于数据分析生成建议
    const breakdown = await this.analyzeBreakdown(period);
    const summary = await this.generateSummary(period);

    // 1. 滞港费占比过高
    if (breakdown.percentages.demurragePercent > 30) {
      recommendations.push('滞港费占比较高，建议优化清关流程，加快提柜速度');
    }

    // 2. 外部堆场费占比高
    if (breakdown.percentages.yardStoragePercent > 15) {
      recommendations.push('外部堆场费较高，建议增加 Direct 模式比例或优化 Drop off 时间安排');
    }

    // 3. 加急费使用频繁
    if (breakdown.percentages.handlingPercent > 10) {
      recommendations.push('加急操作频繁，建议提前规划排产，减少紧急处理');
    }

    // 4. 成本差异大
    if (summary.costOverBudget > summary.costWithSavings) {
      recommendations.push('多数货柜成本超支，建议加强成本预测准确性和过程管控');
    }

    // 5. 默认建议
    if (recommendations.length === 0) {
      recommendations.push('成本结构健康，继续保持当前优化策略');
    }

    return recommendations;
  }

  /**
   * 创建基础查询
   */
  private createBaseQuery(period: CostReportPeriod): SelectQueryBuilder<any> {
    return AppDataSource.getRepository('ext_cost_forecast_vs_actual')
      .createQueryBuilder('cost')
      .where('cost.forecast_created_at BETWEEN :startDate AND :endDate', {
        startDate: period.startDate,
        endDate: period.endDate
      })
      .andWhere('cost.actual_total_cost IS NOT NULL');
  }
}
