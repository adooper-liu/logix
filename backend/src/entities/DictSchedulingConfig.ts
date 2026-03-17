/**
 * 智能排柜系统配置实体
 * Scheduling Config Entity
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn
} from 'typeorm';

@Entity('dict_scheduling_config')
@Unique(['configKey'])
export class DictSchedulingConfig {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  /** 配置键 */
  @Column({ type: 'varchar', length: 64, name: 'config_key' })
  configKey: string;

  /** 配置值 */
  @Column({ type: 'text', name: 'config_value', nullable: true })
  configValue?: string;

  /** 配置说明 */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'description' })
  description?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
