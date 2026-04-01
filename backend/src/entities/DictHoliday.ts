/**
 * 节假日字典实体
 * DictHoliday Entity
 * 
 * ✅ Phase 2 Task 2: 节假日配置表
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';

@Entity({ name: 'dict_holidays' })
@Index(['countryCode', 'holidayDate'])
@Index(['holidayDate'])
export class DictHoliday {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  /** 国家代码（如 US, CA） */
  @Column({ type: 'varchar', length: 10, name: 'country_code' })
  countryCode: string;

  /** 节假日日期 */
  @Column({ type: 'date', name: 'holiday_date' })
  holidayDate: Date;

  /** 节假日名称 */
  @Column({ type: 'varchar', length: 200, name: 'holiday_name' })
  holidayName: string;

  /** 是否每年重复 */
  @Column({ type: 'boolean', default: true, name: 'is_recurring' })
  isRecurring: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
