/**
 * 快递费规则版本实体
 * Express Surcharge Version Entity
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

@Entity('dict_express_surcharge_version')
export class ExpressSurchargeVersion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'version_key', type: 'varchar', length: 50, unique: true })
  versionKey: string;

  @Column({ name: 'source_file_name', type: 'varchar', length: 200, nullable: true })
  sourceFileName: string | null;

  @Column({ name: 'effective_from', type: 'date', nullable: true })
  effectiveFrom: Date | null;

  @Column({ name: 'imported_by', type: 'varchar', length: 50, default: 'system' })
  importedBy: string;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 关系
  @OneToMany(() => ExpressSurchargeRule, (rule) => rule.version)
  rules: ExpressSurchargeRule[];

  @OneToMany(() => ExpressStackPolicy, (policy) => policy.version)
  policies: ExpressStackPolicy[];
}
