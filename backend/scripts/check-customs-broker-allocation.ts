/**
 * 检查清关行分配逻辑
 */

import { createConnection } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../.env') });

async function checkCustomsBrokerAllocation(containerNumber: string) {
  console.log(`\n=== 检查货柜 ${containerNumber} 的清关行分配 ===\n`);

  const connection = await createConnection({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'logix_dev'
  });

  try {
    // 1. 查询货柜的基本信息
    const containerResult = await connection.query(
      `
      SELECT 
        c.container_number,
        c.bill_of_lading_number,
        r.sell_to_country,
        r.customer_code
      FROM biz_containers c
      LEFT JOIN biz_replenishment_orders r ON c.container_number = r.container_number
      WHERE c.container_number = $1
      LIMIT 1
    `,
      [containerNumber]
    );

    const container = containerResult[0];
    console.log('1. 货柜基本信息:');
    console.log(`   - container_number: ${container?.container_number}`);
    console.log(`   - sell_to_country: ${container?.sell_to_country}`);
    console.log(`   - customer_code: ${container?.customer_code}`);
    console.log(`   - bill_of_lading_number: ${container?.bill_of_lading_number}`);

    // 2. 查询清关行映射配置
    const mappingResult = await connection.query(
      `
      SELECT 
        country_code,
        customs_broker_id,
        customs_broker_name
      FROM dict_trucking_port_mapping
      WHERE country_code = $1
    `,
      [container?.sell_to_country]
    );

    console.log('\n2. 清关行映射配置 (dict_trucking_port_mapping):');
    if (mappingResult.length > 0) {
      mappingResult.forEach((row: any) => {
        console.log(`   - country_code: ${row.country_code}`);
        console.log(`     customs_broker_id: ${row.customs_broker_id}`);
        console.log(`     customs_broker_name: ${row.customs_broker_name}`);
      });
    } else {
      console.log('   ❌ 未找到该国家的清关行映射配置');
    }

    // 3. 查询清关行字典
    if (container?.sell_to_country) {
      const brokerResult = await connection.query(
        `
        SELECT id, name
        FROM dict_customs_brokers
        WHERE id = (
          SELECT customs_broker_id 
          FROM dict_trucking_port_mapping 
          WHERE country_code = $1 
          LIMIT 1
        )
      `,
        [container.sell_to_country]
      );

      console.log('\n3. 清关行字典 (dict_customs_brokers):');
      if (brokerResult.length > 0) {
        brokerResult.forEach((row: any) => {
          console.log(`   - id: ${row.id}`);
          console.log(`     name: ${row.name}`);
        });
      } else {
        console.log('   ❌ 未找到对应的清关行记录');
      }
    }

    // 4. 分析清关节点不显示的原因
    console.log('\n=== 清关节点不显示原因分析 ===\n');

    if (!container?.sell_to_country) {
      console.log('  ❌ sell_to_country 为空，无法分配清关行');
    } else if (mappingResult.length === 0) {
      console.log(
        `  ❌ 国家 ${container.sell_to_country} 在 dict_trucking_port_mapping 中没有清关行映射`
      );
      console.log('     解决方案：需要在映射表中添加该国家的清关行配置');
    } else {
      console.log('  ✅ 映射配置存在，但 process_port_operations.customs_broker_code 仍为 NULL');
      console.log('     可能原因：');
      console.log('     1. 数据导入时未分配清关行');
      console.log('     2. 智能排柜引擎未执行清关行分配逻辑');
      console.log('     3. 需要手动更新 process_port_operations.customs_broker_code');
    }
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await connection.close();
  }
}

const containerNumber = process.argv[2] || 'HMMU6019657';
checkCustomsBrokerAllocation(containerNumber).catch(console.error);
