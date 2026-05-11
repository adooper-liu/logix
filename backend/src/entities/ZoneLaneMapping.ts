import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { PricingVersion } from './PricingVersion';

@Entity('dict_zone_lane_mapping')
export class ZoneLaneMapping {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'version_id', type: 'int' })
  versionId: number;

  @Column({ name: 'country_code', type: 'varchar', length: 8 })
  countryCode: string;

  @Column({ name: 'mapping_type', type: 'varchar', length: 16 })
  mappingType: string;

  @Column({ name: 'origin_code', type: 'varchar', length: 32, nullable: true })
  originCode: string | null;

  @Column({ name: 'destination_code', type: 'varchar', length: 32, nullable: true })
  destinationCode: string | null;

  @Column({ name: 'postal_prefix_from', type: 'varchar', length: 16, nullable: true })
  postalPrefixFrom: string | null;

  @Column({ name: 'postal_prefix_to', type: 'varchar', length: 16, nullable: true })
  postalPrefixTo: string | null;

  @Column({ name: 'zone_code', type: 'varchar', length: 16, nullable: true })
  zoneCode: string | null;

  @Column({ name: 'lane_code', type: 'varchar', length: 32, nullable: true })
  laneCode: string | null;

  @Column({ name: 'distance_km', type: 'decimal', precision: 10, scale: 2, nullable: true })
  distanceKm: number | null;

  @Column({ name: 'conditions_json', type: 'jsonb', default: () => "'{}'::jsonb" })
  conditionsJson: Record<string, any>;

  @Column({ type: 'int', default: 100 })
  priority: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => PricingVersion, (version) => version.zoneLaneMappings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'version_id' })
  version: PricingVersion;
}

