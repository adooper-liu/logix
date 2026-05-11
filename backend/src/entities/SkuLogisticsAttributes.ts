/**
 * SKU 物流属性主数据实体
 * SKU Logistics Attributes Entity
 */

import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('ext_sku_logistics_attributes')
export class SkuLogisticsAttributes {
  @PrimaryColumn({ name: 'sku_code', type: 'varchar', length: 50 })
  skuCode: string;

  @Column({ name: 'sku_name', type: 'varchar', length: 200, nullable: true })
  skuName: string | null;

  // 尺寸信息（统一使用 cm/kg）
  @Column({ name: 'length_cm', type: 'decimal', precision: 8, scale: 2, nullable: true })
  lengthCm: number | null;

  @Column({ name: 'width_cm', type: 'decimal', precision: 8, scale: 2, nullable: true })
  widthCm: number | null;

  @Column({ name: 'height_cm', type: 'decimal', precision: 8, scale: 2, nullable: true })
  heightCm: number | null;

  @Column({ name: 'gross_weight_kg', type: 'decimal', precision: 8, scale: 2, nullable: true })
  grossWeightKg: number | null;

  @Column({ name: 'net_weight_kg', type: 'decimal', precision: 8, scale: 2, nullable: true })
  netWeightKg: number | null;

  @Column({ name: 'volume_m3', type: 'decimal', precision: 10, scale: 6, nullable: true })
  volumeM3: number | null;

  // 包装属性
  @Column({ name: 'packaging_type', type: 'varchar', length: 50, nullable: true })
  packagingType: string | null;

  @Column({ name: 'is_fragile', type: 'boolean', default: false })
  isFragile: boolean;

  @Column({ name: 'is_assembly_required', type: 'boolean', default: false })
  isAssemblyRequired: boolean;

  // 物流分类标签（用于快速筛选）
  @Column({ name: 'category_tags', type: 'jsonb', nullable: true })
  categoryTags: any | null;

  // 元数据
  @Column({ name: 'source_system', type: 'varchar', length: 50, default: 'MANUAL' })
  sourceSystem: string;

  @Column({ name: 'last_verified_at', type: 'timestamp', nullable: true })
  lastVerifiedAt: Date | null;

  // 审计字段
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
