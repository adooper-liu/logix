/**
 * 滞港费标准实体
 * Demurrage Standard Entity
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';

@Entity('ext_demurrage_standards')
export class ExtDemurrageStandard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'foreign_company_code' })
  foreignCompanyCode: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'foreign_company_name' })
  foreignCompanyName: string;

  @Column({ type: 'date', nullable: true, name: 'effective_date' })
  effectiveDate: Date;

  @Column({ type: 'date', nullable: true, name: 'expiry_date' })
  expiryDate: Date;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'destination_port_code' })
  destinationPortCode: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'destination_port_name' })
  destinationPortName: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'shipping_company_code' })
  shippingCompanyCode: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'shipping_company_name' })
  shippingCompanyName: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'terminal' })
  terminal: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'origin_forwarder_code' })
  originForwarderCode: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'origin_forwarder_name' })
  originForwarderName: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'transport_mode_code' })
  transportModeCode: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'transport_mode_name' })
  transportModeName: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'charge_type_code' })
  chargeTypeCode: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'charge_name' })
  chargeName: string;

  @Column({ type: 'varchar', length: 1, default: 'N', name: 'is_chargeable' })
  isChargeable: string;

  @Column({ type: 'int', nullable: true, name: 'sequence_number' })
  sequenceNumber: number;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'port_condition' })
  portCondition: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'free_days_basis' })
  freeDaysBasis: string;

  @Column({ type: 'int', nullable: true, name: 'free_days' })
  freeDays: number;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'calculation_basis' })
  calculationBasis: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'rate_per_day' })
  ratePerDay: number;

  @Column({ type: 'jsonb', nullable: true, name: 'tiers' })
  tiers: Record<string, unknown>;

  @Column({ type: 'varchar', length: 10, default: 'USD', name: 'currency' })
  currency: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'process_status' })
  processStatus: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
