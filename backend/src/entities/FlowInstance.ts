/**
 * 流程实例实体
 * Flow Instance Entity
 */

import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('flow_instances')
export class FlowInstance {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 50 })
  flowId: string;

  @Column({ type: 'varchar', length: 20 })
  status: 'running' | 'completed' | 'failed' | 'paused';

  @Column('jsonb')
  variables: Record<string, any>;

  @Column({ type: 'varchar', length: 50 })
  currentNodeId: string;

  @Column('jsonb')
  executionHistory: any[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: string;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: string;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: string | null;
}
