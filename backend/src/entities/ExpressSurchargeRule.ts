/**
 * 附加费规则实体
 * Express Surcharge Rule Entity
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

@Entity('dict_express_surcharge_rule')
export class ExpressSurchargeRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'version_id', type: 'int' })
  versionId: number;

  @Column({ name: 'carrier_service_id', type: 'int' })
  carrierServiceId: number;

  @Column({ name: 'source_line_number', type: 'int', nullable: true })
  sourceLineNumber: number | null;

  // 类型字段
  @Column({ name: 'type_raw', type: 'text', nullable: true })
  typeRaw: string | null;

  @Column({ name: 'type_normalized', type: 'varchar', length: 50, nullable: true })
  typeNormalized: string | null;

  // 尺寸阈值（英制，单位：英寸）
  @Column({ name: 'longest_in', type: 'decimal', precision: 8, scale: 2, nullable: true })
  longestIn: number | null;

  @Column({ name: 'second_in', type: 'decimal', precision: 8, scale: 2, nullable: true })
  secondIn: number | null;

  @Column({ name: 'shortest_in', type: 'decimal', precision: 8, scale: 2, nullable: true })
  shortestIn: number | null;

  @Column({ name: 'girth_in', type: 'decimal', precision: 8, scale: 2, nullable: true })
  girthIn: number | null;

  @Column({ name: 'l_plus_s_in', type: 'decimal', precision: 8, scale: 2, nullable: true })
  lPlusSIn: number | null;

  @Column({ name: 'three_sides_sum_in', type: 'decimal', precision: 8, scale: 2, nullable: true })
  threeSidesSumIn: number | null;

  @Column({ name: 'diagonal_in', type: 'decimal', precision: 8, scale: 2, nullable: true })
  diagonalIn: number | null;

  @Column({ name: 'vol_m3_threshold', type: 'decimal', precision: 10, scale: 6, nullable: true })
  volM3Threshold: number | null;

  // 重量阈值
  @Column({ name: 'gross_wt_value', type: 'decimal', precision: 10, scale: 2, nullable: true })
  grossWtValue: number | null;

  @Column({ name: 'rate_wt_single', type: 'decimal', precision: 10, scale: 2, nullable: true })
  rateWtSingle: number | null;

  @Column({ name: 'rate_wt_multi', type: 'decimal', precision: 10, scale: 2, nullable: true })
  rateWtMulti: number | null;

  @Column({ name: 'min_billable_lbs', type: 'decimal', precision: 10, scale: 2, nullable: true })
  minBillableLbs: number | null;

  @Column({ name: 'weight_input_unit', type: 'varchar', length: 10, default: 'lb' })
  weightInputUnit: string;

  @Column({ name: 'dim_unit', type: 'varchar', length: 10, default: 'in' })
  dimUnit: string;

  // 文本比较符（处理 >120, <175 等非纯数字阈值）
  @Column({ name: 'condition_literal', type: 'text', nullable: true })
  conditionLiteral: string | null;

  // 金额
  @Column({ name: 'amount_fixed', type: 'decimal', precision: 10, scale: 2, nullable: true })
  amountFixed: number | null;

  @Column({ name: 'amount_min', type: 'decimal', precision: 10, scale: 2, nullable: true })
  amountMin: number | null;

  @Column({ name: 'amount_max', type: 'decimal', precision: 10, scale: 2, nullable: true })
  amountMax: number | null;

  @Column({ name: 'min_base_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  minBasePrice: number | null;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({ name: 'charge_basis', type: 'varchar', length: 20, nullable: true })
  chargeBasis: string | null;

  // 复杂条件（JSONB，支持 AND/OR 嵌套）
  @Column({ name: 'conditions_json', type: 'jsonb', nullable: true })
  conditionsJson: any | null;

  // 数据质量标记
  @Column({ name: 'ingest_completeness', type: 'varchar', length: 20, default: 'FULL' })
  ingestCompleteness: string;

  // 备注
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // 审计字段
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 关系
  @ManyToOne(() => ExpressSurchargeVersion, (version) => version.rules)
  @JoinColumn({ name: 'version_id' })
  version: ExpressSurchargeVersion;

  @ManyToOne(() => ExpressCarrierService, (carrierService) => carrierService.rules)
  @JoinColumn({ name: 'carrier_service_id' })
  carrierService: ExpressCarrierService;
}
