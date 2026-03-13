import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { InspectionRecord } from './InspectionRecord';

@Entity('ext_inspection_events')
export class InspectionEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'inspection_record_id', type: 'integer', nullable: false })
  inspectionRecordId: number;

  @Column({ name: 'event_date', type: 'timestamp', nullable: false })
  eventDate: Date;

  @Column({ name: 'event_status', type: 'text', nullable: false })
  eventStatus: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => InspectionRecord, record => record.events)
  @JoinColumn({ name: 'inspection_record_id' })
  inspectionRecord: InspectionRecord;
}
