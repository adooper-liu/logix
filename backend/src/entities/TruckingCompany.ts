/**
 * 拖车公司字典实体
 * Trucking Company Entity
 */

import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('dict_trucking_companies')
export class TruckingCompany {
  @PrimaryColumn({ type: 'varchar', length: 50, name: 'company_code' })
  companyCode: string;

  @Column({ type: 'varchar', length: 100, name: 'company_name' })
  companyName: string;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'company_name_en' })
  companyNameEn?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'contact_phone' })
  contactPhone?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'contact_email' })
  contactEmail?: string;

  @Column({ type: 'varchar', length: 10, default: 'ACTIVE', name: 'status' })
  status: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'country' })
  country?: string;

  /** 日容量（趟/天），用于智能排产占用校验，无则默认 10 */
  @Column({ type: 'int', default: 10, nullable: true, name: 'daily_capacity' })
  dailyCapacity?: number;

  /** 每日还箱能力（柜数），用于 Drop 模式还箱日约束；NULL 表示与 daily_capacity 共用 */
  @Column({ type: 'int', nullable: true, name: 'daily_return_capacity' })
  dailyReturnCapacity?: number;

  /** 是否有堆场：true=支持 Drop 模式（提<送）；false=必须 Live 模式（提=送=卸） */
  @Column({ type: 'boolean', default: false, name: 'has_yard' })
  hasYard: boolean;

  /** 堆场每日可容纳柜数（有堆场时有效） */
  @Column({ type: 'int', nullable: true, name: 'yard_daily_capacity' })
  yardDailyCapacity?: number;

  @Column({ type: 'text', nullable: true, name: 'remarks' })
  remarks?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
