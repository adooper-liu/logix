/**
 * 客户类型字典实体
 * Customer Type Dictionary Entity
 */

import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('dict_customer_types')
export class CustomerType {
  @PrimaryColumn({ type: 'varchar', length: 20, name: 'type_code' })
  typeCode!: string; // 类型代码

  @Column({ type: 'varchar', length: 50, name: 'type_name_cn' })
  typeNameCn!: string; // 中文名称

  @Column({ type: 'varchar', length: 50, name: 'type_name_en' })
  typeNameEn!: string; // 英文名称

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
