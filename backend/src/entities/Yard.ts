/**
 * 堆场字典实体
 * Yard Dictionary Entity
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';

@Entity('dict_yards')
export class Yard {
  @PrimaryColumn({ type: 'varchar', length: 50, name: 'yard_code' })
  yardCode: string;

  @Column({ type: 'varchar', length: 100, name: 'yard_name' })
  yardName: string;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'yard_name_en' })
  yardNameEn?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'port_code' })
  portCode?: string;

  @Column({ type: 'int', default: 100, name: 'daily_capacity' })
  dailyCapacity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'fee_per_day' })
  feePerDay: number;

  @Column({ type: 'varchar', length: 300, nullable: true, name: 'address' })
  address?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'contact_phone' })
  contactPhone?: string;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE', name: 'status' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
