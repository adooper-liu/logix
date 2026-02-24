/**
 * 港口字典实体
 * Port Entity
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';

@Entity('dict_ports')
export class Port {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  portCode: string;

  @Column({ type: 'varchar', length: 100 })
  portName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  portNameEn?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  portType?: string; // PORT/TERMINAL/RAIL

  @Column({ type: 'varchar', length: 50, nullable: true })
  country?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  state?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city?: string;

  @Column({ type: 'int', nullable: true })
  timezone?: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitude?: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  longitude?: number;

  @Column({ type: 'varchar', length: 10, default: 'ACTIVE' })
  status: string;

  @Column({ type: 'text', nullable: true })
  remarks?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
