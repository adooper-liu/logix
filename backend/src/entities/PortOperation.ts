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

  // 目的港 ETA/ATA（统一命名）
  @Column({ type: 'timestamptz', nullable: true, name: 'eta' })
  eta: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'ata' })
  ata: Date;

  // 修正 ETA（滞港费用，优先级高于 eta）
  @Column({ type: 'timestamptz', nullable: true, name: 'revised_eta' })
  revisedEta: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'eta_correction' })
  etaCorrection: Date;

  // 卸船时间
  @Column({ type: 'timestamptz', nullable: true, name: 'discharged_time' })
  dischargedTime: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'dest_port_unload_date' })
  destPortUnloadDate: Date;

  // 中转港 ETD/ATD（统一命名）
  @Column({ type: 'timestamptz', nullable: true, name: 'etd' })
  etd: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'atd' })
  atd: Date;

  // 中转港到港时间
  @Column({ type: 'timestamptz', nullable: true, name: 'transit_arrival_date' })
  transitArrivalDate: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'gate_in_time' })
  gateInTime: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'gate_out_time' })
  gateOutTime: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'available_time' })
  availableTime: Date;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'customs_status' })
  customsStatus: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'isf_status' })
  isfStatus: string;

  @Column({ type: 'date', nullable: true, name: 'last_free_date' })
  lastFreeDate: Date;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'last_free_date_mode' })
  lastFreeDateMode?: 'actual' | 'forecast';

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'last_free_date_source' })
  lastFreeDateSource?: 'computed' | 'manual';

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'gate_in_terminal' })
  gateInTerminal: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'gate_out_terminal' })
  gateOutTerminal: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'berth_position' })
  berthPosition: string;

  @Column({ type: 'timestamptz', nullable: true, name: 'planned_customs_date' })
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

  // 飞驼新增字段 - 中国港区/海关时间节点
  @Column({ type: 'timestamp', nullable: true, name: 'manifest_release_date' })
  manifestReleaseDate?: Date; // 原始舱单放行日期

  @Column({ type: 'timestamp', nullable: true, name: 'document_cutoff_date' })
  documentCutoffDate?: Date; // 截单时间

  @Column({ type: 'timestamp', nullable: true, name: 'customs_cutoff_date' })
  customsCutoffDate?: Date; // 截关时间

  // 滞留/放行日期 - 飞驼状态码映射
  @Column({ type: 'timestamp', nullable: true, name: 'customs_hold_date' })
  customsHoldDate?: Date; // 海关滞留日期 (CUIP)

  @Column({ type: 'timestamp', nullable: true, name: 'carrier_hold_date' })
  carrierHoldDate?: Date; // 船公司滞留日期 (SRHD)

  @Column({ type: 'timestamp', nullable: true, name: 'terminal_hold_date' })
  terminalHoldDate?: Date; // 码头滞留日期 (TMHD)

  @Column({ type: 'timestamp', nullable: true, name: 'customs_release_date' })
  customsReleaseDate?: Date; // 海关放行日期 (PASS)

  @Column({ type: 'timestamp', nullable: true, name: 'terminal_release_date' })
  terminalReleaseDate?: Date; // 码头放行日期 (TMPS)

  @Column({ type: 'date', nullable: true, name: 'port_open_date' })
  portOpenDate?: Date; // 开港日期（中国港区）

  @Column({ type: 'date', nullable: true, name: 'port_close_date' })
  portCloseDate?: Date; // 截港日期（中国港区）

  // ==================== 火车/海铁联运专用字段 ====================
  @Column({ type: 'timestamp', nullable: true, name: 'train_arrival_date' })
  trainArrivalDate?: Date; // 火车到站日期（海铁联运）

  @Column({ type: 'timestamp', nullable: true, name: 'train_discharge_date' })
  trainDischargeDate?: Date; // 火车卸箱日期（海铁联运）

  @Column({ type: 'timestamp', nullable: true, name: 'train_departure_time' })
  trainDepartureTime?: Date; // 火车出发时间（海铁联运）

  @Column({ type: 'timestamp', nullable: true, name: 'rail_last_free_date' })
  railLastFreeDate?: Date; // 铁路最后免费日（LFD）

  @Column({ type: 'boolean', nullable: true, name: 'last_free_date_invalid' })
  lastFreeDateInvalid?: boolean; // LFD是否无效

  @Column({ type: 'text', nullable: true, name: 'last_free_date_remark' })
  lastFreeDateRemark?: string; // LFD备注

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
  @JoinColumn({ name: 'container_number', referencedColumnName: 'containerNumber' })
  container: Container;
}
