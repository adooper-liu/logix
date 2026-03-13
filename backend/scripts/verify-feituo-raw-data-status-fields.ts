/**
 * 验证 ext_feituo_import_table2 的 raw_data / raw_data_by_group 中
 * 是否包含 状态代码、状态发生时间，以及 mergeStatusEvents 能否正确解析
 *
 * 运行: cd backend && npx tsx scripts/verify-feituo-raw-data-status-fields.ts [container_number]
 * 默认柜号: MSKU0627486
 */

import path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });
process.chdir(path.join(__dirname, '..'));

import { initDatabase, AppDataSource } from '../src/database';

const STATUS_KEYS = ['状态代码', '当前状态代码', '状态发生时间', '发生时间'];
const STATUS_GROUP = 14; // 表二 mergeStatusEvents 使用分组 14

type FeituoRowData = Record<string, unknown> & { _rawDataByGroup?: Record<string, Record<string, unknown>> };

function getVal(row: FeituoRowData, groupId: number, ...keys: string[]): string | null {
  if (row._rawDataByGroup) {
    const g = row._rawDataByGroup[String(groupId)];
    if (g) {
      for (const k of keys) {
        const v = g[k];
        if (v !== undefined && v !== null && v !== '') return String(v).trim();
      }
    }
  }
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && v !== '') return String(v).trim();
  }
  if (row._rawDataByGroup) {
    for (const g of Object.values(row._rawDataByGroup)) {
      for (const k of keys) {
        const v = g[k];
        if (v !== undefined && v !== null && v !== '') return String(v).trim();
      }
    }
  }
  return null;
}

async function main() {
  const containerNumber = process.argv[2] || 'MSKU0627486';

  await initDatabase();

  const rows = await AppDataSource.query(
    `SELECT id, container_number, raw_data, raw_data_by_group
     FROM ext_feituo_import_table2
     WHERE container_number = $1`,
    [containerNumber]
  );

  console.log('\n========== 飞驼表二 raw_data 状态字段验证 ==========\n');
  console.log(`柜号: ${containerNumber}`);
  console.log(`记录数: ${rows.length}\n`);

  if (rows.length === 0) {
    console.log('❌ 无记录');
    await AppDataSource.destroy();
    return;
  }

  let anyHasStatus = false;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rawData = (row.raw_data as Record<string, unknown>) || {};
    const rawDataByGroup = (row.raw_data_by_group as Record<string, Record<string, unknown>>) || {};

    console.log(`--- 记录 ${i + 1} (id=${row.id}) ---`);

    // 1. raw_data 中的 key
    const flatKeys = Object.keys(rawData);
    const statusInFlat = STATUS_KEYS.filter((k) => flatKeys.includes(k));
    console.log(`raw_data keys 数量: ${flatKeys.length}`);
    if (statusInFlat.length > 0) {
      console.log(`  ✅ raw_data 含状态相关: ${statusInFlat.join(', ')}`);
      statusInFlat.forEach((k) => console.log(`     ${k} = ${rawData[k]}`));
      anyHasStatus = true;
    } else {
      console.log(`  ❌ raw_data 无 状态代码/状态发生时间`);
    }

    // 2. raw_data_by_group 结构
    const groupKeys = Object.keys(rawDataByGroup).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    console.log(`raw_data_by_group 分组: ${groupKeys.join(', ')}`);

    for (const gk of groupKeys) {
      const g = rawDataByGroup[gk];
      const gKeys = Object.keys(g || {});
      const statusInG = STATUS_KEYS.filter((k) => gKeys.includes(k));
      if (statusInG.length > 0) {
        console.log(`  分组 ${gk}: ✅ 含 ${statusInG.join(', ')}`);
        statusInG.forEach((k) => console.log(`    ${k} = ${(g as Record<string, unknown>)[k]}`));
        anyHasStatus = true;
      }
    }

    // 3. 模拟 mergeStatusEvents 的 getVal 调用
    const rowForGetVal: FeituoRowData = { ...rawData, _rawDataByGroup: rawDataByGroup };
    const statusCode =
      getVal(rowForGetVal, STATUS_GROUP, '状态代码', '当前状态代码') ||
      getVal(rowForGetVal, 9, '状态代码', '当前状态代码') ||
      (rawData['状态代码'] as string) ||
      (rawData['当前状态代码'] as string);
    const occurredAt =
      getVal(rowForGetVal, STATUS_GROUP, '状态发生时间', '发生时间') ||
      getVal(rowForGetVal, 9, '状态发生时间', '发生时间') ||
      (rawData['状态发生时间'] as string) ||
      (rawData['发生时间'] as string);

    console.log(`mergeStatusEvents 模拟:`);
    console.log(`  状态代码 (group 14/9): ${statusCode ?? 'null'}`);
    console.log(`  状态发生时间 (group 14/9): ${occurredAt ?? 'null'}`);
    if (statusCode && occurredAt) {
      console.log(`  ✅ 可写入 ext_container_status_events`);
    } else {
      console.log(`  ❌ 无法写入（缺状态代码或发生时间）`);
    }
    console.log('');
  }

  // 总结
  console.log('========== 结论 ==========');
  if (anyHasStatus) {
    console.log('raw_data/raw_data_by_group 中存在状态相关字段，但 mergeStatusEvents 可能因分组/列名不匹配未解析到。');
    console.log('建议：检查 FeituoFieldGroupMapping 表二分组 9/14 与 Excel 列顺序是否一致。');
  } else {
    console.log('raw_data/raw_data_by_group 中未发现 状态代码、状态发生时间。');
    console.log('表二 Excel 格式可能不包含状态事件列，或列名与映射表不一致。');
    console.log('');
    console.log('可选方案：');
    console.log('  1. 改用飞驼 API 同步获取状态事件');
    console.log('  2. 扩展导入逻辑：从 process_port_operations 等已有时间字段推导并写入状态事件（如 BDAR→抵港、DSCH→卸船、GTOT→提柜）');
  }

  await AppDataSource.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
