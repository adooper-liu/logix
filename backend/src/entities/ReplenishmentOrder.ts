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
  @PrimaryColumn({ type: 'varchar', length: 50 })
  orderNumber!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  mainOrderNumber!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  sellToCountry!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  customerCode!: string; // 客户编码

  @Column({ type: 'varchar', length: 100, nullable: true })
  customerName!: string; // 客户名称（冗余字段，便于查询）

  @Column({
    type: 'varchar',
    length: 20,
    default: 'DRAFT'
  })
  orderStatus!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  procurementTradeMode!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  priceTerms!: string;

  @Column({ type: 'int', default: 0 })
  totalBoxes!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalCbm!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalGrossWeight!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  shipmentTotalValue!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  fobAmount!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  cifAmount!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  negotiationAmount!: number;

  @Column({ type: 'date', nullable: true })
  orderDate!: Date;

  @Column({ type: 'date', nullable: true })
  expectedShipDate!: Date;

  @Column({ type: 'date', nullable: true })
  actualShipDate!: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  createdBy!: string;

  // Excel映射字段 - 缺失字段
  @Column({ type: 'boolean', default: false, nullable: true })
  containerRequired?: boolean; // 是否需要装柜

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  specialCargoVolume?: number; // 特殊货物体积

  // Wayfair SPO
  @Column({ type: 'varchar', length: 50, nullable: true })
  wayfairSpo?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // 关联关系
  @ManyToOne(() => ReplenishmentOrder, { nullable: true })
  @JoinColumn({ name: 'main_order_number' })
  mainOrder!: ReplenishmentOrder;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customer_code' })
  customer!: Customer;

  @OneToMany(() => Container, (container) => container.order)
  containers!: Container[];
}
