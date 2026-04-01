/**
 * 飞驼导入表二实体（码头港区维度）
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { ExtFeituoImportBatch } from './ExtFeituoImportBatch';

@Entity('ext_feituo_import_table2')
export class ExtFeituoImportTable2 {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'batch_id' })
  batchId: number;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'bill_number' })
  billNumber: string | null;

  @Column({ type: 'varchar', length: 50, name: 'container_number' })
  containerNumber: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'port_code' })
  portCode: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'terminal_code' })
  terminalCode: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'raw_data' })
  rawData: Record<string, unknown>;

  /** 按分组存储的原始数据，key 为分组编号 1-17，避免同名字段错位 */
  @Column({ type: 'jsonb', nullable: true, name: 'raw_data_by_group' })
  rawDataByGroup: Record<string, Record<string, unknown>> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => ExtFeituoImportBatch)
  @JoinColumn({ name: 'batch_id' })
  batch: ExtFeituoImportBatch;
}
