/**
 * 集装箱状态节点实体
 * Container Status Event Entity
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

@Entity('container_status_events')
export class ContainerStatusEvent {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 50 })
  containerNumber: string;

  // 状态信息
  @Column({ type: 'varchar', length: 20 })
  statusCode: string; // DLPT, ARVD, etc.

  @Column({ type: 'timestamp' })
  occurredAt: Date;

  @Column({ type: 'boolean' })
  isEstimated: boolean; // 是否为预计时间

  // 地点信息
  @Column({ type: 'varchar', length: 50, nullable: true })
  locationCode?: string; // CNNG

  @Column({ type: 'varchar', length: 100, nullable: true })
  locationNameEn?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  locationNameCn?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  locationNameOriginal?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  statusType?: string; // ETA/ETD/ATA/ATD

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitude?: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  longitude?: number;

  @Column({ type: 'int', nullable: true })
  timezone?: number;

  // 码头信息
  @Column({ type: 'varchar', length: 50, nullable: true })
  terminalName?: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  cargoLocation?: string;

  @Column({ type: 'varchar', length: 50 })
  dataSource: string; // AIS/ShipCompany/Terminal

  // 状态描述
  @Column({ type: 'varchar', length: 100, nullable: true })
  descriptionCn?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  descriptionEn?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  descriptionOriginal?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  routePath?: string; // 路径 (多港经停场景)

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 关联关系
  @ManyToOne(() => Container)
  @JoinColumn({ name: 'container_number' })
  container: Container;
}
