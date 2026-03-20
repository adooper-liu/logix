/**
 * 飞驼船舶原始数据实体
 * 存储飞驼API/Excel 船舶信息数据
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('ext_feituo_vessels')
@Index('idx_feituo_vessels_bol', ['billOfLadingNumber'])
@Index('idx_feituo_vessels_name', ['vesselName'])
@Index('idx_feituo_vessels_created', ['createdAt'])
export class ExtFeituoVessel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, name: 'bill_of_lading_number' })
  billOfLadingNumber: string;

  @Column({ type: 'varchar', length: 100, name: 'vessel_name' })
  vesselName: string;

  // 船舶基本信息
  @Column({ type: 'varchar', length: 20, nullable: true, name: 'imo_number' })
  imoNumber: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'mmsi_number' })
  mmsiNumber: string | null;

  @Column({ type: 'date', nullable: true, name: 'build_date' })
  buildDate: Date | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  flag: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'container_size' })
  containerSize: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  operator: string | null;

  // 扩展信息
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'vessel_name_en' })
  vesselNameEn: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'vessel_name_cn' })
  vesselNameCn: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'call_sign' })
  callSign: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'vessel_type' })
  vesselType: string | null;

  // 元数据
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'sync_request_id' })
  syncRequestId: string | null;

  @Column({ type: 'varchar', length: 50, default: 'Excel', name: 'data_source' })
  dataSource: string;

  @Column({ type: 'jsonb' })
  rawJson: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
