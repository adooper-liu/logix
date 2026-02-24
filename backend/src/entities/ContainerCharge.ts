/**
 * 费用记录实体
 * Container Charge Entity
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

@Entity('container_charges')
export class ContainerCharge {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 50 })
  containerNumber: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  billOfLadingNumber?: string;

  @Column({ type: 'varchar', length: 50 })
  chargeType: string; // STORAGE/DEMURRAGE/DETENTION/PICKUP/DELIVERY

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({ type: 'varchar', length: 20 })
  chargeStatus: string; // PENDING/PAID/WAIVED

  @Column({ type: 'date', nullable: true })
  chargeDate?: Date;

  @Column({ type: 'text', nullable: true })
  chargeDescription?: string;

  @Column({ type: 'date', nullable: true })
  paidDate?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 关联关系
  @ManyToOne(() => Container)
  @JoinColumn({ name: 'container_number' })
  container: Container;
}
