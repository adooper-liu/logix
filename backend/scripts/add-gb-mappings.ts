import { AppDataSource } from '../src/database';
import { initDatabase, closeDatabase } from '../src/database';

async function main() {
  try {
    // 初始化数据库连接
    await initDatabase();
    console.log('✅ 数据库连接成功');
    
    // 检查是否已存在 GB 相关的映射记录
    console.log('\n=== 检查现有 GB 映射记录 ===');
    const existingPortMappings = await AppDataSource.query(
      'SELECT COUNT(*) as count FROM dict_trucking_port_mapping WHERE country = \'GB\''
    );
    const existingWarehouseMappings = await AppDataSource.query(
      'SELECT COUNT(*) as count FROM dict_warehouse_trucking_mapping WHERE country = \'GB\''
    );
    
    console.log(`现有港口映射记录数: ${existingPortMappings[0]?.count || 0}`);
    console.log(`现有仓库映射记录数: ${existingWarehouseMappings[0]?.count || 0}`);
    
    if (parseInt(existingPortMappings[0]?.count || '0') > 0 && parseInt(existingWarehouseMappings[0]?.count || '0') > 0) {
      console.log('\n✅ 已经存在 GB 相关的映射记录，无需添加');
      await closeDatabase();
      return;
    }
    
    // 添加 GB 相关的车队记录
    console.log('\n=== 添加 GB 车队记录 ===');
    const truckingCompanies = [
      {
        company_code: 'TRUCK_GB_001',
        company_name: 'UK Trucking Ltd',
        company_name_en: 'UK Trucking Ltd',
        country: 'GB',
        contact_phone: '1122334455',
        contact_email: 'info@uktrucking.com',
        daily_capacity: 25,
        daily_return_capacity: 20,
        has_yard: true,
        yard_daily_capacity: 50,
        status: 'ACTIVE',
        remarks: 'GB 车队'
      },
      {
        company_code: 'TRUCK_GB_002',
        company_name: 'British Logistics',
        company_name_en: 'British Logistics',
        country: 'GB',
        contact_phone: '5544332211',
        contact_email: 'info@britishlogistics.com',
        daily_capacity: 20,
        daily_return_capacity: 15,
        has_yard: false,
        yard_daily_capacity: 0,
        status: 'ACTIVE',
        remarks: 'GB 车队'
      }
    ];
    
    for (const company of truckingCompanies) {
      // 检查车队是否已存在
      const existing = await AppDataSource.query(
        'SELECT company_code FROM dict_trucking_companies WHERE company_code = $1',
        [company.company_code]
      );
      
      if (existing.length === 0) {
        await AppDataSource.query(
          `INSERT INTO dict_trucking_companies 
           (company_code, company_name, company_name_en, country, contact_phone, 
            contact_email, daily_capacity, daily_return_capacity, has_yard, yard_daily_capacity, 
            status, remarks, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
          [
            company.company_code,
            company.company_name,
            company.company_name_en,
            company.country,
            company.contact_phone,
            company.contact_email,
            company.daily_capacity,
            company.daily_return_capacity,
            company.has_yard,
            company.yard_daily_capacity,
            company.status,
            company.remarks
          ]
        );
        console.log(`✅ 添加车队: ${company.company_name}`);
      } else {
        console.log(`⚠️  车队已存在，跳过: ${company.company_name}`);
      }
    }
    
    // 添加 GB 相关的仓库记录
    console.log('\n=== 添加 GB 仓库记录 ===');
    const warehouses = [
      {
        warehouse_code: 'GB-W001',
        warehouse_name: 'London Warehouse',
        warehouse_name_en: 'London Warehouse',
        short_name: 'London',
        property_type: '自营仓',
        warehouse_type: 'WAREHOUSE',
        company_code: 'GB_COMPANY',
        address: 'London, UK',
        city: 'London',
        state: '',
        country: 'GB',
        contact_phone: '1234567890',
        contact_email: 'info@londonwarehouse.com',
        daily_unload_capacity: 20,
        status: 'ACTIVE',
        remarks: 'GB 仓库'
      },
      {
        warehouse_code: 'GB-W002',
        warehouse_name: 'Manchester Warehouse',
        warehouse_name_en: 'Manchester Warehouse',
        short_name: 'Manchester',
        property_type: '第三方仓',
        warehouse_type: 'WAREHOUSE',
        company_code: 'GB_COMPANY',
        address: 'Manchester, UK',
        city: 'Manchester',
        state: '',
        country: 'GB',
        contact_phone: '0987654321',
        contact_email: 'info@manchesterwarehouse.com',
        daily_unload_capacity: 15,
        status: 'ACTIVE',
        remarks: 'GB 仓库'
      }
    ];
    
    for (const warehouse of warehouses) {
      // 检查仓库是否已存在
      const existing = await AppDataSource.query(
        'SELECT warehouse_code FROM dict_warehouses WHERE warehouse_code = $1',
        [warehouse.warehouse_code]
      );
      
      if (existing.length === 0) {
        await AppDataSource.query(
          `INSERT INTO dict_warehouses 
           (warehouse_code, warehouse_name, warehouse_name_en, short_name, property_type, 
            warehouse_type, address, city, state, country, 
            contact_phone, contact_email, daily_unload_capacity, status, remarks, 
            created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())`,
          [
            warehouse.warehouse_code,
            warehouse.warehouse_name,
            warehouse.warehouse_name_en,
            warehouse.short_name,
            warehouse.property_type,
            warehouse.warehouse_type,
            warehouse.address,
            warehouse.city,
            warehouse.state,
            warehouse.country,
            warehouse.contact_phone,
            warehouse.contact_email,
            warehouse.daily_unload_capacity,
            warehouse.status,
            warehouse.remarks
          ]
        );
        console.log(`✅ 添加仓库: ${warehouse.warehouse_name}`);
      } else {
        console.log(`⚠️  仓库已存在，跳过: ${warehouse.warehouse_name}`);
      }
    }
    
    // 添加 GB 相关的港口映射记录
    console.log('\n=== 添加 GB 港口映射记录 ===');
    const portMappings = [
      {
        country: 'GB',
        trucking_company_id: 'TRUCK_GB_001',
        trucking_company_name: 'UK Trucking Ltd',
        port_code: 'GBFXT',
        port_name: 'GBFXT',
        yard_capacity: 50,
        standard_rate: 100,
        yard_operation_fee: 50,
        transport_fee: 150,
        unit: 'USD',
        mapping_type: 'DEFAULT',
        is_default: true,
        is_active: true,
        remarks: 'GB 港口映射'
      },
      {
        country: 'GB',
        trucking_company_id: 'TRUCK_GB_002',
        trucking_company_name: 'British Logistics',
        port_code: 'GBFXT',
        port_name: 'GBFXT',
        yard_capacity: 40,
        standard_rate: 90,
        yard_operation_fee: 45,
        transport_fee: 140,
        unit: 'USD',
        mapping_type: 'DEFAULT',
        is_default: false,
        is_active: true,
        remarks: 'GB 港口映射'
      }
    ];
    
    for (const mapping of portMappings) {
      // 检查港口映射是否已存在
      const existing = await AppDataSource.query(
        'SELECT id FROM dict_trucking_port_mapping WHERE country = $1 AND trucking_company_id = $2 AND port_code = $3',
        [mapping.country, mapping.trucking_company_id, mapping.port_code]
      );
      
      if (existing.length === 0) {
        await AppDataSource.query(
          `INSERT INTO dict_trucking_port_mapping 
           (country, trucking_company_id, trucking_company_name, port_code, port_name, 
            yard_capacity, standard_rate, yard_operation_fee, transport_fee, unit, 
            mapping_type, is_default, is_active, remarks, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())`,
          [
            mapping.country,
            mapping.trucking_company_id,
            mapping.trucking_company_name,
            mapping.port_code,
            mapping.port_name,
            mapping.yard_capacity,
            mapping.standard_rate,
            mapping.yard_operation_fee,
            mapping.transport_fee,
            mapping.unit,
            mapping.mapping_type,
            mapping.is_default,
            mapping.is_active,
            mapping.remarks
          ]
        );
        console.log(`✅ 添加港口映射: ${mapping.trucking_company_name} - ${mapping.port_code}`);
      } else {
        console.log(`⚠️  港口映射已存在，跳过: ${mapping.trucking_company_name} - ${mapping.port_code}`);
      }
    }
    
    // 添加 GB 相关的仓库映射记录
    console.log('\n=== 添加 GB 仓库映射记录 ===');
    const warehouseMappings = [
      {
        country: 'GB',
        warehouse_code: 'GB-W001',
        warehouse_name: 'London Warehouse',
        trucking_company_id: 'TRUCK_GB_001',
        trucking_company_name: 'UK Trucking Ltd',
        transport_fee: 150,
        mapping_type: 'DEFAULT',
        is_default: true,
        is_active: true,
        remarks: 'GB 仓库映射'
      },
      {
        country: 'GB',
        warehouse_code: 'GB-W002',
        warehouse_name: 'Manchester Warehouse',
        trucking_company_id: 'TRUCK_GB_001',
        trucking_company_name: 'UK Trucking Ltd',
        transport_fee: 160,
        mapping_type: 'DEFAULT',
        is_default: false,
        is_active: true,
        remarks: 'GB 仓库映射'
      },
      {
        country: 'GB',
        warehouse_code: 'GB-W001',
        warehouse_name: 'London Warehouse',
        trucking_company_id: 'TRUCK_GB_002',
        trucking_company_name: 'British Logistics',
        transport_fee: 145,
        mapping_type: 'DEFAULT',
        is_default: false,
        is_active: true,
        remarks: 'GB 仓库映射'
      }
    ];
    
    for (const mapping of warehouseMappings) {
      // 检查仓库映射是否已存在
      const existing = await AppDataSource.query(
        'SELECT id FROM dict_warehouse_trucking_mapping WHERE country = $1 AND warehouse_code = $2 AND trucking_company_id = $3',
        [mapping.country, mapping.warehouse_code, mapping.trucking_company_id]
      );
      
      if (existing.length === 0) {
        await AppDataSource.query(
          `INSERT INTO dict_warehouse_trucking_mapping 
           (country, warehouse_code, warehouse_name, trucking_company_id, trucking_company_name, 
            transport_fee, mapping_type, is_default, is_active, remarks, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
          [
            mapping.country,
            mapping.warehouse_code,
            mapping.warehouse_name,
            mapping.trucking_company_id,
            mapping.trucking_company_name,
            mapping.transport_fee,
            mapping.mapping_type,
            mapping.is_default,
            mapping.is_active,
            mapping.remarks
          ]
        );
        console.log(`✅ 添加仓库映射: ${mapping.warehouse_name} - ${mapping.trucking_company_name}`);
      } else {
        console.log(`⚠️  仓库映射已存在，跳过: ${mapping.warehouse_name} - ${mapping.trucking_company_name}`);
      }
    }
    
    console.log('\n✅ GB 相关映射记录添加完成');
    
  } catch (error) {
    console.error('添加 GB 映射记录时发生错误:', error);
  } finally {
    // 关闭数据库连接
    try {
      await closeDatabase();
      console.log('\n✅ 数据库连接已关闭');
    } catch (error) {
      console.error('关闭数据库连接时发生错误:', error);
    }
  }
}

main();
