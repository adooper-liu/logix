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
  @PrimaryColumn({ type: 'varchar', length: 50 })
  companyCode: string;

  @Column({ type: 'varchar', length: 100 })
  companyName: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  companyNameEn?: string;

  @Column({ type: 'varchar', length: 10 })
  country: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  address?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  contactPerson?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  contactPhone?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  contactEmail?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  currency?: string; // 默认币种

  @Column({ type: 'varchar', length: 50, nullable: true })
  taxId?: string; // 税号

  @Column({ type: 'varchar', length: 50, nullable: true })
  bankName?: string; // 开户银行

  @Column({ type: 'varchar', length: 50, nullable: true })
  bankAccount?: string; // 银行账号

  @Column({ type: 'int', nullable: true })
  sortOrder?: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  remarks?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
