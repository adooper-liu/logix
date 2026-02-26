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

  @Column({ type: 'varchar', length: 50 })
  containerNumber: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  holdType: string; // CUSTOMS/CARRIER/TERMINAL/CHARGES

  @Column({ type: 'text', nullable: true })
  holdReason: string;

  @Column({ type: 'timestamp', nullable: true })
  holdDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  releaseDate: Date;

  @Column({ type: 'varchar', length: 20, nullable: true })
  status: string;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // 关联关系
  @ManyToOne(() => Container)
  @JoinColumn({ name: 'container_number' })
  container: Container;
}
