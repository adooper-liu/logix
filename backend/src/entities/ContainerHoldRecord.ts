/**
 * HOLD记录实体
 * Container Hold Record Entity
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { Container } from './Container';

@Entity('ext_container_hold_records')
export class ContainerHoldRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, name: 'container_number' })
  containerNumber: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'hold_type' })
  holdType: string; // CUSTOMS/CARRIER/TERMINAL/CHARGES

  @Column({ type: 'text', nullable: true, name: 'hold_reason' })
  holdReason: string;

  @Column({ type: 'timestamp', nullable: true, name: 'hold_date' })
  holdDate: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'release_date' })
  releaseDate: Date;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'status' })
  status: string;

  @Column({ type: 'text', nullable: true, name: 'remarks' })
  remarks: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // 关联关系
  @ManyToOne(() => Container)
  @JoinColumn({ name: 'container_number' })
  container: Container;
}
