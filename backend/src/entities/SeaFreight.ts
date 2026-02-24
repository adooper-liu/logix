/**
 * 海运信息实体
 * Sea Freight Entity
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

@Entity('process_sea_freight')
export class SeaFreight {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  containerNumber: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  billOfLadingNumber: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  bookingNumber: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  shippingCompanyId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  vesselName: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  voyageNumber: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  portOfLoading: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  portOfDischarge: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  freightForwarderId: string;

  @Column({ type: 'date', nullable: true })
  eta: Date;

  @Column({ type: 'date', nullable: true })
  etd: Date;

  @Column({ type: 'date', nullable: true })
  ata: Date;

  @Column({ type: 'date', nullable: true })
  atd: Date;

  @Column({ type: 'date', nullable: true })
  customsClearanceDate: Date;

  // Excel映射字段 - 提单相关
  @Column({ type: 'varchar', length: 20, nullable: true })
  mblScac?: string; // MBL SCAC

  @Column({ type: 'varchar', length: 50, nullable: true })
  mblNumber?: string; // MBL Number

  @Column({ type: 'varchar', length: 20, nullable: true })
  hblScac?: string; // HBL SCAC

  @Column({ type: 'varchar', length: 50, nullable: true })
  hblNumber?: string; // HBL Number

  @Column({ type: 'varchar', length: 50, nullable: true })
  amsNumber?: string; // AMS Number

  // 航线信息
  @Column({ type: 'varchar', length: 50, nullable: true })
  transitPortCode?: string; // 途经港

  @Column({ type: 'varchar', length: 20, nullable: true })
  transportMode?: string; // 运输方式

  // 母船信息
  @Column({ type: 'varchar', length: 100, nullable: true })
  motherVesselName?: string; // 母船船名

  @Column({ type: 'varchar', length: 50, nullable: true })
  motherVoyageNumber?: string; // 母船航次

  // 时间信息
  @Column({ type: 'date', nullable: true })
  shipmentDate?: Date; // 出运日期

  @Column({ type: 'date', nullable: true })
  motherShipmentDate?: Date; // 母船出运日期

  @Column({ type: 'date', nullable: true })
  documentReleaseDate?: Date; // 放单日期

  @Column({ type: 'date', nullable: true })
  portEntryDate?: Date; // 进港日期

  @Column({ type: 'date', nullable: true })
  railYardEntryDate?: Date; // 进火车堆场日期

  @Column({ type: 'date', nullable: true })
  truckYardEntryDate?: Date; // 进卡车堆场日期

  // 飞驼字段 - 船舶详细信息
  @Column({ type: 'varchar', length: 20, nullable: true })
  routeCode?: string; // 航线代码

  @Column({ type: 'varchar', length: 20, nullable: true })
  imoNumber?: string; // IMO号码

  @Column({ type: 'varchar', length: 20, nullable: true })
  mmsiNumber?: string; // MMSI号码

  @Column({ type: 'varchar', length: 50, nullable: true })
  flag?: string; // 船籍

  @Column({ type: 'date', nullable: true })
  etaOrigin?: Date; // 起运港ETA

  @Column({ type: 'date', nullable: true })
  ataOrigin?: Date; // 起运港ATA

  @Column({ type: 'date', nullable: true })
  portOpenDate?: Date; // 开港时间

  @Column({ type: 'date', nullable: true })
  portCloseDate?: Date; // 截港时间

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
