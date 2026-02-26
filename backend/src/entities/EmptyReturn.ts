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

@Entity('process_empty_returns')
export class EmptyReturn {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  containerNumber: string;

  // 还箱时间计划
  @Column({ type: 'timestamp', nullable: true })
  lastReturnDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  plannedReturnDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  returnTime?: Date;

  // 还箱通知时间 - Excel映射字段 - 新增
  @Column({ type: 'date', nullable: true })
  notificationReturnDate?: Date; // 通知取空日期

  @Column({ type: 'timestamp', nullable: true })
  notificationReturnTime?: Date; // 取空时间

  // 还箱地点
  @Column({ type: 'varchar', length: 50, nullable: true })
  returnTerminalCode?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  returnTerminalName?: string;

  // 箱况
  @Column({ type: 'varchar', length: 20, nullable: true })
  containerCondition?: string;

  @Column({ type: 'text', nullable: true })
  returnRemarks?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 关联关系
  @ManyToOne(() => Container)
  @JoinColumn({
    name: 'containerNumber',
    referencedColumnName: 'containerNumber'
  })
  container: Container;
}
