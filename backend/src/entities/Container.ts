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
  @PrimaryColumn({ type: 'varchar', length: 50, name: 'container_number' })
  containerNumber!: string;

  @Column({ type: 'varchar', length: 50, name: 'order_number' })
  orderNumber!: string;

  @Column({ type: 'varchar', length: 20, name: 'container_type_code' })
  containerTypeCode!: string;

  @Column({ type: 'text', nullable: true, name: 'cargo_description' })
  cargoDescription!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'gross_weight' })
  grossWeight!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'net_weight' })
  netWeight!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true, name: 'cbm' })
  cbm!: number;

  @Column({ type: 'int', nullable: true, name: 'packages' })
  packages!: number;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'seal_number' })
  sealNumber!: string;

  @Column({ type: 'boolean', default: false, name: 'inspection_required' })
  inspectionRequired!: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_unboxing' })
  isUnboxing!: boolean;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'not_shipped',
    name: 'logistics_status'
  })
  logisticsStatus!: string;

  @Column({ type: 'text', nullable: true, name: 'remarks' })
  remarks!: string;

  // Excel映射字段 - 是否含打托产品
  @Column({ type: 'boolean', default: false, nullable: true, name: 'requires_pallet' })
  requiresPallet?: boolean; // 是否含打托产品

  @Column({ type: 'boolean', default: false, nullable: true, name: 'requires_assembly' })
  requiresAssembly?: boolean; // 是否装配件 - 新增独立字段

  // 飞驼字段 - 集装箱详细信息
  @Column({ type: 'int', nullable: true, name: 'container_size' })
  containerSize?: number; // 箱尺寸

  @Column({ type: 'boolean', default: false, nullable: true, name: 'is_rolled' })
  isRolled?: boolean; // 是否甩柜

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'operator' })
  operator?: string; // 运营方

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'container_holder' })
  containerHolder?: string; // 持箱人

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'tare_weight' })
  tareWeight?: number; // 箱皮重

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'total_weight' })
  totalWeight?: number; // 箱总重

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true, name: 'over_length' })
  overLength?: number; // 超限长度

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true, name: 'over_height' })
  overHeight?: number; // 超高

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'danger_class' })
  dangerClass?: string; // 危险品等级

  // 飞驼字段 - 当前状态描述
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'current_status_desc_cn' })
  currentStatusDescCn?: string; // 当前状态中文描述

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'current_status_desc_en' })
  currentStatusDescEn?: string; // 当前状态英文描述

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // 关联关系
  @ManyToOne(() => ReplenishmentOrder, { nullable: true })
  @JoinColumn({ name: 'order_number', referencedColumnName: 'orderNumber' })
  order?: ReplenishmentOrder;

  @ManyToOne(() => ContainerType, { nullable: false })
  @JoinColumn({ name: 'container_type_code', referencedColumnName: 'typeCode' })
  type!: ContainerType;

  @OneToMany(() => SeaFreight, (seaFreight) => seaFreight.container)
  seaFreight!: SeaFreight[];

  @OneToMany(() => PortOperation, (portOp) => portOp.container)
  portOperations!: PortOperation[];
}
