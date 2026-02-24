/**
 * 货代公司字典实体
 * Freight Forwarder Entity
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';

@Entity('dict_freight_forwarders')
export class FreightForwarder {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  forwarderCode: string;

  @Column({ type: 'varchar', length: 100 })
  companyName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  companyNameEn?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  contactPhone?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  contactEmail?: string;

  @Column({ type: 'varchar', length: 10, default: 'ACTIVE' })
  status: string;

  @Column({ type: 'text', nullable: true })
  remarks?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
