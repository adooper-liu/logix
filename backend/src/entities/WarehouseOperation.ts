/**
 * 仓库操作实体
 * Warehouse Operation Entity
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
import { Warehouse } from './Warehouse';

@Entity('process_warehouse_operations')
export class WarehouseOperation {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  containerNumber: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  operationType: string; // INBOUND/OUTBOUND/TRANSIT

  // 仓库信息
  @Column({ type: 'varchar', length: 50, nullable: true })
  warehouseId?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  plannedWarehouse?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  actualWarehouse?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  warehouseGroup?: string;

  @Column({ type: 'date', nullable: true })
  warehouseArrivalDate?: Date;

  // 卸柜信息
  @Column({ type: 'varchar', length: 20, nullable: true })
  unloadModeActual?: string;

  @Column({ type: 'date', nullable: true })
  lastUnloadDate?: Date;

  @Column({ type: 'date', nullable: true })
  plannedUnloadDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  unloadDate?: Date;

  // 系统状态
  @Column({ type: 'varchar', length: 20, nullable: true })
  wmsStatus?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  ebsStatus?: string;

  @Column({ type: 'date', nullable: true })
  wmsConfirmDate?: Date;

  // 卸柜操作详情
  @Column({ type: 'varchar', length: 50, nullable: true })
  unloadGate?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  unloadCompany?: string;

  @Column({ type: 'date', nullable: true })
  notificationPickupDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  pickupTime?: Date;

  @Column({ type: 'text', nullable: true })
  warehouseRemarks?: string;

  // 保留原有字段
  @Column({ type: 'timestamp', nullable: true })
  gateInTime?: Date;

  @Column({ type: 'timestamp', nullable: true })
  gateOutTime?: Date;

  @Column({ type: 'date', nullable: true })
  storageStartDate?: Date;

  @Column({ type: 'date', nullable: true })
  storageEndDate?: Date;

  @Column({ type: 'boolean', default: false })
  isUnboxing: boolean;

  @Column({ type: 'timestamp', nullable: true })
  unboxingTime?: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  cargoReceivedBy?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  cargoDeliveredTo?: string;

  @Column({ type: 'text', nullable: true })
  remarks?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 关联关系
  @ManyToOne(() => Container)
  @JoinColumn({ name: 'container_number' })
  container: Container;

  @ManyToOne(() => Warehouse, { nullable: true })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;
}
