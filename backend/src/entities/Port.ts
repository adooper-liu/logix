/**
 * 港口字典实体
 * Port Entity
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';

@Entity('dict_ports')
export class Port {
  @PrimaryColumn({ type: 'varchar', length: 50, name: 'port_code' })
  portCode: string;

  @Column({ type: 'varchar', length: 50, name: 'port_name' })
  portName: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'port_name_en' })
  portNameEn?: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'port_type' })
  portType?: string; // PORT/TERMINAL/RAIL

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'country' })
  country?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'state' })
  state?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'city' })
  city?: string;

  @Column({ type: 'int', nullable: true, name: 'timezone' })
  timezone?: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true, name: 'latitude' })
  latitude?: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true, name: 'longitude' })
  longitude?: number;

  @Column({ type: 'boolean', default: true, nullable: true, name: 'support_export' })
  supportExport?: boolean; // 支持出口

  @Column({ type: 'boolean', default: true, nullable: true, name: 'support_import' })
  supportImport?: boolean; // 支持进口

  @Column({ type: 'boolean', default: true, nullable: true, name: 'support_container_only' })
  supportContainerOnly?: boolean; // 仅支持箱号查询

  @Column({ type: 'varchar', length: 10, default: 'ACTIVE', name: 'status' })
  status: string;

  @Column({ type: 'text', nullable: true, name: 'remarks' })
  remarks?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
