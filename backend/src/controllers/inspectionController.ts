import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { InspectionService } from '../services/inspectionService';
import { InspectionRecord } from '../entities/InspectionRecord';

@Controller('api/v1/inspection')
export class InspectionController {
  constructor(private inspectionService: InspectionService) {}

  // 获取货柜的查验记录
  @Get('container/:containerNumber')
  async getByContainerNumber(@Param('containerNumber') containerNumber: string) {
    const record = await this.inspectionService.getByContainerNumber(containerNumber);
    return {
      success: true,
      data: record,
    };
  }

  // 创建或更新查验记录
  @Post('record')
  async createOrUpdate(@Body() record: Partial<InspectionRecord>) {
    const result = await this.inspectionService.createOrUpdate(record);
    return {
      success: true,
      data: result,
    };
  }

  // 添加查验事件
  @Post('event')
  async addEvent(
    @Body('inspectionRecordId') inspectionRecordId: number,
    @Body('eventDate') eventDate: string,
    @Body('eventStatus') eventStatus: string,
  ) {
    const result = await this.inspectionService.addEvent(inspectionRecordId, {
      eventDate: new Date(eventDate),
      eventStatus,
    });
    return {
      success: true,
      data: result,
    };
  }

  // 删除查验事件
  @Delete('event/:eventId')
  async deleteEvent(@Param('eventId') eventId: number) {
    await this.inspectionService.deleteEvent(eventId);
    return {
      success: true,
    };
  }

  // 获取查验记录列表（用于报表）
  @Get('records')
  async getAllRecords(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('customsClearanceStatus') customsClearanceStatus?: string,
  ) {
    const filters = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      customsClearanceStatus,
    };
    const records = await this.inspectionService.getAllRecords(filters);
    return {
      success: true,
      data: records,
    };
  }
}
