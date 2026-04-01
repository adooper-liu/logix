/**
 * 货柜SKU明细实体
 * Container SKU Entity
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { Container } from './Container';
import { ReplenishmentOrder } from './ReplenishmentOrder';

@Entity('biz_container_skus')
export class ContainerSku {
  @PrimaryGeneratedColumn('increment', { type: 'int', name: 'id' })
  id!: number;

  @Column({ type: 'varchar', length: 50, name: 'container_number' })
  containerNumber!: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'order_number' })
  orderNumber: string;

  @Column({ type: 'varchar', length: 50, name: 'sku_code' })
  skuCode!: string;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'sku_name' })
  skuName: string;

  // 数量信息
  @Column({ type: 'int', name: 'quantity' })
  quantity!: number; // SKU总数量

  @Column({ type: 'int', nullable: true, name: 'quantity_per_box' })
  quantityPerBox: number; // 每箱数量

  @Column({ type: 'int', nullable: true, name: 'total_boxes' })
  totalBoxes: number; // 总箱数

  // 价格信息
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'unit_price' })
  unitPrice: number; // 单价

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'total_value' })
  totalValue: number; // 总价值

  // 重量信息
  @Column({
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
    name: 'gross_weight_per_unit'
  })
  grossWeightPerUnit: number; // 每单位毛重

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'total_gross_weight' })
  totalGrossWeight: number; // 总毛重

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true, name: 'net_weight_per_unit' })
  netWeightPerUnit: number; // 每单位净重

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'total_net_weight' })
  totalNetWeight: number; // 总净重

  // 体积信息
  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true, name: 'cbm_per_unit' })
  cbmPerUnit: number; // 每单位CBM

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true, name: 'total_cbm' })
  totalCbm: number; // 总CBM

  // 其他信息
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'barcode' })
  barcode: string; // 条形码

  @Column({ type: 'text', nullable: true, name: 'remarks' })
  remarks: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // 关联关系 - 一个SKU明细属于一个货柜
  @ManyToOne(() => Container, { nullable: false })
  @JoinColumn({ name: 'container_number', referencedColumnName: 'containerNumber' })
  container!: Container;

  // 关联关系 - 一个SKU明细关联一个备货单
  @ManyToOne(() => ReplenishmentOrder, { nullable: true })
  @JoinColumn({ name: 'order_number', referencedColumnName: 'orderNumber' })
  order!: ReplenishmentOrder;
}
