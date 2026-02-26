/**
 * 集装箱装载记录实体
 * Container Loading Record Entity
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

@Entity('ext_container_loading_records')
export class ContainerLoadingRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  containerNumber: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  loadNumber: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  loadingPort: string;

  @Column({ type: 'timestamp', nullable: true })
  loadingDate: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  dischargePort: string;

  @Column({ type: 'timestamp', nullable: true })
  dischargeDate: Date;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // 关联关系
  @ManyToOne(() => Container)
  @JoinColumn({ name: 'container_number' })
  container: Container;
}
