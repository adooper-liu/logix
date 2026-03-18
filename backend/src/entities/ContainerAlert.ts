import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export enum AlertType {
  CUSTOMS = 'customs',
  TRUCKING = 'trucking',
  UNLOADING = 'unloading',
  EMPTY_RETURN = 'emptyReturn',
  INSPECTION = 'inspection',
  DEMURRAGE = 'demurrage',
  DETENTION = 'detention',
}

@Entity('ext_container_alerts')
export class ContainerAlert {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, nullable: false })
  containerNumber: string;

  @Column({ type: 'enum', enum: AlertType, nullable: false })
  type: AlertType;

  @Column({ type: 'enum', enum: AlertLevel, nullable: false })
  level: AlertLevel;

  @Column({ type: 'text', nullable: false })
  message: string;

  @Column({ type: 'boolean', default: false })
  resolved: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  resolvedBy?: string;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
