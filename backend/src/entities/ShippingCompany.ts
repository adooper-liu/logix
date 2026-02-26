/**
 * 船公司字典实体
 * Shipping Company Entity
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';

@Entity('dict_shipping_companies')
export class ShippingCompany {
  @PrimaryColumn({ type: 'varchar', length: 50, name: 'company_code' })
  companyCode: string;

  @Column({ type: 'varchar', length: 100, name: 'company_name' })
  companyName: string;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'company_name_en' })
  companyNameEn?: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'scac_code' })
  scacCode?: string; // Standard Carrier Alpha Code

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'api_provider' })
  apiProvider?: string; // API提供商 (MSK/CMA/COSCO等)

  @Column({ type: 'boolean', default: true, nullable: true, name: 'support_booking' })
  supportBooking?: boolean; // 支持订舱号查询

  @Column({ type: 'boolean', default: true, nullable: true, name: 'support_bill_of_lading' })
  supportBillOfLading?: boolean; // 支持提单号查询

  @Column({ type: 'boolean', default: true, nullable: true, name: 'support_container' })
  supportContainer?: boolean; // 支持箱号查询

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'website_url' })
  websiteUrl?: string;

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
