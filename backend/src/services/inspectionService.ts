import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InspectionRecord } from '../entities/InspectionRecord';
import { InspectionEvent } from '../entities/InspectionEvent';

@Injectable()
export class InspectionService {
  constructor(
    @InjectRepository(InspectionRecord)
    private inspectionRecordRepository: Repository<InspectionRecord>,
    @InjectRepository(InspectionEvent)
    private inspectionEventRepository: Repository<InspectionEvent>,
  ) {}

  // 根据柜号获取查验记录
  async getByContainerNumber(containerNumber: string): Promise<InspectionRecord | null> {
    return this.inspectionRecordRepository.findOne({
      where: { containerNumber },
      relations: ['events'],
      order: {
        events: {
          eventDate: 'ASC',
        },
      },
    });
  }

  // 创建或更新查验记录
  async createOrUpdate(record: Partial<InspectionRecord>): Promise<InspectionRecord> {
    const existingRecord = await this.getByContainerNumber(record.containerNumber!);

    if (existingRecord) {
      // 更新现有记录
      Object.assign(existingRecord, record);
      return this.inspectionRecordRepository.save(existingRecord);
    } else {
      // 创建新记录
      const newRecord = this.inspectionRecordRepository.create(record);
      return this.inspectionRecordRepository.save(newRecord);
    }
  }

  // 添加查验事件
  async addEvent(inspectionRecordId: number, event: {
    eventDate: Date;
    eventStatus: string;
  }): Promise<InspectionEvent> {
    const newEvent = this.inspectionEventRepository.create({
      inspectionRecordId,
      eventDate: event.eventDate,
      eventStatus: event.eventStatus,
    });
    return this.inspectionEventRepository.save(newEvent);
  }

  // 删除查验事件
  async deleteEvent(eventId: number): Promise<void> {
    await this.inspectionEventRepository.delete(eventId);
  }

  // 获取所有查验记录（用于报表）
  async getAllRecords(filters?: {
    startDate?: Date;
    endDate?: Date;
    country?: string;
    customsClearanceStatus?: string;
  }): Promise<InspectionRecord[]> {
    const query = this.inspectionRecordRepository.createQueryBuilder('record');

    if (filters) {
      if (filters.startDate) {
        query.andWhere('record.created_at >= :startDate', { startDate: filters.startDate });
      }
      if (filters.endDate) {
        query.andWhere('record.created_at <= :endDate', { endDate: filters.endDate });
      }
      if (filters.customsClearanceStatus) {
        query.andWhere('record.customs_clearance_status = :status', { status: filters.customsClearanceStatus });
      }
    }

    return query
      .leftJoinAndSelect('record.events', 'events')
      .orderBy('record.created_at', 'DESC')
      .getMany();
  }
}
