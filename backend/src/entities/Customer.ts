/**
 * 客户实体
 * Customer Entity
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

@Entity('biz_customers')
export class Customer {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  customerCode!: string; // 客户编码

  @Column({ type: 'varchar', length: 100 })
  customerName!: string; // 客户名称

  @Column({ type: 'varchar', length: 50, nullable: true })
  customerTypeCode!: string; // 客户类型编码

  @Column({ type: 'varchar', length: 10, nullable: true })
  country!: string; // 所属国家代码

  @Column({ type: 'varchar', length: 200, nullable: true })
  address!: string; // 地址

  @Column({ type: 'varchar', length: 50, nullable: true })
  contactPerson!: string; // 联系人

  @Column({ type: 'varchar', length: 20, nullable: true })
  contactPhone!: string; // 联系电话

  @Column({ type: 'varchar', length: 100, nullable: true })
  contactEmail!: string; // 联系邮箱

  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentTerm!: string; // 付款条款

  @Column({ type: 'varchar', length: 20, nullable: true })
  priceTerm!: string; // 价格条款 (FOB/CIF/DDP等)

  @Column({ type: 'varchar', length: 50, nullable: true })
  taxNumber!: string; // 税号

  @Column({ type: 'varchar', length: 50, nullable: true })
  customsCode!: string; // 海关编码

  @Column({ type: 'boolean', default: true })
  isActive!: boolean; // 是否启用

  @Column({ type: 'int', default: 0, nullable: true })
  sortOrder!: number; // 显示顺序

  @Column({ type: 'text', nullable: true })
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
}
