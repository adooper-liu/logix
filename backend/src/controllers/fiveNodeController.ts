import { Controller, Get, Param, Query } from '@nestjs/common';
import { FiveNodeService } from '../services/fiveNodeService';

@Controller('api/v1/five-node')
export class FiveNodeController {
  constructor(private fiveNodeService: FiveNodeService) {}

  // 获取单个货柜的五节点信息
  @Get('container/:containerNumber')
  async getFiveNodeInfo(@Param('containerNumber') containerNumber: string) {
    const info = await this.fiveNodeService.getFiveNodeInfo(containerNumber);
    if (!info) {
      return {
        success: false,
        message: '货柜不存在',
      };
    }
    return {
      success: true,
      data: info,
    };
  }

  // 获取所有货柜的五节点信息（用于列表）
  @Get('containers')
  async getAllFiveNodeInfo(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
  ) {
    const filters = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status,
    };

    const infoList = await this.fiveNodeService.getAllFiveNodeInfo(filters);
    return {
      success: true,
      data: infoList,
    };
  }
}
