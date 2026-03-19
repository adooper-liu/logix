/**
 * 飞驼状态原始数据实体
 * 存储飞驼API status[] 原始数据
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('ext_feituo_status_events')
@Index('idx_feituo_status_container', ['containerNumber'])
@Index('idx_feituo_status_bol', ['billOfLadingNumber'])
@Index('idx_feituo_status_code', ['eventCode'])
@Index('idx_feituo_status_time', ['eventTime'])
@Index('idx_feituo_status_created', ['createdAt'])
export class ExtFeituoStatusEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, name: 'container_number' })
  containerNumber: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'bill_of_lading_number' })
  billOfLadingNumber: string | null;

  // 状态基本信息
  @Column({ type: 'int', name: 'status_index' })
  statusIndex: number;

  @Column({ type: 'varchar', length: 20, name: 'event_code' })
  eventCode: string;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'description_cn' })
  descriptionCn: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'description_en' })
  descriptionEn: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'event_description_origin' })
  eventDescriptionOrigin: string | null;

  // 时间信息
  @Column({ type: 'timestamptz', name: 'event_time' })
  eventTime: Date;

  @Column({ type: 'boolean', default: false, name: 'is_estimated' })
  isEstimated: boolean;

  @Column({ type: 'varchar', length: 10, nullable: true, name: 'port_timezone' })
  portTimezone: string | null;

  // 地点信息
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'event_place' })
  eventPlace: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'event_place_origin' })
  eventPlaceOrigin: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'port_code' })
  portCode: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'terminal_name' })
  terminalName: string | null;

  // 运输信息
  @Column({ type: 'varchar', length: 20, nullable: true, name: 'transport_mode' })
  transportMode: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'vessel_name' })
  vesselName: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'voyage_number' })
  voyageNumber: string | null;

  // 关联
  @Column({ type: 'int', nullable: true, name: 'related_place_index' })
  relatedPlaceIndex: number | null;

  @Column({ type: 'int', nullable: true })
  source: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'firms_code' })
  firmsCode: string | null;

  // 扩展字段
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'bill_no' })
  billNo: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'declaration_no' })
  declarationNo: string | null;

  // 元数据
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'sync_request_id' })
  syncRequestId: string | null;

  @Column({ type: 'varchar', length: 50, default: 'API', name: 'data_source' })
  dataSource: string;

  @Column({ type: 'jsonb' })
  rawJson: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
