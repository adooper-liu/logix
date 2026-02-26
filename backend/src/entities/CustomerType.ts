/**
 * 客户类型字典实体
 * Customer Type Dictionary Entity
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';

@Entity('dict_customer_types')
export class CustomerType {
  @PrimaryColumn({ type: 'varchar', length: 20, name: 'type_code' })
  typeCode!: string; // 类型代码 (WAYFAIR, AMAZON, PRIVATE, RESELLER等)

  @Column({ type: 'varchar', length: 50, name: 'type_name' })
  typeName!: string; // 类型名称 (Wayfair, Amazon, 私有客户, 零售商等)

  @Column({ type: 'varchar', length: 10, nullable: true, name: 'category' })
  category!: string; // 类别 (PLATFORM-平台, PRIVATE-私有, RESELLER-经销商等)

  @Column({ type: 'text', nullable: true, name: 'description' })
  description!: string; // 描述

  @Column({ type: 'int', default: 0, name: 'sort_order' })
  sortOrder!: number; // 排序

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean; // 是否启用

  @Column({ type: 'text', nullable: true, name: 'remarks' })
  remarks!: string; // 备注

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
