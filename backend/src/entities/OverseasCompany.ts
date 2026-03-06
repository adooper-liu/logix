/**
 * 海外公司字典实体
 * Overseas Company Dictionary Entity
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';

@Entity('dict_overseas_companies')
export class OverseasCompany {
  @PrimaryColumn({ type: 'varchar', length: 50, name: 'company_code' })
  companyCode: string;

  @Column({ type: 'varchar', length: 100, name: 'company_name' })
  companyName: string;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'company_name_en' })
  companyNameEn?: string;

  @Column({ type: 'varchar', length: 10, name: 'country' })
  country: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'address' })
  address?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'contact_person' })
  contactPerson?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'contact_phone' })
  contactPhone?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'contact_email' })
  contactEmail?: string;

  @Column({ type: 'varchar', length: 10, nullable: true, name: 'currency' })
  currency?: string; // 默认币种

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'tax_id' })
  taxId?: string; // 税号

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'bank_name' })
  bankName?: string; // 开户银行

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'bank_account' })
  bankAccount?: string; // 银行账号

  @Column({ type: 'int', nullable: true, name: 'sort_order' })
  sortOrder?: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'text', nullable: true, name: 'remarks' })
  remarks?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
