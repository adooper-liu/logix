/**
 * 验证特定货柜的反向链式依赖逻辑
 */

import * as dotenv from 'dotenv';
import { join } from 'path';
import { createConnection } from 'typeorm';

// 加载环境变量
dotenv.config({ path: join(__dirname, '../.env') });

async function verifyContainer(containerNumber: string) {
  console.log(`\n=== 验证货柜 ${containerNumber} ===\n`);

  const connection = await createConnection({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'logix_dev'
  });

  try {
    // 查询流程表数据
    const truckingResult = await connection.query(
      `
      SELECT 
        container_number,
        pickup_date,
        delivery_date,
        planned_pickup_date,
        planned_delivery_date,
        trucking_company_id
      FROM process_trucking_transport
      WHERE container_number = $1
    `,
      [containerNumber]
    );

    const warehouseResult = await connection.query(
      `
      SELECT 
        container_number,
        unload_date,
        planned_unload_date,
        warehouse_id
      FROM process_warehouse_operations
      WHERE container_number = $1
    `,
      [containerNumber]
    );

    const emptyReturnResult = await connection.query(
      `
      SELECT 
        container_number,
        return_time,
        last_return_date,
        planned_return_date,
        return_terminal_code
      FROM process_empty_return
      WHERE container_number = $1
    `,
      [containerNumber]
    );

    const portOpResult = await connection.query(
      `
      SELECT 
        container_number,
        actual_customs_date,
        customs_broker_code,
        eta,
        ata,
        planned_customs_date
      FROM process_port_operations
      WHERE container_number = $1
    `,
      [containerNumber]
    );

    const trucking = truckingResult[0];
    const warehouse = warehouseResult[0];
    const emptyReturn = emptyReturnResult[0];
    const portOp = portOpResult[0];

    console.log('1. 清关节点 (process_port_operations):');
    console.log(`   - actual_customs_date: ${portOp?.actual_customs_date || 'NULL'}`);
    console.log(`   - customs_broker_code: ${portOp?.customs_broker_code || 'NULL'}`);
    console.log(`   - eta: ${portOp?.eta || 'NULL'}`);
    console.log(`   - ata: ${portOp?.ata || 'NULL'}`);
    console.log(`   - planned_customs_date: ${portOp?.planned_customs_date || 'NULL'}`);

    console.log('\n2. 提柜节点 (process_trucking_transport):');
    console.log(`   - pickup_date: ${trucking?.pickup_date || 'NULL'}`);
    console.log(`   - delivery_date: ${trucking?.delivery_date || 'NULL'}`);
    console.log(`   - planned_pickup_date: ${trucking?.planned_pickup_date || 'NULL'}`);
    console.log(`   - trucking_company_id: ${trucking?.trucking_company_id || 'NULL'}`);

    console.log('\n3. 卸柜节点 (process_warehouse_operations):');
    console.log(`   - unload_date: ${warehouse?.unload_date || 'NULL'}`);
    console.log(`   - planned_unload_date: ${warehouse?.planned_unload_date || 'NULL'}`);
    console.log(`   - warehouse_id: ${warehouse?.warehouse_id || 'NULL'}`);

    console.log('\n4. 还箱节点 (process_empty_return):');
    console.log(`   - return_time: ${emptyReturn?.return_time || 'NULL'}`);
    console.log(`   - last_return_date: ${emptyReturn?.last_return_date || 'NULL'}`);
    console.log(`   - return_terminal_code: ${emptyReturn?.return_terminal_code || 'NULL'}`);

    // 分析反向链式依赖
    console.log('\n=== 反向链式依赖分析 ===\n');

    const hasPickupDate = !!(trucking?.pickup_date || trucking?.delivery_date);
    const hasUnloadDate = !!warehouse?.unload_date;
    const hasReturnTime = !!emptyReturn?.return_time;

    console.log(`实际日期检测:`);
    console.log(`  - 已提柜: ${hasPickupDate ? 'YES' : 'NO'}`);
    console.log(`  - 已卸柜: ${hasUnloadDate ? 'YES' : 'NO'}`);
    console.log(`  - 已还箱: ${hasReturnTime ? 'YES' : 'NO'}`);

    console.log('\n预期结果:');

    if (hasReturnTime) {
      console.log('  ✅ 已还箱 → 清关、提柜、卸柜都应销毁');
    } else if (hasUnloadDate) {
      console.log('  ✅ 已卸柜 → 清关、提柜应销毁，卸柜应显示实心');
    } else if (hasPickupDate) {
      console.log('  ✅ 已提柜 → 清关应销毁，提柜应销毁，卸柜应显示实心');
    } else {
      console.log('  ⭕ 无实际日期 → 清关和提柜应显示虚线（有待激活的计划）');
    }

    console.log('\n清关节点是否应该显示?');
    if (!portOp?.actual_customs_date && !hasPickupDate && !hasUnloadDate && !hasReturnTime) {
      console.log('  ✅ 应该显示（有计划日期且无后续节点完成）');
      console.log(`     - customs_broker_code: ${portOp?.customs_broker_code || 'NULL'}`);
      console.log(`     - planned_customs_date: ${portOp?.planned_customs_date || 'NULL'}`);
      console.log(`     - eta: ${portOp?.eta || 'NULL'}`);
    } else if (hasPickupDate || hasUnloadDate || hasReturnTime) {
      console.log('  ❌ 不应该显示（已被后续节点反推为完成）');
    } else {
      console.log('  ❓ 不确定（需要检查计划日期）');
    }
  } catch (error) {
    console.error('❌ 验证失败:', error);
  } finally {
    await connection.close();
  }
}

// 替换为你要验证的货柜号
const containerNumber = process.argv[2] || 'HMMU6019657';
verifyContainer(containerNumber).catch(console.error);
