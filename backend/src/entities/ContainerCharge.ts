/**
 * 费用记录实体
 * Container Charge Entity
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

@Entity('ext_container_charges')
export class ContainerCharge {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  containerNumber: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  chargeType: string; // STORAGE/DEMURRAGE/DETENTION/PICKUP/DELIVERY

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  chargeAmount: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  chargeCurrency: string;

  @Column({ type: 'date', nullable: true })
  chargeDate: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

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
