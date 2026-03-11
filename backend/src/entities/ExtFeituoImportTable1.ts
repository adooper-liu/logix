/**
 * 飞驼导入表一实体（船公司订阅维度）
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ExtFeituoImportBatch } from './ExtFeituoImportBatch';

@Entity('ext_feituo_import_table1')
export class ExtFeituoImportTable1 {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'batch_id' })
  batchId: number;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'mbl_number' })
  mblNumber: string | null;

  @Column({ type: 'varchar', length: 50, name: 'container_number' })
  containerNumber: string;

  @Column({ type: 'jsonb', nullable: true, name: 'raw_data' })
  rawData: Record<string, unknown>;

  /** 按分组存储的原始数据，key 为分组编号 1-15，避免同名字段错位 */
  @Column({ type: 'jsonb', nullable: true, name: 'raw_data_by_group' })
  rawDataByGroup: Record<string, Record<string, unknown>> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => ExtFeituoImportBatch)
  @JoinColumn({ name: 'batch_id' })
  batch: ExtFeituoImportBatch;
}
