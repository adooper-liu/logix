/**
 * 拖车还箱档期占用实体
 * Trucking Return Slot Occupancy Entity
 *
 * 用于 Drop 模式下还箱日的容量约束
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn
} from 'typeorm';

@Entity('ext_trucking_return_slot_occupancy')
@Unique(['truckingCompanyId', 'slotDate'])
export class ExtTruckingReturnSlotOccupancy {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  /** 车队 ID（关联 dict_trucking_companies.id） */
  @Column({ type: 'varchar', length: 50, name: 'trucking_company_id' })
  truckingCompanyId: string;

  /** 还箱日期 */
  @Column({ type: 'date', name: 'slot_date' })
  slotDate: Date;

  /** 已计划还箱数量 */
  @Column({ type: 'int', default: 0, name: 'planned_count' })
  plannedCount: number;

  /** 总容量（来自 daily_return_capacity） */
  @Column({ type: 'int', default: 0, name: 'capacity' })
  capacity: number;

  /** 剩余可用容量 */
  @Column({ type: 'int', default: 0, name: 'remaining' })
  remaining: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
