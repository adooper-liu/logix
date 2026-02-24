/**
 * 港口操作实体
 * Port Operation Entity
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { Container } from './Container';

@Entity('process_port_operations')
export class PortOperation {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  containerNumber: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  portType: string; // origin/transit/destination

  @Column({ type: 'varchar', length: 50, nullable: true })
  portCode: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  portName: string;

  @Column({ type: 'int', nullable: true })
  portSequence: number;

  @Column({ type: 'date', nullable: true })
  etaDestPort: Date;

  @Column({ type: 'date', nullable: true })
  ataDestPort: Date;

  @Column({ type: 'date', nullable: true })
  etdTransit: Date;

  @Column({ type: 'date', nullable: true })
  atdTransit: Date;

  @Column({ type: 'timestamp', nullable: true })
  gateInTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  gateOutTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  dischargedTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  availableTime: Date;

  @Column({ type: 'varchar', length: 20, nullable: true })
  customsStatus: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  isfStatus: string;

  @Column({ type: 'date', nullable: true })
  lastFreeDate: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  gateInTerminal: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  gateOutTerminal: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  berthPosition: string;

  // Excel映射字段 - 缺失字段
  @Column({ type: 'timestamp', nullable: true })
  etaCorrection?: Date; // ETA修正

  @Column({ type: 'date', nullable: true })
  destPortUnloadDate?: Date; // 目的港卸船/火车日期

  @Column({ type: 'date', nullable: true })
  plannedCustomsDate?: Date; // 计划清关日期

  @Column({ type: 'date', nullable: true })
  actualCustomsDate?: Date; // 实际清关日期

  @Column({ type: 'varchar', length: 50, nullable: true })
  customsBrokerCode?: string; // 目的港清关公司

  @Column({ type: 'varchar', length: 20, nullable: true })
  documentStatus?: string; // 清关单据状态

  @Column({ type: 'date', nullable: true })
  allGeneratedDate?: Date; // 全部生成日期

  @Column({ type: 'text', nullable: true })
  customsRemarks?: string; // 异常原因

  @Column({ type: 'date', nullable: true })
  isfDeclarationDate?: Date; // ISF申报日期

  @Column({ type: 'date', nullable: true })
  documentTransferDate?: Date; // 传递日期

  // 飞驼字段 - 状态节点详细信息
  @Column({ type: 'varchar', length: 20, nullable: true })
  statusCode?: string; // 状态代码 (如 DLPT)

  @Column({ type: 'timestamp', nullable: true })
  statusOccurredAt?: Date; // 状态发生时间

  @Column({ type: 'boolean', nullable: true })
  hasOccurred?: boolean; // 是否已发生

  @Column({ type: 'varchar', length: 100, nullable: true })
  locationNameEn?: string; // 地点英文名

  @Column({ type: 'varchar', length: 100, nullable: true })
  locationNameCn?: string; // 地点中文名

  @Column({ type: 'varchar', length: 20, nullable: true })
  locationType?: string; // 地点类型 (ETA/ETD/ATD/ATA等)

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitude?: number; // 纬度

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  longitude?: number; // 经度

  @Column({ type: 'int', nullable: true })
  timezone?: number; // 时区

  @Column({ type: 'varchar', length: 50, nullable: true })
  dataSource?: string; // 数据来源 (AIS/船公司/码头)

  @Column({ type: 'varchar', length: 200, nullable: true })
  cargoLocation?: string; // 货物存储位置

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 关联关系
  @ManyToOne(() => Container)
  @JoinColumn({ name: 'container_number' })
  container: Container;
}
