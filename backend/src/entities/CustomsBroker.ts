/**
 * 清关公司字典实体
 * Customs Broker Entity
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';

@Entity('dict_customs_brokers')
export class CustomsBroker {
  @PrimaryColumn({ type: 'varchar', length: 50, name: 'broker_code' })
  brokerCode: string;

  @Column({ type: 'varchar', length: 100, name: 'broker_name' })
  brokerName: string;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'broker_name_en' })
  brokerNameEn?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'contact_phone' })
  contactPhone?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'contact_email' })
  contactEmail?: string;

  @Column({ type: 'varchar', length: 10, default: 'ACTIVE', name: 'status' })
  status: string;

  @Column({ type: 'text', nullable: true, name: 'remarks' })
  remarks?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
