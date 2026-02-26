/**
 * 实体与数据库字段一致性验证脚本
 * 用于确保所有实体定义与数据库表结构完全一致
 */

import { AppDataSource } from '../src/database';
import { ShippingCompany } from '../src/entities/ShippingCompany';
import { FreightForwarder } from '../src/entities/FreightForwarder';
import { Port } from '../src/entities/Port';
import { TruckingCompany } from '../src/entities/TruckingCompany';
import { logger } from '../src/utils/logger';

interface FieldMapping {
  entityField: string;
  dbField: string;
  type: string;
  isPrimary: boolean;
}

async function verifyEntityConsistency() {
  await AppDataSource.initialize();

  console.log('='.repeat(80));
  console.log('实体与数据库字段一致性验证');
  console.log('='.repeat(80));

  const entities = [
    {
      name: 'ShippingCompany',
      entity: ShippingCompany,
      tableName: 'dict_shipping_companies',
      expectedFields: [
        { entityField: 'companyCode', dbField: 'company_code', type: 'varchar', isPrimary: true },
        { entityField: 'companyName', dbField: 'company_name', type: 'varchar', isPrimary: false },
        { entityField: 'companyNameEn', dbField: 'company_name_en', type: 'varchar', isPrimary: false },
        { entityField: 'scacCode', dbField: 'scac_code', type: 'varchar', isPrimary: false },
        { entityField: 'apiProvider', dbField: 'api_provider', type: 'varchar', isPrimary: false },
        { entityField: 'supportBooking', dbField: 'support_booking', type: 'boolean', isPrimary: false },
        { entityField: 'supportBillOfLading', dbField: 'support_bill_of_lading', type: 'boolean', isPrimary: false },
        { entityField: 'supportContainer', dbField: 'support_container', type: 'boolean', isPrimary: false },
        { entityField: 'websiteUrl', dbField: 'website_url', type: 'varchar', isPrimary: false },
        { entityField: 'contactPhone', dbField: 'contact_phone', type: 'varchar', isPrimary: false },
        { entityField: 'contactEmail', dbField: 'contact_email', type: 'varchar', isPrimary: false },
        { entityField: 'status', dbField: 'status', type: 'varchar', isPrimary: false },
        { entityField: 'remarks', dbField: 'remarks', type: 'text', isPrimary: false },
        { entityField: 'createdAt', dbField: 'created_at', type: 'timestamp', isPrimary: false },
        { entityField: 'updatedAt', dbField: 'updated_at', type: 'timestamp', isPrimary: false },
      ]
    },
    {
      name: 'FreightForwarder',
      entity: FreightForwarder,
      tableName: 'dict_freight_forwarders',
      expectedFields: [
        { entityField: 'forwarderCode', dbField: 'forwarder_code', type: 'varchar', isPrimary: true },
        { entityField: 'forwarderName', dbField: 'forwarder_name', type: 'varchar', isPrimary: false },
        { entityField: 'forwarderNameEn', dbField: 'forwarder_name_en', type: 'varchar', isPrimary: false },
        { entityField: 'contactPhone', dbField: 'contact_phone', type: 'varchar', isPrimary: false },
        { entityField: 'contactEmail', dbField: 'contact_email', type: 'varchar', isPrimary: false },
        { entityField: 'status', dbField: 'status', type: 'varchar', isPrimary: false },
        { entityField: 'remarks', dbField: 'remarks', type: 'text', isPrimary: false },
        { entityField: 'createdAt', dbField: 'created_at', type: 'timestamp', isPrimary: false },
        { entityField: 'updatedAt', dbField: 'updated_at', type: 'timestamp', isPrimary: false },
      ]
    },
    {
      name: 'Port',
      entity: Port,
      tableName: 'dict_ports',
      expectedFields: [
        { entityField: 'portCode', dbField: 'port_code', type: 'varchar', isPrimary: true },
        { entityField: 'portName', dbField: 'port_name', type: 'varchar', isPrimary: false },
        { entityField: 'portNameEn', dbField: 'port_name_en', type: 'varchar', isPrimary: false },
        { entityField: 'portType', dbField: 'port_type', type: 'varchar', isPrimary: false },
        { entityField: 'country', dbField: 'country', type: 'varchar', isPrimary: false },
        { entityField: 'state', dbField: 'state', type: 'varchar', isPrimary: false },
        { entityField: 'city', dbField: 'city', type: 'varchar', isPrimary: false },
        { entityField: 'timezone', dbField: 'timezone', type: 'int', isPrimary: false },
        { entityField: 'latitude', dbField: 'latitude', type: 'decimal', isPrimary: false },
        { entityField: 'longitude', dbField: 'longitude', type: 'decimal', isPrimary: false },
        { entityField: 'supportExport', dbField: 'support_export', type: 'boolean', isPrimary: false },
        { entityField: 'supportImport', dbField: 'support_import', type: 'boolean', isPrimary: false },
        { entityField: 'supportContainerOnly', dbField: 'support_container_only', type: 'boolean', isPrimary: false },
        { entityField: 'status', dbField: 'status', type: 'varchar', isPrimary: false },
        { entityField: 'remarks', dbField: 'remarks', type: 'text', isPrimary: false },
        { entityField: 'createdAt', dbField: 'created_at', type: 'timestamp', isPrimary: false },
        { entityField: 'updatedAt', dbField: 'updated_at', type: 'timestamp', isPrimary: false },
      ]
    },
    {
      name: 'TruckingCompany',
      entity: TruckingCompany,
      tableName: 'dict_trucking_companies',
      expectedFields: [
        { entityField: 'companyCode', dbField: 'company_code', type: 'varchar', isPrimary: true },
        { entityField: 'companyName', dbField: 'company_name', type: 'varchar', isPrimary: false },
        { entityField: 'companyNameEn', dbField: 'company_name_en', type: 'varchar', isPrimary: false },
        { entityField: 'contactPhone', dbField: 'contact_phone', type: 'varchar', isPrimary: false },
        { entityField: 'contactEmail', dbField: 'contact_email', type: 'varchar', isPrimary: false },
        { entityField: 'status', dbField: 'status', type: 'varchar', isPrimary: false },
        { entityField: 'remarks', dbField: 'remarks', type: 'text', isPrimary: false },
        { entityField: 'createdAt', dbField: 'created_at', type: 'timestamp', isPrimary: false },
        { entityField: 'updatedAt', dbField: 'updated_at', type: 'timestamp', isPrimary: false },
      ]
    }
  ];

  let totalIssues = 0;

  for (const entityInfo of entities) {
    console.log(`\n验证实体: ${entityInfo.name} (${entityInfo.tableName})`);
    console.log('-'.repeat(80));

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // 获取表结构
      const tableInfo = await queryRunner.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = '${entityInfo.tableName}'
        ORDER BY ordinal_position
      `);

      const dbColumns = new Map(tableInfo.map((row: any) => [row.column_name, row.data_type]));

      for (const field of entityInfo.expectedFields) {
        const existsInDB = dbColumns.has(field.dbField);
        const dbType = dbColumns.get(field.dbField);

        if (!existsInDB) {
          console.log(`  ❌ 字段缺失: ${field.entityField} -> ${field.dbField}`);
          totalIssues++;
        } else if (dbType && !dbType.includes(field.type.substring(0, 3))) {
          console.log(`  ⚠️  类型不匹配: ${field.entityField} -> ${field.dbField} (实体: ${field.type}, 数据库: ${dbType})`);
          totalIssues++;
        } else {
          console.log(`  ✅ ${field.entityField} -> ${field.dbField} (${dbType})`);
        }
      }

      // 检查数据库中是否有实体未定义的字段
      const entityFields = new Set(entityInfo.expectedFields.map(f => f.dbField));
      for (const [dbField, dbType] of dbColumns.entries()) {
        if (!entityFields.has(dbField)) {
          console.log(`  ⚠️  数据库多余字段: ${dbField} (${dbType})`);
          totalIssues++;
        }
      }

    } finally {
      await queryRunner.release();
    }
  }

  console.log('\n' + '='.repeat(80));
  if (totalIssues === 0) {
    console.log('✅ 所有实体与数据库字段完全一致！');
  } else {
    console.log(`❌ 发现 ${totalIssues} 个问题，需要修复`);
  }
  console.log('='.repeat(80));

  await AppDataSource.destroy();
}

verifyEntityConsistency().catch(error => {
  console.error('验证失败:', error);
  process.exit(1);
});
