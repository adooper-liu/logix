/**
 * 货柜实体
 * Container Entity
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
import { ReplenishmentOrder } from './ReplenishmentOrder';
import { ContainerType } from './ContainerType';
import { SeaFreight } from './SeaFreight';
import { PortOperation } from './PortOperation';

@Entity('biz_containers')
export class Container {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  containerNumber!: string;

  @Column({ type: 'varchar', length: 50 })
  orderNumber!: string;

  @Column({ type: 'varchar', length: 10 })
  containerTypeCode!: string;

  @Column({ type: 'text', nullable: true })
  cargoDescription!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  grossWeight!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  netWeight!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  cbm!: number;

  @Column({ type: 'int', nullable: true })
  packages!: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  sealNumber!: string;

  @Column({ type: 'boolean', default: false })
  inspectionRequired!: boolean;

  @Column({ type: 'boolean', default: false })
  isUnboxing!: boolean;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'not_shipped'
  })
  logisticsStatus!: string;

  @Column({ type: 'text', nullable: true })
  remarks!: string;

  // Excel映射字段 - 是否含打托产品
  @Column({ type: 'boolean', default: false, nullable: true })
  requiresPallet?: boolean;

  // 飞驼字段 - 集装箱详细信息
  @Column({ type: 'int', nullable: true })
  containerSize?: number; // 箱尺寸

  @Column({ type: 'boolean', default: false, nullable: true })
  isRolled?: boolean; // 是否甩柜

  @Column({ type: 'varchar', length: 50, nullable: true })
  operator?: string; // 运营方

  @Column({ type: 'varchar', length: 50, nullable: true })
  containerHolder?: string; // 持箱人

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  tareWeight?: number; // 箱皮重

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalWeight?: number; // 箱总重

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  overLength?: number; // 超限长度

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  overHeight?: number; // 超高

  @Column({ type: 'varchar', length: 20, nullable: true })
  dangerClass?: string; // 危险品等级

  // 飞驼字段 - 当前状态描述
  @Column({ type: 'varchar', length: 100, nullable: true })
  currentStatusDescCn?: string; // 当前状态中文描述

  @Column({ type: 'varchar', length: 100, nullable: true })
  currentStatusDescEn?: string; // 当前状态英文描述

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // 关联关系
  @ManyToOne(() => ReplenishmentOrder, { nullable: true })
  @JoinColumn({ name: 'order_number' })
  order!: ReplenishmentOrder;

  // 外键列（用于直接设置外键值）
  @Column({ type: 'varchar', length: 50, name: 'order_number', nullable: true })
  order_number?: string;

  @ManyToOne(() => ContainerType, { nullable: false })
  @JoinColumn({ name: 'container_type_code' })
  type!: ContainerType;

  // 外键列（用于直接设置外键值）
  @Column({ type: 'varchar', length: 50, name: 'container_type_code', nullable: true })
  container_type_code?: string;

  @OneToMany(() => SeaFreight, (seaFreight) => seaFreight.container)
  seaFreight!: SeaFreight[];

  @OneToMany(() => PortOperation, (portOp) => portOp.container)
  portOperations!: PortOperation[];
}
