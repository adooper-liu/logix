/**
 * 仓库-车队映射实体
 * Warehouse-Trucking Mapping Entity
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('dict_warehouse_trucking_mapping')
export class WarehouseTruckingMapping {
  @PrimaryGeneratedColumn()
  id: number;

  /** 该国分公司，存 dict_countries.code @see 12-国家概念统一约定.md */
  @Column({ type: 'varchar', length: 50, name: 'country' })
  country: string;

  @Column({ type: 'varchar', length: 50, name: 'warehouse_code' })
  warehouseCode: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'warehouse_name' })
  warehouseName: string;

  @Column({ type: 'varchar', length: 100, name: 'trucking_company_id' })
  truckingCompanyId: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'trucking_company_name' })
  truckingCompanyName: string;

  @Column({ type: 'varchar', length: 20, default: 'DEFAULT', name: 'mapping_type' })
  mappingType: string;

  @Column({ type: 'boolean', default: false, name: 'is_default' })
  isDefault: boolean;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
