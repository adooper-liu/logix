/**
 * 国别字典实体
 * Country Dictionary Entity
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';

@Entity('dict_countries')
export class Country {
  @PrimaryColumn({ type: 'varchar', length: 10 })
  code!: string; // ISO国家代码 (US, CA, GB, CN等)

  @Column({ type: 'varchar', length: 100 })
  nameCn!: string; // 中文名称 (美国, 加拿大, 英国, 中国)

  @Column({ type: 'varchar', length: 100 })
  nameEn!: string; // 英文名称 (United States, Canada, United Kingdom, China)

  @Column({ type: 'varchar', length: 10, nullable: true })
  region!: string; // 区域 (NA-北美, EU-欧洲, ASIA-亚洲等)

  @Column({ type: 'varchar', length: 10, nullable: true })
  continent!: string; // 洲 (Asia, Europe, North America等)

  @Column({ type: 'varchar', length: 10, nullable: true })
  currency!: string; // 货币代码 (USD, CAD, GBP, CNY等)

  @Column({ type: 'varchar', length: 5, nullable: true })
  phoneCode!: string; // 电话区号 (+1, +44, +86等)

  @Column({ type: 'int', default: 0 })
  sortOrder!: number; // 排序

  @Column({ type: 'boolean', default: true })
  isActive!: boolean; // 是否启用

  @Column({ type: 'text', nullable: true })
  remarks!: string; // 备注

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
