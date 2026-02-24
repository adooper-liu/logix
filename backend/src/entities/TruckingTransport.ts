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

@Entity('process_trucking')
export class TruckingTransport {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  containerNumber: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  truckingType: string; // PRE_SHIPMENT/POST_SHIPMENT

  @Column({ type: 'boolean', default: false, nullable: true })
  isPrePickup?: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  truckingCompanyId?: string;

  @Column({ type: 'text', nullable: true })
  pickupNotification?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  carrierCompany?: string;

  @Column({ type: 'date', nullable: true })
  lastPickupDate?: Date;

  @Column({ type: 'date', nullable: true })
  plannedPickupDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  pickupDate?: Date;

  @Column({ type: 'date', nullable: true })
  lastDeliveryDate?: Date;

  @Column({ type: 'date', nullable: true })
  plannedDeliveryDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveryDate?: Date;

  @Column({ type: 'varchar', length: 20, nullable: true })
  unloadModePlan?: string; // Drop off / Live load

  // 司机信息
  @Column({ type: 'varchar', length: 50, nullable: true })
  driverName?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  driverPhone?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  truckPlate?: string;

  // 地点信息
  @Column({ type: 'varchar', length: 200, nullable: true })
  pickupLocation?: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  deliveryLocation?: string;

  // 费用信息
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  distanceKm?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cost?: number;

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
}
