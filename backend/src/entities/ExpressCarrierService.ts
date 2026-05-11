/**
 * 承运商服务实体
 * Express Carrier Service Entity
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { ExpressStackPolicy } from './ExpressStackPolicy';
import { ExpressSurchargeRule } from './ExpressSurchargeRule';

@Entity('dict_express_carrier_service')
export class ExpressCarrierService {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'country_code', type: 'varchar', length: 50 })
  countryCode: string;

  @Column({ name: 'service_name', type: 'varchar', length: 200 })
  serviceName: string;

  @Column({ name: 'default_length_unit', type: 'varchar', length: 10, default: 'in' })
  defaultLengthUnit: string;

  @Column({ name: 'default_weight_unit', type: 'varchar', length: 10, default: 'lb' })
  defaultWeightUnit: string;

  @Column({ name: 'external_code', type: 'varchar', length: 100, nullable: true })
  externalCode: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 关系
  @OneToMany(() => ExpressSurchargeRule, (rule) => rule.carrierService)
  rules: ExpressSurchargeRule[];

  @OneToMany(() => ExpressStackPolicy, (policy) => policy.carrierService)
  policies: ExpressStackPolicy[];
}
