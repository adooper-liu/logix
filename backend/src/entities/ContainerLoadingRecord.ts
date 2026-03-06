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

  @Column({ type: 'varchar', length: 50, name: 'container_number' })
  containerNumber: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'load_number' })
  loadNumber: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'loading_port' })
  loadingPort: string;

  @Column({ type: 'timestamp', nullable: true, name: 'loading_date' })
  loadingDate: Date;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'discharge_port' })
  dischargePort: string;

  @Column({ type: 'timestamp', nullable: true, name: 'discharge_date' })
  dischargeDate: Date;

  @Column({ type: 'text', nullable: true, name: 'remarks' })
  remarks: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // 关联关系
  @ManyToOne(() => Container)
  @JoinColumn({ name: 'container_number' })
  container: Container;
}
