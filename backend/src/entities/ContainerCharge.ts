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

  @Column({ type: 'varchar', length: 50, name: 'container_number' })
  containerNumber: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'charge_type' })
  chargeType: string; // STORAGE/DEMURRAGE/DETENTION/PICKUP/DELIVERY

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'charge_amount' })
  chargeAmount: number;

  @Column({ type: 'varchar', length: 10, nullable: true, name: 'charge_currency' })
  chargeCurrency: string;

  @Column({ type: 'date', nullable: true, name: 'charge_date' })
  chargeDate: Date;

  @Column({ type: 'text', nullable: true, name: 'description' })
  description: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'status' })
  status: string;

  @Column({ type: 'text', nullable: true, name: 'remarks' })
  remarks: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // 关联关系
  @ManyToOne(() => Container)
  @JoinColumn({ name: 'container_number' })
  container: Container;
}
