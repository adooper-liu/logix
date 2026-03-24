import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { AlertService, AlertLevel, AlertType } from '../services/alertService';

@Controller('api/v1/alerts')
export class AlertController {
  constructor(private alertService: AlertService) {}

  // 获取单个货柜的预警
  @Get('container/:containerNumber')
  async getContainerAlerts(@Param('containerNumber') containerNumber: string) {
    const alerts = await this.alertService.getContainerAlerts(containerNumber);
    return {
      success: true,
      data: alerts,
    };
  }

  // 获取所有预警
  @Get()
  async getAllAlerts(
    @Query('level') level?: string,
    @Query('type') type?: string,
    @Query('resolved') resolved?: string,
  ) {
    const filters = {
      level: level as AlertLevel,
      type: type as AlertType,
      resolved: resolved === 'true',
    };

    const alerts = await this.alertService.getAllAlerts(filters);
    return {
      success: true,
      data: alerts,
    };
  }

  // 解决预警
  @Post('resolve/:alertId')
  async resolveAlert(@Param('alertId') alertId: number, @Query('userId') userId?: string) {
    const result = await this.alertService.resolveAlert(alertId, userId || 'system');
    return {
      success: result,
      message: result ? '预警已解决' : '预警解决失败',
    };
  }
}
