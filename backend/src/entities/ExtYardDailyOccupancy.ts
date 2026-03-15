/**
 * 第三堆场日占用实体
 * Ext Yard Daily Occupancy Entity
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique
} from 'typeorm';

@Entity('ext_yard_daily_occupancy')
@Unique(['yardCode', 'date'])
export class ExtYardDailyOccupancy {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, name: 'yard_code' })
  yardCode: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'yard_name' })
  yardName?: string;

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
