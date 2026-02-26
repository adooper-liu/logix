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
  @PrimaryColumn({ type: 'varchar', length: 50, name: 'forwarder_code' })
  forwarderCode: string;

  @Column({ type: 'varchar', length: 100, name: 'forwarder_name' })
  forwarderName: string;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'forwarder_name_en' })
  forwarderNameEn?: string;

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
