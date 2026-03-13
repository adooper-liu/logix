import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DemurrageService } from './demurrage.service';
import { InspectionRecord } from '../entities/InspectionRecord';

// 费用类型
export enum CostType {
  DEMURRAGE = 'demurrage',
  DETENTION = 'detention',
  INSPECTION = 'inspection',
  TRUCKING = 'trucking',
  WAREHOUSE = 'warehouse',
  OTHER = 'other',
}

// 费用项接口
export interface CostItem {
  type: CostType;
  description: string;
  amount: number;
  currency: string;
  startDate?: Date;
  endDate?: Date;
  details?: any;
}

// 费用计算结果
export interface CostCalculationResult {
  containerNumber: string;
  totalAmount: number;
  currency: string;
  items: CostItem[];
  calculationDate: Date;
}

@Injectable()
export class CostService {
  constructor(
    private demurrageService: DemurrageService,
    @InjectRepository(InspectionRecord) private inspectionRepository: Repository<InspectionRecord>,
  ) {}

  // 计算货柜的总费用
  async calculateContainerCosts(containerNumber: string): Promise<CostCalculationResult> {
    const items: CostItem[] = [];
    let totalAmount = 0;
    let currency = 'USD';

    // 1. 计算滞港滞箱费用
    const demurrageResult = await this.demurrageService.calculateForContainer(containerNumber);
    if (demurrageResult.result) {
      const demurrageItems = this.convertDemurrageToCostItems(demurrageResult.result);
      items.push(...demurrageItems);
    }

    // 2. 计算查验费用
    const inspectionItems = await this.calculateInspectionCosts(containerNumber);
    items.push(...inspectionItems);

    // 3. 计算拖卡费用
    const truckingItems = await this.calculateTruckingCosts(containerNumber);
    items.push(...truckingItems);

    // 4. 计算卸柜费用
    const warehouseItems = await this.calculateWarehouseCosts(containerNumber);
    items.push(...warehouseItems);

    // 计算总费用
    items.forEach(item => {
      totalAmount += item.amount;
      if (item.currency) {
        currency = item.currency;
      }
    });

    return {
      containerNumber,
      totalAmount,
      currency,
      items,
      calculationDate: new Date(),
    };
  }

  // 将滞港费计算结果转换为费用项
  private convertDemurrageToCostItems(demurrageResult: any): CostItem[] {
    const items: CostItem[] = [];

    if (demurrageResult.items && demurrageResult.items.length > 0) {
      demurrageResult.items.forEach((item: any) => {
        const costType = item.chargeTypeCode?.toLowerCase().includes('detention') || 
                       item.chargeName?.toLowerCase().includes('detention') ||
                       item.chargeName?.toLowerCase().includes('滞箱')
          ? CostType.DETENTION
          : CostType.DEMURRAGE;

        items.push({
          type: costType,
          description: item.chargeName || '滞港费',
          amount: item.amount,
          currency: item.currency,
          startDate: item.startDate,
          endDate: item.endDate,
          details: {
            freeDays: item.freeDays,
            chargeDays: item.chargeDays,
            tierBreakdown: item.tierBreakdown,
          },
        });
      });
    }

    return items;
  }

  // 计算查验费用
  private async calculateInspectionCosts(containerNumber: string): Promise<CostItem[]> {
    const items: CostItem[] = [];

    const inspection = await this.inspectionRepository.findOne({
      where: { containerNumber },
    });

    if (inspection) {
      // 这里可以根据查验记录计算相关费用
      // 暂时返回模拟数据
      if (inspection.demurrageFee && inspection.demurrageFee > 0) {
        items.push({
          type: CostType.INSPECTION,
          description: '查验滞港费',
          amount: inspection.demurrageFee,
          currency: 'USD',
        });
      }

      // 可以添加其他查验相关费用
      items.push({
        type: CostType.INSPECTION,
        description: '查验手续费',
        amount: 500,
        currency: 'USD',
      });
    }

    return items;
  }

  // 计算拖卡费用
  private async calculateTruckingCosts(containerNumber: string): Promise<CostItem[]> {
    const items: CostItem[] = [];

    // 这里可以根据拖卡记录计算相关费用
    // 暂时返回模拟数据
    items.push({
      type: CostType.TRUCKING,
      description: '拖卡费用',
      amount: 1000,
      currency: 'USD',
    });

    return items;
  }

  // 计算卸柜费用
  private async calculateWarehouseCosts(containerNumber: string): Promise<CostItem[]> {
    const items: CostItem[] = [];

    // 这里可以根据仓库操作记录计算相关费用
    // 暂时返回模拟数据
    items.push({
      type: CostType.WAREHOUSE,
      description: '卸柜费用',
      amount: 500,
      currency: 'USD',
    });

    return items;
  }

  // 计算多个货柜的费用
  async calculateMultipleContainersCosts(containerNumbers: string[]): Promise<CostCalculationResult[]> {
    const results = await Promise.all(
      containerNumbers.map(containerNumber => this.calculateContainerCosts(containerNumber))
    );

    return results;
  }

  // 获取费用汇总统计
  async getCostSummary(filters?: {
    startDate?: Date;
    endDate?: Date;
    costType?: CostType;
    containerNumbers?: string[];
  }): Promise<{
    totalAmount: number;
    currency: string;
    byType: Record<CostType, number>;
    byContainer: Record<string, number>;
  }> {
    // 这里可以实现费用汇总统计逻辑
    // 暂时返回模拟数据
    return {
      totalAmount: 0,
      currency: 'USD',
      byType: {
        [CostType.DEMURRAGE]: 0,
        [CostType.DETENTION]: 0,
        [CostType.INSPECTION]: 0,
        [CostType.TRUCKING]: 0,
        [CostType.WAREHOUSE]: 0,
        [CostType.OTHER]: 0,
      },
      byContainer: {},
    };
  }
}
