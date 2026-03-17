/**
 * 流程定义实体
 * Flow Definition Entity
 */

import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('flow_definitions')
export class FlowDefinition {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 20, default: '1.0.0' })
  version: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  createdBy: string;

  @Column('jsonb', { default: '[]' })
  nodes: any[];

  @Column({ type: 'varchar', length: 50, nullable: true })
  startNodeId: string;

  @Column('jsonb', { nullable: true })
  variables: any[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: string;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: string;
}
