/**
 * HOLD记录实体
 * Container Hold Record Entity
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

@Entity('container_hold_records')
export class ContainerHoldRecord {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 50 })
  containerNumber: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  billOfLadingNumber?: string;

  @Column({ type: 'varchar', length: 50 })
  holdType: string; // CUSTOMS/CARRIER/TERMINAL/CHARGES

  @Column({ type: 'varchar', length: 20 })
  holdStatus: string; // ACTIVE/RELEASED

  @Column({ type: 'date', nullable: true })
  holdDate?: Date;

  @Column({ type: 'text', nullable: true })
  holdDescription?: string;

  @Column({ type: 'timestamp', nullable: true })
  releasedAt?: Date;

  @Column({ type: 'text', nullable: true })
  releaseReason?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 关联关系
  @ManyToOne(() => Container)
  @JoinColumn({ name: 'container_number' })
  container: Container;
}
