/**
 * 备货单实体
 * Replenishment Order Entity
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany
} from 'typeorm';
import { Container } from './Container';
import { Customer } from './Customer';

@Entity('biz_replenishment_orders')
export class ReplenishmentOrder {
  @PrimaryColumn({ type: 'varchar', length: 50, name: 'order_number' })
  orderNumber!: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'main_order_number' })
  mainOrderNumber!: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'sell_to_country' })
  sellToCountry!: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'customer_code' })
  customerCode!: string; // 客户编码

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'customer_name' })
  customerName!: string; // 客户名称（冗余字段，便于查询）

  @Column({
    type: 'varchar',
    length: 20,
    default: 'DRAFT',
    name: 'order_status'
  })
  orderStatus!: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'procurement_trade_mode' })
  procurementTradeMode!: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'price_terms' })
  priceTerms!: string;

  @Column({ type: 'int', default: 0, name: 'total_boxes' })
  totalBoxes!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'total_cbm' })
  totalCbm!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'total_gross_weight' })
  totalGrossWeight!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true, name: 'shipment_total_value' })
  shipmentTotalValue!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true, name: 'fob_amount' })
  fobAmount!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true, name: 'cif_amount' })
  cifAmount!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true, name: 'negotiation_amount' })
  negotiationAmount!: number;

  @Column({ type: 'date', nullable: true, name: 'order_date' })
  orderDate!: Date;

  @Column({ type: 'date', nullable: true, name: 'expected_ship_date' })
  expectedShipDate!: Date;

  @Column({ type: 'date', nullable: true, name: 'actual_ship_date' })
  actualShipDate!: Date;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'created_by' })
  createdBy!: string;

  // Excel映射字段 - 缺失字段
  @Column({ type: 'boolean', default: false, nullable: true, name: 'container_required' })
  containerRequired?: boolean; // 是否需要装柜

  @Column({ type: 'boolean', default: false, nullable: true, name: 'inspection_required' })
  inspectionRequired?: boolean; // 是否查验

  @Column({ type: 'boolean', default: false, nullable: true, name: 'is_assembly' })
  isAssembly?: boolean; // 是否装配件

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true, name: 'special_cargo_volume' })
  specialCargoVolume?: number; // 特殊货物体积

  // Wayfair SPO
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'wayfair_spo' })
  wayfairSpo?: string;

  @Column({ type: 'boolean', default: false, nullable: true, name: 'pallet_required' })
  palletRequired?: boolean; // 含要求打托产品

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // 关联关系
  @ManyToOne(() => ReplenishmentOrder, { nullable: true })
  @JoinColumn({ name: 'main_order_number', referencedColumnName: 'orderNumber' })
  mainOrder!: ReplenishmentOrder;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customer_code', referencedColumnName: 'customerCode' })
  customer!: Customer;

  @OneToMany(() => Container, (container) => container.order)
  containers!: Container[];
}
