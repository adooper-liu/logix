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

  @Column({ type: 'varchar', length: 50, name: 'container_number' })
  containerNumber: string;

  // 状态信息
  @Column({ type: 'varchar', length: 20, nullable: true, name: 'status_code' })
  statusCode: string; // DLPT, ARVD, etc.

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'status_name' })
  statusName: string;

  @Column({ type: 'timestamp', nullable: true, name: 'occurred_at' })
  occurredAt: Date;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'location' })
  location: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'terminal_name' })
  terminalName: string; // 码头名称

  @Column({ type: 'text', nullable: true, name: 'description' })
  description: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'data_source' })
  dataSource: string; // AIS/ShipCompany/Terminal

  @Column({ type: 'jsonb', nullable: true, name: 'raw_data' })
  rawData: any;

  @Column({ type: 'boolean', default: false, name: 'is_estimated' })
  isEstimated: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // 关联关系
  @ManyToOne(() => Container)
  @JoinColumn({ name: 'container_number' })
  container: Container;

  /** 以下非持久化或来自 raw_data/飞驼映射，供服务层填充，避免与 DB 列重复时请优先用库内列 */
  eventCode?: string;
  eventName?: string;
  locationCode?: string;
  locationNameCn?: string;
  locationNameEn?: string;
  locationNameOriginal?: string;
  latitude?: number;
  longitude?: number;
  timezone?: number;
  cargoLocation?: string;
  statusType?: string;
  descriptionCn?: string;
  descriptionEn?: string;
  descriptionOriginal?: string;
  /** 兼容旧代码字段名 */
  locationName?: string;
  eventType?: string;
}
