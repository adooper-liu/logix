/**
 * 集装箱状态节点实体
 * Container Status Event Entity
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

@Entity('ext_container_status_events')
export class ContainerStatusEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  containerNumber: string;

  // 状态信息
  @Column({ type: 'varchar', length: 20, nullable: true })
  statusCode: string; // DLPT, ARVD, etc.

  @Column({ type: 'varchar', length: 100, nullable: true })
  statusName: string;

  @Column({ type: 'timestamp', nullable: true })
  occurredAt: Date;

  @Column({ type: 'varchar', length: 200, nullable: true })
  location: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  dataSource: string; // AIS/ShipCompany/Terminal

  @Column({ type: 'jsonb', nullable: true })
  rawData: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // 关联关系
  @ManyToOne(() => Container)
  @JoinColumn({ name: 'container_number' })
  container: Container;
}
