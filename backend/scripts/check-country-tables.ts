/**
 * 检查数据库中含 country 字段的表
 * 识别与智能排柜相关且不可少的表，并报告需补全/规范化的数据
 *
 * 运行: cd backend && npx tsx scripts/check-country-tables.ts
 */

import path from 'path';
import * as dotenv from 'dotenv';

const backendDir = path.join(__dirname, '..');
process.chdir(backendDir);
dotenv.config({ path: path.join(backendDir, '..', '.env') });
dotenv.config({ path: path.join(backendDir, '.env.dev'), override: true });
if (process.env.DB_HOST === 'postgres') process.env.DB_HOST = 'localhost';

/** 智能排柜必需的表（有 country 字段） */
const SCHEDULING_COUNTRY_TABLES = [
  'dict_warehouses',              // 候选仓库按 country 过滤
  'dict_trucking_port_mapping',   // 车队-港口映射，按 country 过滤
  'dict_warehouse_trucking_mapping' // 仓库-车队映射，按 country 过滤
] as const;

/** 其他含 country 的表（非排柜核心但需统一） */
const OTHER_COUNTRY_TABLES = [
  'biz_customers',
  'dict_ports',
  'dict_overseas_companies',
  'dict_trucking_companies',
  'dict_customs_brokers'
] as const;

async function main() {
  const { AppDataSource } = await import('../src/database');
  await AppDataSource.initialize();

  console.log('\n========== 含 country 字段的表检查 ==========\n');

  // 1. 从 information_schema 查询所有含 country 列的表
  const tablesWithCountry = await AppDataSource.query(`
    SELECT table_name, column_name, is_nullable, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'country'
    ORDER BY table_name
  `);

  const tableSet = new Set(tablesWithCountry.map((r: { table_name: string }) => r.table_name));
  console.log('1. 数据库中含 country 字段的表:');
  tablesWithCountry.forEach((r: { table_name: string; column_name: string; data_type: string; is_nullable: string }) => {
    const scheduling = SCHEDULING_COUNTRY_TABLES.includes(r.table_name as any);
    const other = OTHER_COUNTRY_TABLES.includes(r.table_name as any);
    const tag = scheduling ? ' [智能排柜必需]' : other ? ' [需统一]' : '';
    console.log(`   - ${r.table_name}.${r.column_name} (${r.data_type}, nullable: ${r.is_nullable})${tag}`);
  });

  // 2. 智能排柜必需表检查
  console.log('\n2. 智能排柜必需表完整性:');
  const missing = SCHEDULING_COUNTRY_TABLES.filter(t => !tableSet.has(t));
  if (missing.length > 0) {
    console.log('   ⚠ 缺失表:', missing.join(', '));
  } else {
    console.log('   ✓ 所有智能排柜相关表均含 country 字段');
  }

  // 3. 检查 dict_countries 中的有效代码
  const validCodes = await AppDataSource.query(
    `SELECT code FROM dict_countries WHERE is_active = true`
  );
  const validSet = new Set(validCodes.map((r: any) => r.code));

  // 4. 检查各表 country 值是否在 dict_countries 中
  console.log('\n3. country 值规范性检查（应为 dict_countries.code）:');
  for (const table of [...SCHEDULING_COUNTRY_TABLES, ...OTHER_COUNTRY_TABLES]) {
    if (!tableSet.has(table)) continue;
    const rows = await AppDataSource.query(
      `SELECT DISTINCT country FROM ${table} WHERE country IS NOT NULL AND country != ''`
    );
    const values = rows.map((r: any) => r.country);
    const invalid = values.filter((v: string) => !validSet.has(v));
    const ukToGb = values.filter((v: string) => v === 'UK');
    if (invalid.length > 0 || ukToGb.length > 0) {
      if (ukToGb.length > 0) {
        console.log(`   ⚠ ${table}: 存在 UK，应规范为 GB`);
      }
      if (invalid.length > 0) {
        console.log(`   ⚠ ${table}: 无效 country 值: ${[...new Set(invalid)].join(', ')}`);
      }
    } else if (values.length === 0) {
      console.log(`   - ${table}: 无 country 数据（可能为空表）`);
    } else {
      console.log(`   ✓ ${table}: 所有 country 值有效`);
    }
  }

  // 5. 检查 sell_to_country（特例，存子公司名称）
  const hasSellTo = await AppDataSource.query(
    `SELECT column_name FROM information_schema.columns 
     WHERE table_schema='public' AND table_name='biz_replenishment_orders' AND column_name='sell_to_country'`
  );
  if (hasSellTo.length > 0) {
    console.log('\n4. sell_to_country（特例，存子公司名称）:');
    const samples = await AppDataSource.query(
      `SELECT DISTINCT sell_to_country FROM biz_replenishment_orders WHERE sell_to_country IS NOT NULL LIMIT 5`
    );
    console.log('   示例值:', samples.map((r: any) => r.sell_to_country).join(', ') || '(无)');
  }

  console.log('\n========== 检查完成 ==========\n');
  await AppDataSource.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
