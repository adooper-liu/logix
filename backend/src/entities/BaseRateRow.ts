import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { PricingScheme } from './PricingScheme';

@Entity('dict_base_rate_row')
export class BaseRateRow {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'scheme_id', type: 'int' })
  schemeId: number;

  @Column({ name: 'zone_code', type: 'varchar', length: 16, nullable: true })
  zoneCode: string | null;

  @Column({ name: 'lane_code', type: 'varchar', length: 32, nullable: true })
  laneCode: string | null;

  @Column({ name: 'weight_from', type: 'decimal', precision: 10, scale: 3, nullable: true })
  weightFrom: number | null;

  @Column({ name: 'weight_to', type: 'decimal', precision: 10, scale: 3, nullable: true })
  weightTo: number | null;

  @Column({ name: 'first_weight', type: 'decimal', precision: 10, scale: 3, nullable: true })
  firstWeight: number | null;

  @Column({ name: 'first_fee', type: 'decimal', precision: 12, scale: 2, nullable: true })
  firstFee: number | null;

  @Column({ name: 'additional_step_weight', type: 'decimal', precision: 10, scale: 3, nullable: true })
  additionalStepWeight: number | null;

  @Column({
    name: 'additional_fee_per_step',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true
  })
  additionalFeePerStep: number | null;

  @Column({ name: 'flat_fee', type: 'decimal', precision: 12, scale: 2, nullable: true })
  flatFee: number | null;

  @Column({ name: 'unit_price_per_kg', type: 'decimal', precision: 12, scale: 4, nullable: true })
  unitPricePerKg: number | null;

  @Column({ name: 'min_charge', type: 'decimal', precision: 12, scale: 2, nullable: true })
  minCharge: number | null;

  @Column({ name: 'max_charge', type: 'decimal', precision: 12, scale: 2, nullable: true })
  maxCharge: number | null;

  @Column({ name: 'billable_weight_rounding', type: 'varchar', length: 16, nullable: true })
  billableWeightRounding: string | null;

  @Column({ name: 'params_json', type: 'jsonb', default: () => "'{}'::jsonb" })
  paramsJson: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => PricingScheme, (scheme) => scheme.baseRateRows, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scheme_id' })
  scheme: PricingScheme;
}

