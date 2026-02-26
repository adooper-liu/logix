/**
 * 柜型字典实体
 * Container Type Dictionary Entity
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';

@Entity('dict_container_types')
export class ContainerType {
  @PrimaryColumn({ type: 'varchar', length: 20, name: 'type_code' })
  typeCode: string;

  @Column({ type: 'varchar', length: 50, name: 'type_name_cn' })
  typeNameCn: string;

  @Column({ type: 'varchar', length: 100, name: 'type_name_en' })
  typeNameEn: string;

  @Column({ type: 'int', nullable: true, name: 'size_ft' })
  sizeFt?: number; // 尺寸 (20/40/45/53)

  @Column({ type: 'varchar', length: 10, nullable: true, name: 'type_abbrev' })
  typeAbbrev?: string; // 类型缩写 (GP/HC/FR/OT/TK/RF/HT等)

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'full_name' })
  fullName?: string; // 全称 (General Purpose, Open Top等)

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'dimensions' })
  dimensions?: string; // 尺寸规格 (20'x8'x8'6"等)

  @Column({ type: 'int', nullable: true, name: 'max_weight_kg' })
  maxWeightKg?: number; // 最大载重(KG)

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true, name: 'max_cbm' })
  maxCbm?: number; // 最大体积(CBM)

  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true, name: 'teu' })
  teu?: number; // TEU标准箱单位

  @Column({ type: 'int', nullable: true, name: 'sort_order' })
  sortOrder?: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'text', nullable: true, name: 'remarks' })
  remarks?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
