/**
 * 仓库字典实体
 * Warehouse Dictionary Entity
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';

@Entity('dict_warehouses')
export class Warehouse {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  warehouseCode: string;

  @Column({ type: 'varchar', length: 100 })
  warehouseName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  warehouseNameEn?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  warehouseType?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  country?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  state?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city?: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  address?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  contactPhone?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  contactEmail?: string;

  @Column({ type: 'varchar', length: 10, default: 'ACTIVE' })
  status: string;

  @Column({ type: 'text', nullable: true })
  remarks?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
