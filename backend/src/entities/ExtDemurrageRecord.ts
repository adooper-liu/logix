/**
 * 滞港费记录实体
 * Demurrage Record Entity
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { Container } from './Container';

@Entity('ext_demurrage_records')
export class ExtDemurrageRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, name: 'container_number' })
  containerNumber: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'charge_type' })
  chargeType: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'charge_name' })
  chargeName: string;

  @Column({ type: 'int', nullable: true, name: 'free_days' })
  freeDays: number;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'free_days_basis' })
  freeDaysBasis: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'calculation_basis' })
  calculationBasis: string;

  @Column({ type: 'date', nullable: true, name: 'charge_start_date' })
  chargeStartDate: Date;

  @Column({ type: 'date', nullable: true, name: 'charge_end_date' })
  chargeEndDate: Date;

  @Column({ type: 'int', nullable: true, name: 'charge_days' })
  chargeDays: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'charge_amount' })
  chargeAmount: number;

  @Column({ type: 'varchar', length: 10, default: 'USD', name: 'currency' })
  currency: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'charge_status' })
  chargeStatus: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'invoice_number' })
  invoiceNumber: string;

  @Column({ type: 'date', nullable: true, name: 'invoice_date' })
  invoiceDate: Date;

  @Column({ type: 'date', nullable: true, name: 'payment_date' })
  paymentDate: Date;

  @Column({ type: 'text', nullable: true, name: 'remarks' })
  remarks: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Container)
  @JoinColumn({ name: 'container_number' })
  container: Container;
}
