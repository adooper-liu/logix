/**
 * 互斥策略实体
 * Express Stack Policy Entity
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { ExpressCarrierService } from './ExpressCarrierService';
import { ExpressSurchargeVersion } from './ExpressSurchargeVersion';

@Entity('dict_express_stack_policy')
export class ExpressStackPolicy {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'version_id', type: 'int' })
  versionId: number;

  @Column({ name: 'country_code', type: 'varchar', length: 50 })
  countryCode: string;

  @Column({ name: 'carrier_service_id', type: 'int' })
  carrierServiceId: number;

  // 策略类型
  @Column({ name: 'policy_type', type: 'varchar', length: 50 })
  policyType: string;

  // 策略配置（JSONB）
  @Column({ name: 'policy_json', type: 'jsonb' })
  policyJson: any;

  // 审计字段
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 关系
  @ManyToOne(() => ExpressSurchargeVersion, (version) => version.policies)
  @JoinColumn({ name: 'version_id' })
  version: ExpressSurchargeVersion;

  @ManyToOne(() => ExpressCarrierService, (carrierService) => carrierService.policies)
  @JoinColumn({ name: 'carrier_service_id' })
  carrierService: ExpressCarrierService;
}
