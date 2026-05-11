import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { BaseRateRow } from './BaseRateRow';
import { PricingVersion } from './PricingVersion';

@Entity('dict_pricing_scheme')
export class PricingScheme {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'version_id', type: 'int' })
  versionId: number;

  @Column({ name: 'country_code', type: 'varchar', length: 8 })
  countryCode: string;

  @Column({ name: 'carrier_code', type: 'varchar', length: 32 })
  carrierCode: string;

  @Column({ name: 'service_code', type: 'varchar', length: 64 })
  serviceCode: string;

  @Column({ name: 'product_line', type: 'varchar', length: 32 })
  productLine: string;

  @Column({ type: 'varchar', length: 8 })
  currency: string;

  @Column({ type: 'int', default: 100 })
  priority: number;

  @Column({ name: 'calc_mode', type: 'varchar', length: 32 })
  calcMode: string;

  @Column({ name: 'conditions_json', type: 'jsonb', default: () => "'{}'::jsonb" })
  conditionsJson: Record<string, any>;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => PricingVersion, (version) => version.schemes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'version_id' })
  version: PricingVersion;

  @OneToMany(() => BaseRateRow, (row) => row.scheme)
  baseRateRows: BaseRateRow[];
}

