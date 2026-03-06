/**
 * 还空箱实体
 * Empty Return Entity
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

@Entity('process_empty_return')
export class EmptyReturn {
  @PrimaryColumn({ type: 'varchar', length: 50, name: 'container_number' })
  containerNumber: string;

  // 还箱时间计划
  @Column({ type: 'timestamp', nullable: true, name: 'last_return_date' })
  lastReturnDate?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'planned_return_date' })
  plannedReturnDate?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'return_time' })
  returnTime?: Date;

  // 还箱通知时间 - Excel映射字段 - 新增
  @Column({ type: 'date', nullable: true, name: 'notification_return_date' })
  notificationReturnDate?: Date; // 通知取空日期

  @Column({ type: 'timestamp', nullable: true, name: 'notification_return_time' })
  notificationReturnTime?: Date; // 取空时间

  // 还箱地点
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'return_terminal_code' })
  returnTerminalCode?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'return_terminal_name' })
  returnTerminalName?: string;

  // 箱况
  @Column({ type: 'varchar', length: 20, nullable: true, name: 'container_condition' })
  containerCondition?: string;

  @Column({ type: 'text', nullable: true, name: 'return_remarks' })
  returnRemarks?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 关联关系
  @ManyToOne(() => Container)
  @JoinColumn({ name: 'container_number', referencedColumnName: 'containerNumber' })
  container: Container;
}
