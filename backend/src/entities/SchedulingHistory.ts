/**
 * 排产历史记录实体
 * Scheduling History Record Entity
 * 
 * 用于记录每次排产确认的完整历史
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique
} from 'typeorm';

@Entity('hist_scheduling_records')
@Unique(['containerNumber', 'schedulingVersion'])
export class SchedulingHistory {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @Column({ type: 'varchar', length: 50, name: 'container_number' })
  containerNumber: string;

  @Column({ type: 'int', name: 'scheduling_version', default: 1 })
  schedulingVersion: number;

  @Column({ type: 'varchar', length: 20, name: 'scheduling_mode' })
  schedulingMode: 'MANUAL' | 'AUTO' | 'BATCH';

  @Column({ type: 'varchar', length: 20 })
  strategy: 'Direct' | 'Drop off' | 'Expedited';

  @Column({ type: 'date', nullable: true, name: 'planned_customs_date' })
  plannedCustomsDate?: Date;

  @Column({ type: 'date', nullable: true, name: 'planned_pickup_date' })
  plannedPickupDate?: Date;

  @Column({ type: 'date', nullable: true, name: 'planned_delivery_date' })
  plannedDeliveryDate?: Date;

  @Column({ type: 'date', nullable: true, name: 'planned_unload_date' })
  plannedUnloadDate?: Date;

  @Column({ type: 'date', nullable: true, name: 'planned_return_date' })
  plannedReturnDate?: Date;

  @Column({ type: 'date', nullable: true, name: 'actual_pickup_date' })
  actualPickupDate?: Date;

  @Column({ type: 'date', nullable: true, name: 'actual_delivery_date' })
  actualDeliveryDate?: Date;

  @Column({ type: 'date', nullable: true, name: 'actual_unload_date' })
  actualUnloadDate?: Date;

  @Column({ type: 'date', nullable: true, name: 'actual_return_date' })
  actualReturnDate?: Date;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'warehouse_code' })
  warehouseCode?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'warehouse_name' })
  warehouseName?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'trucking_company_code' })
  truckingCompanyCode?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'trucking_company_name' })
  truckingCompanyName?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'total_cost' })
  totalCost?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'demurrage_cost' })
  demurrageCost?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'detention_cost' })
  detentionCost?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'storage_cost' })
  storageCost?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'yard_storage_cost' })
  yardStorageCost?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'transportation_cost' })
  transportationCost?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'handling_cost' })
  handlingCost?: number;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({ type: 'date', nullable: true, name: 'last_free_date' })
  lastFreeDate?: Date;

  @Column({ type: 'date', nullable: true, name: 'last_return_date' })
  lastReturnDate?: Date;

  @Column({ type: 'int', nullable: true, name: 'remaining_free_days' })
  remainingFreeDays?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'warehouse_occupancy_rate' })
  warehouseOccupancyRate?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'trucking_occupancy_rate' })
  truckingOccupancyRate?: number;

  @Column({ type: 'jsonb', nullable: true, name: 'alternative_solutions' })
  alternativeSolutions?: any;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'operated_by' })
  operatedBy?: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'operated_at' })
  operatedAt: Date;

  @Column({ type: 'varchar', length: 20, default: 'CREATE', name: 'operation_type' })
  operationType: 'CREATE' | 'UPDATE' | 'CANCEL';

  @Column({ type: 'varchar', length: 20, default: 'CONFIRMED', name: 'scheduling_status' })
  schedulingStatus: 'CONFIRMED' | 'CANCELLED' | 'SUPERSEDED';

  @Column({ type: 'text', nullable: true })
  remarks?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
