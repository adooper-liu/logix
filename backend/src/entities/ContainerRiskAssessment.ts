import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('ext_container_risk_assessments')
export class ContainerRiskAssessment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, nullable: false })
  containerNumber: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: false })
  riskScore: number;

  @Column({ type: 'enum', enum: RiskLevel, nullable: false })
  riskLevel: RiskLevel;

  @Column({ type: 'jsonb', nullable: true })
  riskFactors?: {
    factor: string;
    score: number;
    description: string;
  }[];

  @Column({ type: 'text', nullable: true })
  recommendation?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
