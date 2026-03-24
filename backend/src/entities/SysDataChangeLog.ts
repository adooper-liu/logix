/**
 * 数据变更日志实体
 * Sys Data Change Log Entity
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn
} from 'typeorm';

export type SourceType =
  | 'excel_import'
  | 'feituo_api'
  | 'feituo_excel'
  | 'feituo_sync'
  | 'feituo_excel_import'
  | 'manual'
  | 'status_update';
export type ActionType = 'INSERT' | 'UPDATE' | 'DELETE';

@Entity('sys_data_change_log')
export class SysDataChangeLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 32, name: 'source_type' })
  sourceType: SourceType;

  @Column({ type: 'varchar', length: 64, name: 'entity_type' })
  entityType: string;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'entity_id' })
  entityId: string | null;

  @Column({ type: 'varchar', length: 16, name: 'action' })
  action: ActionType;

  @Column({ type: 'jsonb', nullable: true, name: 'changed_fields' })
  changedFields: Record<string, { old?: unknown; new?: unknown }> | null;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'batch_id' })
  batchId: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'operator_id' })
  operatorId: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'operator_ip' })
  operatorIp: string | null;

  @Column({ type: 'text', nullable: true, name: 'remark' })
  remark: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
