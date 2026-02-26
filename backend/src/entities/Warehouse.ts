/**
 * 仓库字典实体
 * Warehouse Dictionary Entity
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';

@Entity('dict_warehouses')
export class Warehouse {
  @PrimaryColumn({ type: 'varchar', length: 50, name: 'warehouse_code' })
  warehouseCode: string;

  @Column({ type: 'varchar', length: 100, name: 'warehouse_name' })
  warehouseName: string;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'warehouse_name_en' })
  warehouseNameEn?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'short_name' })
  shortName?: string;

  @Column({ type: 'varchar', length: 20, name: 'property_type' })
  propertyType: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'warehouse_type' })
  warehouseType?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'company_code' })
  companyCode?: string;

  @Column({ type: 'varchar', length: 300, nullable: true, name: 'address' })
  address?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'city' })
  city?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'state' })
  state?: string;

  @Column({ type: 'varchar', length: 10, name: 'country' })
  country: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'contact_phone' })
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
