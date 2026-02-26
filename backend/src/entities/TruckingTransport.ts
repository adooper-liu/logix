/**
 * 拖卡运输实体
 * Trucking Transport Entity
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

@Entity('process_trucking_transport')
export class TruckingTransport {
  @PrimaryColumn({ type: 'varchar', length: 50, name: 'container_number' })
  containerNumber: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'trucking_type' })
  truckingType: string; // PRE_SHIPMENT/POST_SHIPMENT

  @Column({ type: 'boolean', default: false, nullable: true, name: 'is_pre_pickup' })
  isPrePickup?: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'trucking_company_id' })
  truckingCompanyId?: string;

  @Column({ type: 'text', nullable: true, name: 'pickup_notification' })
  pickupNotification?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'carrier_company' })
  carrierCompany?: string;

  @Column({ type: 'date', nullable: true, name: 'last_pickup_date' })
  lastPickupDate?: Date;

  @Column({ type: 'date', nullable: true, name: 'planned_pickup_date' })
  plannedPickupDate?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'pickup_date' })
  pickupDate?: Date;

  @Column({ type: 'date', nullable: true, name: 'last_delivery_date' })
  lastDeliveryDate?: Date;

  @Column({ type: 'date', nullable: true, name: 'planned_delivery_date' })
  plannedDeliveryDate?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'delivery_date' })
  deliveryDate?: Date;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'unload_mode_plan' })
  unloadModePlan?: string; // Drop off / Live load

  // 司机信息
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'driver_name' })
  driverName?: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'driver_phone' })
  driverPhone?: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'truck_plate' })
  truckPlate?: string;

  // 地点信息
  @Column({ type: 'varchar', length: 200, nullable: true, name: 'pickup_location' })
  pickupLocation?: string;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'delivery_location' })
  deliveryLocation?: string;

  // 费用信息
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true, name: 'distance_km' })
  distanceKm?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'cost' })
  cost?: number;

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
}
