/**
 * 插入 E2E 测试数据
 * Insert E2E Test Data
 *
 * 用途：为成本优化功能的 E2E 测试准备测试货柜数据
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { DataSource } from 'typeorm';

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function insertTestData() {
  console.log('🚀 开始插入 E2E 测试数据...\n');

  // 创建数据库连接
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'logix'
  });

  try {
    await dataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    const queryRunner = dataSource.createQueryRunner();

    // 1. 检查车队是否存在
    console.log('📋 检查车队 TRUCK001...');
    const truckingExists = await queryRunner.query(
      "SELECT id FROM dict_trucking_companies WHERE company_code = 'TRUCK001' LIMIT 1"
    );

    let truckingCompanyId: string;
    if (truckingExists.length > 0) {
      truckingCompanyId = truckingExists[0].id;
      console.log(`   ✅ 车队已存在，ID: ${truckingCompanyId}`);
    } else {
      console.log('   ⚠️  车队不存在，使用第一个可用的车队');
      const firstTrucking = await queryRunner.query(
        'SELECT id, company_code FROM dict_trucking_companies LIMIT 1'
      );
      if (firstTrucking.length === 0) {
        throw new Error('❌ 数据库中没有任何车队数据');
      }
      truckingCompanyId = firstTrucking[0].id;
      console.log(`   ✅ 使用车队: ${firstTrucking[0].company_code}, ID: ${truckingCompanyId}`);
    }

    // 2. 检查仓库是否存在
    console.log('\n📋 检查仓库 WH001...');
    const warehouseExists = await queryRunner.query(
      "SELECT warehouse_code FROM dict_warehouses WHERE warehouse_code = 'WH001' LIMIT 1"
    );

    let warehouseCode: string;
    if (warehouseExists.length > 0) {
      warehouseCode = warehouseExists[0].warehouse_code;
      console.log(`   ✅ 仓库已存在: ${warehouseCode}`);
    } else {
      console.log('   ⚠️  仓库不存在，使用第一个可用的仓库');
      const firstWarehouse = await queryRunner.query(
        'SELECT warehouse_code FROM dict_warehouses LIMIT 1'
      );
      if (firstWarehouse.length === 0) {
        throw new Error('❌ 数据库中没有任何仓库数据');
      }
      warehouseCode = firstWarehouse[0].warehouse_code;
      console.log(`   ✅ 使用仓库: ${warehouseCode}`);
    }

    // 3. 检查港口是否存在
    console.log('\n📋 检查港口 USLAX...');
    const portExists = await queryRunner.query(
      "SELECT port_code FROM dict_ports WHERE port_code = 'USLAX' LIMIT 1"
    );

    let portCode: string;
    if (portExists.length > 0) {
      portCode = portExists[0].port_code;
      console.log(`   ✅ 港口已存在: ${portCode}`);
    } else {
      console.log('   ⚠️  港口不存在，使用第一个可用的目的港');
      const firstPort = await queryRunner.query(
        "SELECT port_code FROM dict_ports WHERE port_type = 'destination' LIMIT 1"
      );
      if (firstPort.length === 0) {
        throw new Error('❌ 数据库中没有任何目的港数据');
      }
      portCode = firstPort[0].port_code;
      console.log(`   ✅ 使用港口: ${portCode}`);
    }

    // 4. 删除可能存在的旧测试数据
    console.log('\n🗑️  清理旧测试数据...');
    const testContainerNumber = 'TEST_E2E_001';

    await queryRunner.query('DELETE FROM ext_container_status_events WHERE container_number = $1', [
      testContainerNumber
    ]);
    await queryRunner.query('DELETE FROM process_empty_return WHERE container_number = $1', [
      testContainerNumber
    ]);
    await queryRunner.query(
      'DELETE FROM process_warehouse_operations WHERE container_number = $1',
      [testContainerNumber]
    );
    await queryRunner.query('DELETE FROM process_trucking_transport WHERE container_number = $1', [
      testContainerNumber
    ]);
    await queryRunner.query('DELETE FROM process_port_operations WHERE container_number = $1', [
      testContainerNumber
    ]);
    await queryRunner.query('DELETE FROM process_sea_freight WHERE bill_of_lading_number = $1', [
      `BL_${testContainerNumber}`
    ]);
    await queryRunner.query('DELETE FROM biz_containers WHERE container_number = $1', [
      testContainerNumber
    ]);

    console.log('   ✅ 旧数据清理完成');

    // 5. 插入测试货柜
    console.log('\n📦 插入测试货柜...');
    const blNumber = `BL_${testContainerNumber}`;
    const now = new Date().toISOString();

    await queryRunner.query(
      `INSERT INTO biz_containers (
        container_number,
        bill_of_lading_number,
        destination_port,
        logistics_status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [testContainerNumber, blNumber, portCode, '未出运', now, now]
    );
    console.log(`   ✅ 货柜插入成功: ${testContainerNumber}`);

    // 6. 插入海运数据
    console.log('\n🚢 插入海运数据...');
    const etaDestPort = new Date('2026-04-20');
    const lastFreeDate = new Date('2026-04-20');

    await queryRunner.query(
      `INSERT INTO process_sea_freight (
        bill_of_lading_number,
        eta_dest_port,
        last_free_date,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5)`,
      [blNumber, etaDestPort, lastFreeDate, now, now]
    );
    console.log(`   ✅ 海运数据插入成功`);
    console.log(`      ETA: ${etaDestPort.toISOString().split('T')[0]}`);
    console.log(`      免费期截止: ${lastFreeDate.toISOString().split('T')[0]}`);

    // 7. 插入提柜数据
    console.log('\n🚛 插入提柜数据...');
    const plannedPickupDate = new Date('2026-04-15');
    const plannedUnloadDate = new Date('2026-04-15');

    await queryRunner.query(
      `INSERT INTO process_trucking_transport (
        container_number,
        trucking_company_id,
        planned_pickup_date,
        planned_unload_date,
        unload_mode_plan,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        testContainerNumber,
        truckingCompanyId,
        plannedPickupDate,
        plannedUnloadDate,
        'Direct',
        now,
        now
      ]
    );
    console.log(`   ✅ 提柜数据插入成功`);
    console.log(`      提柜日: ${plannedPickupDate.toISOString().split('T')[0]}`);
    console.log(`      卸柜日: ${plannedUnloadDate.toISOString().split('T')[0]}`);
    console.log(`      车队ID: ${truckingCompanyId}`);

    // 8. 插入卸柜数据
    console.log('\n🏭 插入卸柜数据...');
    const plannedReturnDate = new Date('2026-04-16');

    await queryRunner.query(
      `INSERT INTO process_warehouse_operations (
        container_number,
        warehouse_id,
        planned_unload_date,
        planned_return_date,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [testContainerNumber, warehouseCode, plannedUnloadDate, plannedReturnDate, now, now]
    );
    console.log(`   ✅ 卸柜数据插入成功`);
    console.log(`      卸柜日: ${plannedUnloadDate.toISOString().split('T')[0]}`);
    console.log(`      还箱日: ${plannedReturnDate.toISOString().split('T')[0]}`);
    console.log(`      仓库: ${warehouseCode}`);

    // 9. 验证数据完整性
    console.log('\n✅ 验证数据完整性...');
    const verification = await queryRunner.query(
      `SELECT 
        c.container_number,
        c.logistics_status,
        c.destination_port,
        sf.eta_dest_port,
        sf.last_free_date,
        tt.planned_pickup_date,
        tt.planned_unload_date AS trucking_unload_date,
        tt.trucking_company_id,
        wo.planned_unload_date AS warehouse_unload_date,
        wo.planned_return_date,
        wo.warehouse_id
      FROM biz_containers c
      LEFT JOIN process_sea_freight sf ON c.bill_of_lading_number = sf.bill_of_lading_number
      LEFT JOIN process_trucking_transport tt ON c.container_number = tt.container_number
      LEFT JOIN process_warehouse_operations wo ON c.container_number = wo.container_number
      WHERE c.container_number = $1`,
      [testContainerNumber]
    );

    if (verification.length === 0) {
      throw new Error('❌ 数据验证失败：未找到测试货柜');
    }

    const data = verification[0];
    console.log('\n📊 测试货柜数据:');
    console.log(`   柜号: ${data.container_number}`);
    console.log(`   状态: ${data.logistics_status}`);
    console.log(`   目的港: ${data.destination_port}`);
    console.log(`   ETA: ${data.eta_dest_port?.toISOString().split('T')[0]}`);
    console.log(`   免费期截止: ${data.last_free_date?.toISOString().split('T')[0]}`);
    console.log(`   提柜日: ${data.planned_pickup_date?.toISOString().split('T')[0]}`);
    console.log(`   卸柜日（提柜）: ${data.trucking_unload_date?.toISOString().split('T')[0]}`);
    console.log(`   卸柜日（卸柜）: ${data.warehouse_unload_date?.toISOString().split('T')[0]}`);
    console.log(`   还箱日: ${data.planned_return_date?.toISOString().split('T')[0]}`);
    console.log(`   车队ID: ${data.trucking_company_id}`);
    console.log(`   仓库: ${data.warehouse_id}`);

    console.log('\n✅ 测试数据插入成功！');
    console.log(`\n💡 提示: 可以使用以下参数测试优化 API:`);
    console.log(`   - containerNumber: ${testContainerNumber}`);
    console.log(`   - warehouseCode: ${warehouseCode}`);
    console.log(`   - truckingCompanyId: ${truckingCompanyId}`);
    console.log(`   - basePickupDate: 2026-04-15`);
  } catch (error) {
    console.error('\n❌ 插入测试数据失败:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('\n🔒 数据库连接已关闭');
  }
}

// 执行
insertTestData().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
