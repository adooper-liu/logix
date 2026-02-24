/**
 * 集装箱装载记录实体
 * Container Loading Record Entity
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

@Entity('container_loading_records')
export class ContainerLoadingRecord {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 50 })
  containerNumber: string;

  @Column({ type: 'int' })
  routePath: number; // 路径序号

  // 船舶信息
  @Column({ type: 'varchar', length: 200, nullable: true })
  vesselName?: string; // 船名

  @Column({ type: 'varchar', length: 50, nullable: true })
  voyageNumber?: string; // 航次号

  // 提单和订舱信息
  @Column({ type: 'varchar', length: 100, nullable: true })
  billOfLadingNumber?: string; // 提单号

  @Column({ type: 'varchar', length: 100, nullable: true })
  bookingNumber?: string; // 订舱号

  // 起始地信息 (与接口保持一致的命名)
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'origin_port_code' })
  originPortCode?: string; // CNZPU

  @Column({ type: 'varchar', length: 100, nullable: true })
  originNameStandard?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  originNameOriginal?: string;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  originLatitude?: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  originLongitude?: number;

  @Column({ type: 'int', nullable: true })
  originTimezone?: number;

  // 目的地信息 (与接口保持一致的命名)
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'dest_port_code' })
  destPortCode?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  destinationNameStandard?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  destinationNameOriginal?: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  destinationCargoLocation?: string;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  destinationLatitude?: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  destinationLongitude?: number;

  @Column({ type: 'int', nullable: true })
  destinationTimezone?: number;

  // 时间节点 (与接口保持一致)
  @Column({ type: 'timestamp', nullable: true, name: 'eta_origin' })
  etaOrigin?: Date; // 起运港预计到港时间

  @Column({ type: 'timestamp', nullable: true, name: 'ata_origin' })
  ataOrigin?: Date; // 起运港实际到港时间

  @Column({ type: 'timestamp', nullable: true, name: 'eta_dest' })
  etaDest?: Date; // 目的港预计到港时间

  @Column({ type: 'timestamp', nullable: true, name: 'ata_dest' })
  ataDest?: Date; // 目的港实际到港时间

  @Column({ type: 'timestamp', nullable: true, name: 'loading_date' })
  loadingDate?: Date; // 装船日期

  @Column({ type: 'timestamp', nullable: true, name: 'discharge_date' })
  dischargeDate?: Date; // 卸船日期

  // 运输信息
  @Column({ type: 'varchar', length: 20, nullable: true })
  transportMode?: string; // TRUCK/TRAIN/VESSEL

  @Column({ type: 'text', nullable: true })
  transportInfo?: string;

  // 航线信息
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'route_code' })
  routeCode?: string; // 航线编码

  // 船公司信息
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'carrier_code' })
  carrierCode?: string; // 船公司编码

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'carrier_name' })
  carrierName?: string; // 船公司名称

  @Column({ type: 'varchar', length: 200, nullable: true })
  operator?: string; // 操作人

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 关联关系
  @ManyToOne(() => Container)
  @JoinColumn({ name: 'container_number' })
  container: Container;
}
