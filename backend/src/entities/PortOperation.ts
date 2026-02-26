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
  @PrimaryColumn({ type: 'varchar', length: 50, name: 'id' })
  id: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'container_number' })
  containerNumber: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'port_type' })
  portType: string; // origin/transit/destination

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'port_code' })
  portCode: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'port_name' })
  portName: string;

  @Column({ type: 'int', nullable: true, name: 'port_sequence' })
  portSequence: number;

  @Column({ type: 'timestamp', nullable: true, name: 'eta_dest_port' })
  etaDestPort: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'ata_dest_port' })
  ataDestPort: Date;

  @Column({ type: 'date', nullable: true, name: 'etd_transit' })
  etdTransit: Date;

  @Column({ type: 'date', nullable: true, name: 'atd_transit' })
  atdTransit: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'gate_in_time' })
  gateInTime: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'gate_out_time' })
  gateOutTime: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'discharged_time' })
  dischargedTime: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'available_time' })
  availableTime: Date;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'customs_status' })
  customsStatus: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'isf_status' })
  isfStatus: string;

  @Column({ type: 'date', nullable: true, name: 'last_free_date' })
  lastFreeDate: Date;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'gate_in_terminal' })
  gateInTerminal: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'gate_out_terminal' })
  gateOutTerminal: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'berth_position' })
  berthPosition: string;

  // Excel映射字段 - 缺失字段
  @Column({ type: 'timestamp', nullable: true, name: 'eta_correction' })
  etaCorrection?: Date; // ETA修正

  @Column({ type: 'timestamp', nullable: true, name: 'dest_port_unload_date' })
  destPortUnloadDate?: Date; // 目的港卸船/火车日期

  @Column({ type: 'timestamp', nullable: true, name: 'transit_arrival_date' })
  transitArrivalDate?: Date; // 途经港到达日期

  @Column({ type: 'timestamp', nullable: true, name: 'planned_customs_date' })
  plannedCustomsDate?: Date; // 计划清关日期

  @Column({ type: 'date', nullable: true, name: 'actual_customs_date' })
  actualCustomsDate?: Date; // 实际清关日期

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'customs_broker_code' })
  customsBrokerCode?: string; // 目的港清关公司

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'document_status' })
  documentStatus?: string; // 清关单据状态

  @Column({ type: 'date', nullable: true, name: 'all_generated_date' })
  allGeneratedDate?: Date; // 全部生成日期

  @Column({ type: 'text', nullable: true, name: 'customs_remarks' })
  customsRemarks?: string; // 异常原因

  @Column({ type: 'timestamp', nullable: true, name: 'isf_declaration_date' })
  isfDeclarationDate?: Date; // ISF申报日期

  @Column({ type: 'timestamp', nullable: true, name: 'document_transfer_date' })
  documentTransferDate?: Date; // 传递日期

  // 免费期信息 - Excel映射字段
  @Column({ type: 'int', nullable: true, name: 'free_storage_days' })
  freeStorageDays?: number; // 免堆期(天) - 货物在码头免费存放天数

  @Column({ type: 'int', nullable: true, name: 'free_detention_days' })
  freeDetentionDays?: number; // 场内免箱期(天) - 集装箱在码头免费使用天数

  @Column({ type: 'int', nullable: true, name: 'free_off_terminal_days' })
  freeOffTerminalDays?: number; // 场外免箱期(天) - 集装箱离开码头后免费使用天数

  // 飞驼字段 - 状态节点详细信息
  @Column({ type: 'varchar', length: 20, nullable: true, name: 'status_code' })
  statusCode?: string; // 状态代码 (如 DLPT)

  @Column({ type: 'timestamp', nullable: true, name: 'status_occurred_at' })
  statusOccurredAt?: Date; // 状态发生时间

  @Column({ type: 'boolean', nullable: true, name: 'has_occurred' })
  hasOccurred?: boolean; // 是否已发生

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'location_name_en' })
  locationNameEn?: string; // 地点英文名

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'location_name_cn' })
  locationNameCn?: string; // 地点中文名

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'location_type' })
  locationType?: string; // 地点类型 (ETA/ETD/ATD/ATA等)

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true, name: 'latitude' })
  latitude?: number; // 纬度

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true, name: 'longitude' })
  longitude?: number; // 经度

  @Column({ type: 'int', nullable: true, name: 'timezone' })
  timezone?: number; // 时区

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'data_source' })
  dataSource?: string; // 数据来源 (AIS/船公司/码头)

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'cargo_location' })
  cargoLocation?: string; // 货物存储位置

  @Column({ type: 'text', nullable: true, name: 'remarks' })
  remarks: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 关联关系
  @ManyToOne(() => Container)
  @JoinColumn({
    name: 'container_number',
    referencedColumnName: 'containerNumber'
  })
  container: Container;
}
