import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { PricingScheme } from './PricingScheme';
import { ZoneLaneMapping } from './ZoneLaneMapping';

@Entity('dict_pricing_version')
export class PricingVersion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'version_key', type: 'varchar', length: 32, unique: true })
  versionKey: string;

  @Column({ name: 'effective_from', type: 'timestamptz' })
  effectiveFrom: Date;

  @Column({ name: 'effective_to', type: 'timestamptz', nullable: true })
  effectiveTo: Date | null;

  @Column({ type: 'varchar', length: 16, default: 'ACTIVE' })
  status: string;

  @Column({ name: 'source_file_name', type: 'text', nullable: true })
  sourceFileName: string | null;

  @Column({ name: 'imported_by', type: 'varchar', length: 64, nullable: true })
  importedBy: string | null;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => PricingScheme, (scheme) => scheme.version)
  schemes: PricingScheme[];

  @OneToMany(() => ZoneLaneMapping, (mapping) => mapping.version)
  zoneLaneMappings: ZoneLaneMapping[];
}

