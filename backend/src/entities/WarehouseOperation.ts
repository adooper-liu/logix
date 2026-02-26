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
  @PrimaryColumn({ type: 'varchar', length: 50, name: 'container_number' })
  containerNumber: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'operation_type' })
  operationType: string; // INBOUND/OUTBOUND/TRANSIT

  // 仓库信息
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'warehouse_id' })
  warehouseId?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'planned_warehouse' })
  plannedWarehouse?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'actual_warehouse' })
  actualWarehouse?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'warehouse_group' })
  warehouseGroup?: string;

  @Column({ type: 'timestamp', nullable: true, name: 'warehouse_arrival_date' })
  warehouseArrivalDate?: Date;

  // 卸柜信息
  @Column({ type: 'varchar', length: 20, nullable: true, name: 'unload_mode_actual' })
  unloadModeActual?: string;

  @Column({ type: 'date', nullable: true, name: 'last_unload_date' })
  lastUnloadDate?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'planned_unload_date' })
  plannedUnloadDate?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'unload_date' })
  unloadDate?: Date;

  // 系统状态
  @Column({ type: 'varchar', length: 20, nullable: true, name: 'wms_status' })
  wmsStatus?: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'ebs_status' })
  ebsStatus?: string;

  @Column({ type: 'timestamp', nullable: true, name: 'wms_confirm_date' })
  wmsConfirmDate?: Date;

  // 卸柜操作详情
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'unload_gate' })
  unloadGate?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'unload_company' })
  unloadCompany?: string;

  @Column({ type: 'date', nullable: true, name: 'notification_pickup_date' })
  notificationPickupDate?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'pickup_time' })
  pickupTime?: Date;

  @Column({ type: 'text', nullable: true, name: 'warehouse_remarks' })
  warehouseRemarks?: string;

  // 保留原有字段
  @Column({ type: 'timestamp', nullable: true, name: 'gate_in_time' })
  gateInTime?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'gate_out_time' })
  gateOutTime?: Date;

  @Column({ type: 'date', nullable: true, name: 'storage_start_date' })
  storageStartDate?: Date;

  @Column({ type: 'date', nullable: true, name: 'storage_end_date' })
  storageEndDate?: Date;

  @Column({ type: 'boolean', default: false, name: 'is_unboxing' })
  isUnboxing: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'unboxing_time' })
  unboxingTime?: Date;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'cargo_received_by' })
  cargoReceivedBy?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'cargo_delivered_to' })
  cargoDeliveredTo?: string;

  @Column({ type: 'text', nullable: true, name: 'remarks' })
  remarks?: string;

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

  @ManyToOne(() => Warehouse, { nullable: true })
  @JoinColumn({ name: 'warehouse_id', referencedColumnName: 'warehouseCode' })
  warehouse: Warehouse;
}
