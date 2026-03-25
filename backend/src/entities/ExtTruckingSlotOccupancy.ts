/**
 * 拖车日容量占用实体
 * Ext Trucking Slot Occupancy Entity
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn
} from 'typeorm';
import { TruckingCompany } from './TruckingCompany';

@Entity('ext_trucking_slot_occupancy')
@Unique(['truckingCompanyId', 'date', 'portCode', 'warehouseCode'])
export class ExtTruckingSlotOccupancy {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, name: 'trucking_company_id' })
  truckingCompanyId: string;

  @ManyToOne(() => TruckingCompany, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trucking_company_id' })
  truckingCompany: TruckingCompany;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'port_code' })
  portCode?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'warehouse_code' })
  warehouseCode?: string;

  @Column({ type: 'int', default: 0, name: 'planned_trips' })
  plannedTrips: number;

  @Column({ type: 'int', default: 0 })
  capacity: number;

  @Column({ type: 'int', default: 0, name: 'remaining' })
  remaining: number;

  @Column({ type: 'boolean', default: false, name: 'manual_override' })
  manualOverride: boolean;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
