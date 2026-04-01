import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { CostService, CostType } from '../services/costService';

@Controller('api/v1/costs')
export class CostController {
  constructor(private costService: CostService) {}

  // 计算单个货柜的费用
  @Get('container/:containerNumber')
  async calculateContainerCosts(@Param('containerNumber') containerNumber: string) {
    const result = await this.costService.calculateContainerCosts(containerNumber);
    return {
      success: true,
      data: result
    };
  }

  // 计算多个货柜的费用
  @Post('containers')
  async calculateMultipleContainersCosts(@Body('containerNumbers') containerNumbers: string[]) {
    const results = await this.costService.calculateMultipleContainersCosts(containerNumbers);
    return {
      success: true,
      data: results
    };
  }

  // 获取费用汇总统计
  @Get('summary')
  async getCostSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('costType') costType?: string,
    @Query('containerNumbers') containerNumbers?: string
  ) {
    const filters = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      costType: costType as CostType,
      containerNumbers: containerNumbers ? containerNumbers.split(',') : undefined
    };

    const summary = await this.costService.getCostSummary(filters);
    return {
      success: true,
      data: summary
    };
  }
}
