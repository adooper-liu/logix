/**
 * 拖车公司字典实体
 * Trucking Company Entity
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';

@Entity('dict_trucking_companies')
export class TruckingCompany {
  @PrimaryColumn({ type: 'varchar', length: 50, name: 'company_code' })
  companyCode: string;

  @Column({ type: 'varchar', length: 100, name: 'company_name' })
  companyName: string;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'company_name_en' })
  companyNameEn?: string;

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
