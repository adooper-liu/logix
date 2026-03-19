/**
 * 飞驼地点原始数据实体
 * 存储飞驼API places[] 原始数据
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('ext_feituo_places')
@Index('idx_feituo_places_container', ['containerNumber'])
@Index('idx_feituo_places_bol', ['billOfLadingNumber'])
@Index('idx_feituo_places_type', ['placeType'])
@Index('idx_feituo_places_created', ['createdAt'])
export class ExtFeituoPlace {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, name: 'container_number' })
  containerNumber: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'bill_of_lading_number' })
  billOfLadingNumber: string | null;

  // 地点基本信息
  @Column({ type: 'int', name: 'place_index' })
  placeIndex: number;

  @Column({ type: 'int', name: 'place_type' })
  placeType: number;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'port_code' })
  portCode: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'port_name' })
  portName: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'port_name_en' })
  portNameEn: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'port_name_cn' })
  portNameCn: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'name_origin' })
  nameOrigin: string | null;

  // 原始时间字段
  @Column({ type: 'timestamptz', nullable: true })
  sta: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  eta: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  ata: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'ata_ais' })
  ataAis: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'atb_ais' })
  atbAis: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  disc: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  std: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  etd: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  atd: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'atd_ais' })
  atdAis: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'atbd_ais' })
  atbdAis: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  load: Date | null;

  // 运输信息
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'vessel_name' })
  vesselName: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'voyage_number' })
  voyageNumber: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'transport_mode_in' })
  transportModeIn: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'transport_mode_out' })
  transportModeOut: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'terminal_name' })
  terminalName: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'container_count_in' })
  containerCountIn: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'container_count_out' })
  containerCountOut: string | null;

  // 坐标与时区
  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  longitude: number | null;

  @Column({ type: 'varchar', length: 10, nullable: true, name: 'port_timezone' })
  portTimezone: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'firms_code' })
  firmsCode: string | null;

  // 元数据
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'sync_request_id' })
  syncRequestId: string | null;

  @Column({ type: 'varchar', length: 50, default: 'API', name: 'data_source' })
  dataSource: string;

  @Column({ type: 'jsonb' })
  rawJson: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
