/**
 * 车队-港口映射实体
 * Trucking-Port Mapping Entity
 * 包含车队与港口的关联及费用信息
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('dict_trucking_port_mapping')
export class TruckingPortMapping {
  @PrimaryGeneratedColumn()
  id: number;

  /** 该国分公司，存 dict_countries.code @see 12-国家概念统一约定.md */
  @Column({ type: 'varchar', length: 50, name: 'country' })
  country: string;

  /** 车队代码，引用 dict_trucking_companies.company_code */
  @Column({ type: 'varchar', length: 100, name: 'trucking_company_id' })
  truckingCompanyId: string;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'trucking_company_name' })
  truckingCompanyName: string;

  @Column({ type: 'varchar', length: 50, name: 'port_code' })
  portCode: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'port_name' })
  portName: string;

  /** 堆场容量（每天最多可接受的 Drop 模式货柜量） */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'yard_capacity' })
  yardCapacity: number;

  /** 堆场收费标准（每天费用 USD/天） */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'standard_rate' })
  standardRate: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  unit: string;

  /** 堆场操作费（每个货柜一次性收费 USD） */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'yard_operation_fee' })
  yardOperationFee: number;

  /** 拖卡费（每次运输总费用 USD） */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'transport_fee' })
  transportFee: number;

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
