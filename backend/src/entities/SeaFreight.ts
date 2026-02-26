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
  @PrimaryColumn({ type: 'varchar', length: 50, name: 'container_number' })
  containerNumber: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'bill_of_lading_number' })
  billOfLadingNumber: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'booking_number' })
  bookingNumber: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'shipping_company_id' })
  shippingCompanyId: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'vessel_name' })
  vesselName: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'voyage_number' })
  voyageNumber: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'port_of_loading' })
  portOfLoading: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'port_of_discharge' })
  portOfDischarge: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'freight_forwarder_id' })
  freightForwarderId: string;

  @Column({ type: 'date', nullable: true, name: 'eta' })
  eta: Date;

  @Column({ type: 'date', nullable: true, name: 'etd' })
  etd: Date;

  @Column({ type: 'date', nullable: true, name: 'ata' })
  ata: Date;

  @Column({ type: 'date', nullable: true, name: 'atd' })
  atd: Date;

  @Column({ type: 'date', nullable: true, name: 'customs_clearance_date' })
  customsClearanceDate: Date;

  // Excel映射字段 - 提单相关
  @Column({ type: 'varchar', length: 20, nullable: true, name: 'mbl_scac' })
  mblScac?: string; // MBL SCAC

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'mbl_number' })
  mblNumber?: string; // MBL Number

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'hbl_scac' })
  hblScac?: string; // HBL SCAC

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'hbl_number' })
  hblNumber?: string; // HBL Number

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'ams_number' })
  amsNumber?: string; // AMS Number

  // 航线信息
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'transit_port_code' })
  transitPortCode?: string; // 途经港

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'transport_mode' })
  transportMode?: string; // 运输方式

  // 母船信息
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'mother_vessel_name' })
  motherVesselName?: string; // 母船船名

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'mother_voyage_number' })
  motherVoyageNumber?: string; // 母船航次

  // 时间信息
  @Column({ type: 'date', nullable: true, name: 'shipment_date' })
  shipmentDate?: Date; // 出运日期

  @Column({ type: 'date', nullable: true, name: 'mother_shipment_date' })
  motherShipmentDate?: Date; // 母船出运日期

  @Column({ type: 'date', nullable: true, name: 'document_release_date' })
  documentReleaseDate?: Date; // 放单日期

  @Column({ type: 'date', nullable: true, name: 'port_entry_date' })
  portEntryDate?: Date; // 进港日期

  @Column({ type: 'date', nullable: true, name: 'rail_yard_entry_date' })
  railYardEntryDate?: Date; // 进火车堆场日期

  @Column({ type: 'date', nullable: true, name: 'truck_yard_entry_date' })
  truckYardEntryDate?: Date; // 进卡车堆场日期

  // 费用信息 - Excel映射字段
  @Column({ type: 'varchar', length: 10, nullable: true, name: 'freight_currency' })
  freightCurrency?: string; // 海运费币种 (USD/CNY/EUR等)

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'standard_freight_amount' })
  standardFreightAmount?: number; // 标准海运费金额

  // 飞驼字段 - 船舶详细信息
  @Column({ type: 'varchar', length: 20, nullable: true, name: 'route_code' })
  routeCode?: string; // 航线代码

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'imo_number' })
  imoNumber?: string; // IMO号码

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'mmsi_number' })
  mmsiNumber?: string; // MMSI号码

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'flag' })
  flag?: string; // 船籍

  @Column({ type: 'date', nullable: true, name: 'eta_origin' })
  etaOrigin?: Date; // 起运港ETA

  @Column({ type: 'date', nullable: true, name: 'ata_origin' })
  ataOrigin?: Date; // 起运港ATA

  @Column({ type: 'date', nullable: true, name: 'port_open_date' })
  portOpenDate?: Date; // 开港时间

  @Column({ type: 'date', nullable: true, name: 'port_close_date' })
  portCloseDate?: Date; // 截港时间

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
