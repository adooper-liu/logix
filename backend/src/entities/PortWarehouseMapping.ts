/**
 * 港口-仓库映射实体
 * Port-Warehouse Mapping Entity
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('dict_port_warehouse_mapping')
export class PortWarehouseMapping {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, name: 'port_code' })
  portCode: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'port_name' })
  portName: string;

  @Column({ type: 'varchar', length: 50, name: 'warehouse_code' })
  warehouseCode: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'warehouse_name' })
  warehouseName: string;

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
