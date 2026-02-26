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
  @PrimaryColumn({ type: 'varchar', length: 10, name: 'code' })
  code!: string; // ISO国家代码 (US, CA, GB, CN等)

  @Column({ type: 'varchar', length: 50, name: 'name_cn' })
  nameCn!: string; // 中文名称 (美国, 加拿大, 英国, 中国)

  @Column({ type: 'varchar', length: 50, name: 'name_en' })
  nameEn!: string; // 英文名称 (United States, Canada, United Kingdom, China)

  @Column({ type: 'varchar', length: 10, nullable: true, name: 'region' })
  region!: string; // 区域 (NA-北美, EU-欧洲, ASIA-亚洲等)

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'continent' })
  continent!: string; // 洲 (Asia, Europe, North America等)

  @Column({ type: 'varchar', length: 10, nullable: true, name: 'currency' })
  currency!: string; // 货币代码 (USD, CAD, GBP, CNY等)

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'phone_code' })
  phoneCode!: string; // 电话区号 (+1, +44, +86等)

  @Column({ type: 'int', default: 0, name: 'sort_order' })
  sortOrder!: number; // 排序

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean; // 是否启用

  @Column({ type: 'text', nullable: true, name: 'remarks' })
  remarks!: string; // 备注

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
