import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany
} from 'typeorm';
import { InspectionEvent } from './InspectionEvent';

@Entity('ext_inspection_records')
export class InspectionRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'container_number', type: 'varchar', length: 50, nullable: false })
  containerNumber: string;

  @Column({ name: 'inspection_notice_date', type: 'timestamp', nullable: true })
  inspectionNoticeDate: Date;

  @Column({ name: 'inspection_planned_date', type: 'timestamp', nullable: true })
  inspectionPlannedDate: Date;

  @Column({ name: 'inspection_date', type: 'timestamp', nullable: true })
  inspectionDate: Date;

  @Column({ name: 'inspection_type', type: 'varchar', length: 50, nullable: true })
  inspectionType: string;

  @Column({ name: 'inspection_skus', type: 'jsonb', nullable: true })
  inspectionSkus: string[];

  @Column({ name: 'customs_question', type: 'text', nullable: true })
  customsQuestion: string;

  @Column({ name: 'customs_requirement', type: 'text', nullable: true })
  customsRequirement: string;

  @Column({ name: 'customs_deadline', type: 'varchar', length: 100, nullable: true })
  customsDeadline: string;

  @Column({ name: 'pre_shipment_risk_assessment', type: 'text', nullable: true })
  preShipmentRiskAssessment: string;

  @Column({ name: 'response_measures', type: 'text', nullable: true })
  responseMeasures: string;

  @Column({ name: 'customs_final_decision', type: 'text', nullable: true })
  customsFinalDecision: string;

  @Column({ name: 'latest_status', type: 'text', nullable: true })
  latestStatus: string;

  @Column({ name: 'customs_clearance_status', type: 'varchar', length: 50, nullable: true })
  customsClearanceStatus: string;

  @Column({ name: 'demurrage_fee', type: 'decimal', precision: 10, scale: 2, nullable: true })
  demurrageFee: number;

  @Column({ name: 'responsibility_determination', type: 'text', nullable: true })
  responsibilityDetermination: string;

  @Column({ name: 'remarks', type: 'text', nullable: true })
  remarks: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'updated_by', type: 'varchar', length: 100, nullable: true })
  updatedBy: string;

  @Column({ name: 'data_source', type: 'varchar', length: 20, nullable: true })
  dataSource: string;

  @OneToMany(() => InspectionEvent, (event) => event.inspectionRecord)
  events: InspectionEvent[];
}
