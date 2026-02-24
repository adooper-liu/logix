/**
 * 柜型字典实体
 * Container Type Dictionary Entity
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';

@Entity('dict_container_types')
export class ContainerType {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 10, unique: true })
  containerCode: string;

  @Column({ type: 'varchar', length: 50 })
  containerName: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  length: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  width: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  height: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxWeight: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  cbm: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
