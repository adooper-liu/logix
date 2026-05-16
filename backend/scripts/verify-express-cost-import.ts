/**
 * 验证快递费导入结果
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_DATABASE || 'logix_db',
  user: process.env.DB_USERNAME || 'logix_user',
  password: process.env.DB_PASSWORD
};

async function verifyImport() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('=== 快递费导入结果验证 ===\n');

    // 1. 版本信息
    const versionResult = await client.query(`
      SELECT id, version_key, effective_from, imported_by 
      FROM dict_express_surcharge_version 
      ORDER BY id DESC LIMIT 1
    `);
    if (versionResult.rows.length === 0) {
      console.error('未找到快递费版本记录，请先执行导入脚本。');
      process.exitCode = 1;
      return;
    }
    console.log('1. 版本信息:');
    console.log(`   ID: ${versionResult.rows[0].id}`);
    console.log(`   Version Key: ${versionResult.rows[0].version_key}`);
    console.log(`   Effective From: ${versionResult.rows[0].effective_from}`);
    console.log('');

    const versionId = versionResult.rows[0].id;

    // 2. 按国家统计规则数
    const countryStats = await client.query(
      `
      SELECT cs.country_code, COUNT(*) as rule_count
      FROM dict_express_surcharge_rule r
      JOIN dict_express_carrier_service cs ON r.carrier_service_id = cs.id
      WHERE r.version_id = $1
      GROUP BY cs.country_code
      ORDER BY cs.country_code
    `,
      [versionId]
    );

    console.log('2. 按国家统计规则数:');
    let totalRules = 0;
    countryStats.rows.forEach((row) => {
      console.log(`   ${row.country_code}: ${row.rule_count} 条`);
      totalRules += parseInt(row.rule_count);
    });
    console.log(`   总计: ${totalRules} 条`);
    console.log('');

    // 3. 承运商服务统计
    const carrierStats = await client.query(`
      SELECT country_code, COUNT(*) as service_count
      FROM dict_express_carrier_service
      GROUP BY country_code
      ORDER BY country_code
    `);

    console.log('3. 按国家统计承运商服务数:');
    let totalCarriers = 0;
    carrierStats.rows.forEach((row) => {
      console.log(`   ${row.country_code}: ${row.service_count} 个`);
      totalCarriers += parseInt(row.service_count);
    });
    console.log(`   总计: ${totalCarriers} 个`);
    console.log('');

    // 4. 策略统计
    const policyStats = await client.query(
      `
      SELECT policy_type, COUNT(*) as count
      FROM dict_express_stack_policy
      WHERE version_id = $1
      GROUP BY policy_type
      ORDER BY policy_type
    `,
      [versionId]
    );

    console.log('4. 策略统计:');
    let totalPolicies = 0;
    policyStats.rows.forEach((row) => {
      console.log(`   ${row.policy_type}: ${row.count} 条`);
      totalPolicies += parseInt(row.count);
    });
    console.log(`   总计: ${totalPolicies} 条`);
    console.log('');

    // 5. 费用类型分布
    const typeStats = await client.query(
      `
      SELECT type_normalized, COUNT(*) as count
      FROM dict_express_surcharge_rule
      WHERE version_id = $1
      GROUP BY type_normalized
      ORDER BY count DESC
    `,
      [versionId]
    );

    console.log('5. 费用类型分布:');
    typeStats.rows.forEach((row) => {
      console.log(`   ${row.type_normalized}: ${row.count} 条`);
    });
    console.log('');

    // 6. 文本比较符检查
    const literalCheck = await client.query(
      `
      SELECT cs.country_code, cs.service_name, r.type_normalized, r.condition_literal
      FROM dict_express_surcharge_rule r
      JOIN dict_express_carrier_service cs ON r.carrier_service_id = cs.id
      WHERE r.version_id = $1 AND r.condition_literal IS NOT NULL
    `,
      [versionId]
    );

    console.log('6. 文本比较符记录:');
    if (literalCheck.rows.length > 0) {
      literalCheck.rows.forEach((row) => {
        console.log(`   ${row.country_code} | ${row.service_name} | ${row.type_normalized}`);
        console.log(`     条件: ${row.condition_literal}`);
      });
    } else {
      console.log('   无文本比较符记录');
    }
    console.log('');

    // 7. 金额区间检查
    const rangeCheck = await client.query(
      `
      SELECT cs.country_code, cs.service_name, r.type_normalized, 
             r.amount_min, r.amount_max, r.amount_fixed
      FROM dict_express_surcharge_rule r
      JOIN dict_express_carrier_service cs ON r.carrier_service_id = cs.id
      WHERE r.version_id = $1 AND r.amount_min IS NOT NULL
    `,
      [versionId]
    );

    console.log('7. 金额区间记录:');
    if (rangeCheck.rows.length > 0) {
      rangeCheck.rows.forEach((row) => {
        console.log(`   ${row.country_code} | ${row.service_name} | ${row.type_normalized}`);
        console.log(`     区间: ${row.amount_min} - ${row.amount_max}`);
      });
    } else {
      console.log('   无金额区间记录');
    }
    console.log('');

    console.log('=== 验证完成 ===');
  } catch (error: any) {
    console.error('验证失败:', error.message);
  } finally {
    await client.end();
  }
}

verifyImport();
