/**
 * 成本优化集成示例
 * Cost Optimization Integration Example
 *
 * 展示如何在智能排柜流程中集成成本优化功能
 */

import { Container } from '../entities/Container';
import { IntelligentSchedulingService } from './intelligentScheduling.service';
import {
  SchedulingCostOptimizerService,
  CostBreakdown,
  UnloadOption
} from './schedulingCostOptimizer.service';
import { logger } from '../utils/logger';

/**
 * 成本优化集成服务
 */
export class CostOptimizationIntegrationService {
  private intelligentSchedulingService: IntelligentSchedulingService;
  private costOptimizerService: SchedulingCostOptimizerService;

  constructor() {
    this.intelligentSchedulingService = new IntelligentSchedulingService();
    this.costOptimizerService = new SchedulingCostOptimizerService();
  }

  /**
   * 评估排产计划的成本
   * @param container 货柜信息
   * @param plannedPickupDate 计划提柜日
   * @param plannedUnloadDate 计划卸柜日
   * @param lastFreeDate 免费期截止日
   * @returns 成本评估结果
   */
  async evaluateScheduleCost(
    container: Container,
    plannedPickupDate: Date,
    plannedUnloadDate: Date,
    lastFreeDate: Date
  ): Promise<{
    currentCost: number;
    optimalCost: number;
    potentialSavings: number;
    optimizationAdvice: string;
    currentBreakdown?: CostBreakdown;
    optimalOption?: UnloadOption;
  }> {
    try {
      // 1. 评估当前计划的成本
      const currentOption: UnloadOption = {
        containerNumber: container.containerNumber,
        warehouse: {} as any, // 假设已经有仓库信息
        plannedPickupDate: plannedPickupDate, // 使用 plannedPickupDate
        plannedUnloadDate: plannedUnloadDate, // 使用 plannedUnloadDate
        strategy: 'Direct',
        isWithinFreePeriod: plannedUnloadDate <= lastFreeDate
      };

      const currentBreakdown = await this.costOptimizerService.evaluateTotalCost(currentOption);
      const currentCost = currentBreakdown.totalCost;

      // 2. 生成所有可行方案并评估成本
      const allOptions = await this.costOptimizerService.generateAllFeasibleOptions(
        container,
        plannedPickupDate,
        lastFreeDate
      );

      if (allOptions.length === 0) {
        return {
          currentCost,
          optimalCost: currentCost,
          potentialSavings: 0,
          optimizationAdvice: '无其他可行方案',
          currentBreakdown
        };
      }

      // 3. 选择最优方案
      const bestResult = await this.costOptimizerService.selectBestOption(allOptions);
      const optimalCost = bestResult.option.totalCost || 0;
      const potentialSavings = currentCost - optimalCost;

      // 4. 生成优化建议
      const optimizationAdvice = this.generateOptimizationAdvice(
        potentialSavings,
        bestResult.option
      );

      return {
        currentCost,
        optimalCost,
        potentialSavings,
        optimizationAdvice,
        currentBreakdown,
        optimalOption: bestResult.option
      };
    } catch (error) {
      logger.error('[CostOptimization] Error evaluating schedule cost:', error);
      return {
        currentCost: 0,
        optimalCost: 0,
        potentialSavings: 0,
        optimizationAdvice: '成本评估失败'
      };
    }
  }

  /**
   * 批量评估多个货柜的排产成本
   * @param containers 货柜列表
   * @param schedules 排产计划列表
   * @returns 批量评估结果
   */
  async batchEvaluate(
    containers: Container[],
    schedules: Array<{
      containerNumber: string;
      plannedPickupDate: Date;
      plannedUnloadDate: Date;
      lastFreeDate: Date;
    }>
  ): Promise<
    Array<{
      containerNumber: string;
      costOptimization: {
        currentCost: number;
        optimalCost: number;
        potentialSavings: number;
        optimizationAdvice: string;
      };
    }>
  > {
    const results = [];

    for (const container of containers) {
      const schedule = schedules.find((s) => s.containerNumber === container.containerNumber);
      if (!schedule) continue;

      const costResult = await this.evaluateScheduleCost(
        container,
        schedule.plannedPickupDate,
        schedule.plannedUnloadDate,
        schedule.lastFreeDate
      );

      results.push({
        containerNumber: container.containerNumber,
        costOptimization: costResult
      });
    }

    return results;
  }

  /**
   * 生成成本优化报告
   * @param batchResults 批量评估结果
   * @returns 成本优化报告
   */
  generateCostReport(
    batchResults: Array<{
      containerNumber: string;
      costOptimization: {
        currentCost: number;
        optimalCost: number;
        potentialSavings: number;
        optimizationAdvice: string;
      };
    }>
  ): {
    totalContainers: number;
    totalCurrentCost: number;
    totalOptimalCost: number;
    totalPotentialSavings: number;
    containersWithSavings: number;
    averageSavingsPerContainer: number;
  } {
    const totalContainers = batchResults.length;
    const totalCurrentCost = batchResults.reduce(
      (sum, item) => sum + item.costOptimization.currentCost,
      0
    );
    const totalOptimalCost = batchResults.reduce(
      (sum, item) => sum + item.costOptimization.optimalCost,
      0
    );
    const totalPotentialSavings = batchResults.reduce(
      (sum, item) => sum + item.costOptimization.potentialSavings,
      0
    );
    const containersWithSavings = batchResults.filter(
      (item) => item.costOptimization.potentialSavings > 0
    ).length;
    const averageSavingsPerContainer =
      totalContainers > 0 ? totalPotentialSavings / totalContainers : 0;

    return {
      totalContainers,
      totalCurrentCost,
      totalOptimalCost,
      totalPotentialSavings,
      containersWithSavings,
      averageSavingsPerContainer
    };
  }

  /**
   * 集成到排产流程
   * @param container 货柜信息
   * @param plannedPickupDate 计划提柜日
   * @param lastFreeDate 免费期截止日
   * @returns 排产结果（包含成本优化建议）
   */
  async integrateWithScheduling(
    container: Container,
    plannedPickupDate: Date,
    lastFreeDate: Date
  ): Promise<{
    schedulingResult: any;
    costOptimization: {
      currentCost: number;
      optimalCost: number;
      potentialSavings: number;
      optimizationAdvice: string;
      optimalOption?: UnloadOption;
    };
  }> {
    // 1. 执行智能排产
    const schedulingResult = await this.intelligentSchedulingService.batchSchedule({
      containerNumbers: [container.containerNumber],
      forceSchedule: true
    });

    // 2. 提取排产结果中的计划卸柜日
    const scheduleResult = schedulingResult.results[0];
    if (
      !scheduleResult ||
      !scheduleResult.success ||
      !scheduleResult.plannedData?.plannedUnloadDate
    ) {
      return {
        schedulingResult,
        costOptimization: {
          currentCost: 0,
          optimalCost: 0,
          potentialSavings: 0,
          optimizationAdvice: '排产失败，无法评估成本'
        }
      };
    }

    const plannedUnloadDate = new Date(scheduleResult.plannedData.plannedUnloadDate);

    // 3. 评估成本并生成优化建议
    const costOptimization = await this.evaluateScheduleCost(
      container,
      plannedPickupDate,
      plannedUnloadDate,
      lastFreeDate
    );

    return {
      schedulingResult,
      costOptimization
    };
  }

  /**
   * 生成优化建议
   * @param potentialSavings 潜在节省金额
   * @param optimalOption 最优方案
   * @returns 优化建议
   */
  private generateOptimizationAdvice(
    potentialSavings: number,
    optimalOption?: UnloadOption
  ): string {
    if (potentialSavings <= 50) {
      return '✅ 当前方案已是最优，无需调整';
    } else if (potentialSavings <= 200) {
      return `ℹ️ 建议调整为 ${optimalOption?.strategy} 策略，可节省 $${potentialSavings.toFixed(2)}`;
    } else if (potentialSavings <= 500) {
      return `💡 建议调整为 ${optimalOption?.strategy} 策略，可节省 $${potentialSavings.toFixed(2)}`;
    } else {
      return `💰 强烈建议调整为 ${optimalOption?.strategy} 策略，可节省 $${potentialSavings.toFixed(2)}`;
    }
  }
}

/**
 * 示例 1: 单柜成本评估
 */
export async function exampleSingleContainerCostEvaluation() {
  const integrationService = new CostOptimizationIntegrationService();

  // 模拟货柜数据
  const mockContainer: Container = {
    containerNumber: 'TEST1234567',
    countryCode: 'US',
    portCode: 'LAX',
    status: 'ARRIVED'
  } as any;

  const result = await integrationService.evaluateScheduleCost(
    mockContainer,
    new Date('2026-03-20'),
    new Date('2026-03-21'),
    new Date('2026-03-25')
  );

  console.log('单柜成本评估结果:');
  console.log(`当前成本：$${result.currentCost}`);
  console.log(`最优成本：$${result.optimalCost}`);
  console.log(`可节省：$${result.potentialSavings}`);
  console.log(`建议：${result.optimizationAdvice}`);

  return result;
}

/**
 * 示例 2: 批量成本评估
 */
export async function exampleBatchCostEvaluation() {
  const integrationService = new CostOptimizationIntegrationService();

  // 模拟多个货柜数据
  const mockContainers: Container[] = [
    {
      containerNumber: 'TEST1234567',
      countryCode: 'US',
      portCode: 'LAX',
      status: 'ARRIVED'
    } as any,
    {
      containerNumber: 'TEST7654321',
      countryCode: 'US',
      portCode: 'LAX',
      status: 'ARRIVED'
    } as any
  ];

  const schedules = [
    {
      containerNumber: 'TEST1234567',
      plannedPickupDate: new Date('2026-03-20'),
      plannedUnloadDate: new Date('2026-03-21'),
      lastFreeDate: new Date('2026-03-25')
    },
    {
      containerNumber: 'TEST7654321',
      plannedPickupDate: new Date('2026-03-21'),
      plannedUnloadDate: new Date('2026-03-22'),
      lastFreeDate: new Date('2026-03-26')
    }
  ];

  const results = await integrationService.batchEvaluate(mockContainers, schedules);
  const report = integrationService.generateCostReport(results);

  console.log('批量成本评估报告:');
  console.log(`总货柜数：${report.totalContainers}`);
  console.log(`当前总成本：$${report.totalCurrentCost}`);
  console.log(`最优总成本：$${report.totalOptimalCost}`);
  console.log(`可节省总额：$${report.totalPotentialSavings}`);
  console.log(`有节省的货柜数：${report.containersWithSavings}`);
  console.log(`平均每柜节省：$${report.averageSavingsPerContainer}`);

  return report;
}

/**
 * 示例 3: 集成到排产流程
 */
export async function exampleIntegrationWithScheduling() {
  const integrationService = new CostOptimizationIntegrationService();

  // 模拟货柜数据
  const mockContainer: Container = {
    containerNumber: 'TEST1234567',
    countryCode: 'US',
    portCode: 'LAX',
    status: 'ARRIVED'
  } as any;

  const result = await integrationService.integrateWithScheduling(
    mockContainer,
    new Date('2026-03-20'),
    new Date('2026-03-25')
  );

  console.log('排产集成结果:');
  console.log(`排产状态：${result.schedulingResult.success ? '成功' : '失败'}`);
  console.log(`当前成本：$${result.costOptimization.currentCost}`);
  console.log(`最优成本：$${result.costOptimization.optimalCost}`);
  console.log(`可节省：$${result.costOptimization.potentialSavings}`);
  console.log(`建议：${result.costOptimization.optimizationAdvice}`);

  return result;
}

// 导出集成服务实例
export const costOptimizationIntegrationService = new CostOptimizationIntegrationService();
