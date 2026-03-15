/**
 * 仓库日产能占用实体
 * Ext Warehouse Daily Occupancy Entity
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique
} from 'typeorm';
import { Warehouse } from './Warehouse';

@Entity('ext_warehouse_daily_occupancy')
@Unique(['warehouseCode', 'date'])
export class ExtWarehouseDailyOccupancy {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, name: 'warehouse_code' })
  warehouseCode: string;

  @ManyToOne(() => Warehouse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warehouse_code' })
  warehouse: Warehouse;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'int', default: 0, name: 'planned_count' })
  plannedCount: number;

  @Column({ type: 'int', default: 0 })
  capacity: number;

  @Column({ type: 'int', default: 0, name: 'remaining' })
  remaining: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
