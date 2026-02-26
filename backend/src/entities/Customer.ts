/**
 * 客户实体
 * Customer Entity
 * 说明: 客户包括外部平台客户和集团内部子公司
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { Country } from './Country';
import { CustomerType } from './CustomerType';
import { OverseasCompany } from './OverseasCompany';

@Entity('biz_customers')
export class Customer {
  @PrimaryColumn({ type: 'varchar', length: 50, name: 'customer_code' })
  customerCode!: string; // 客户编码

  @Column({ type: 'varchar', length: 100, name: 'customer_name' })
  customerName!: string; // 客户名称

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'customer_type_code' })
  customerTypeCode!: string; // 客户类型编码

  @Column({ type: 'varchar', length: 10, nullable: true, name: 'country' })
  country!: string; // 所属国家代码

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'overseas_company_code' })
  overseasCompanyCode!: string; // 海外公司编码（如果客户是子公司）

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'customer_category' })
  customerCategory!: string; // 客户类别 (PLATFORM-平台客户, SUBSIDIARY-子公司, OTHER-其他)

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'address' })
  address!: string; // 地址

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'contact_person' })
  contactPerson!: string; // 联系人

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'contact_phone' })
  contactPhone!: string; // 联系电话

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'contact_email' })
  contactEmail!: string; // 联系邮箱

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'payment_term' })
  paymentTerm!: string; // 付款条款

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'price_term' })
  priceTerm!: string; // 价格条款 (FOB/CIF/DDP等)

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'tax_number' })
  taxNumber!: string; // 税号

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'customs_code' })
  customsCode!: string; // 海关编码

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE', name: 'status' })
  status!: string; // 状态

  @Column({ type: 'int', default: 0, nullable: true, name: 'sort_order' })
  sortOrder!: number; // 显示顺序

  @Column({ type: 'text', nullable: true, name: 'remarks' })
  remarks!: string; // 备注

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // 关联关系
  @ManyToOne(() => Country, { nullable: true })
  @JoinColumn({ name: 'country' })
  countryInfo!: Country;

  @ManyToOne(() => CustomerType, { nullable: true })
  @JoinColumn({ name: 'customer_type_code' })
  customerTypeInfo!: CustomerType;

  @ManyToOne(() => OverseasCompany, { nullable: true })
  @JoinColumn({ name: 'overseas_company_code' })
  overseasCompany!: OverseasCompany;
}
