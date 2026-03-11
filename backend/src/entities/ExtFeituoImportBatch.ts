/**
 * 飞驼导入批次实体
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('ext_feituo_import_batch')
export class ExtFeituoImportBatch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'smallint', name: 'table_type' })
  tableType: number; // 1=表一, 2=表二

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'file_name' })
  fileName: string | null;

  @Column({ type: 'int', default: 0, name: 'total_rows' })
  totalRows: number;

  @Column({ type: 'int', default: 0, name: 'success_count' })
  successCount: number;

  @Column({ type: 'int', default: 0, name: 'error_count' })
  errorCount: number;

  @Column({ type: 'jsonb', nullable: true, name: 'error_details' })
  errorDetails: unknown;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
