/**
 * 从 ext_feituo_import_table2 已有记录推导状态事件，补写至 ext_container_status_events
 * 用于历史导入数据：表二格式无 状态代码/状态发生时间，但有 卸船时间、实际提箱日期 等
 *
 * 运行: cd backend && npx tsx scripts/backfill-status-events-from-feituo-table2.ts [container_number]
 * 或: npm run backfill:feituo-events [container_number]
 */

import path from 'path';
import * as dotenv from 'dotenv';

// 必须在 import database 之前加载 .env（ESM 的 import 会提升，故用动态 import 延迟加载 database）
const backendDir = path.join(__dirname, '..');
process.chdir(backendDir);
dotenv.config({ path: path.join(backendDir, '..', '.env') });
dotenv.config({ path: path.join(backendDir, '.env.dev'), override: true });
if (process.env.DB_HOST === 'postgres') process.env.DB_HOST = 'localhost';

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

function parseDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  const s = String(val).trim().replace(/\//g, '-');
  const m = s.match(/^(\d{4})-?(\d{1,2})-?(\d{1,2})/);
  if (m) {
    const d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

async function main() {
  const containerNumber = process.argv[2] || null;

  const { AppDataSource, ContainerStatusEvent } = await import('../src/database');

  await AppDataSource.initialize();
  const eventRepo = AppDataSource.getRepository(ContainerStatusEvent);

  const rows = await AppDataSource.query(
    containerNumber
      ? `SELECT id, container_number, raw_data, raw_data_by_group FROM ext_feituo_import_table2 WHERE container_number = $1`
      : `SELECT id, container_number, raw_data, raw_data_by_group FROM ext_feituo_import_table2`,
    containerNumber ? [containerNumber] : []
  );

  console.log(`\n从表二推导状态事件，记录数: ${rows.length}\n`);

  let added = 0;
  for (const row of rows) {
    const rawData = (row.raw_data as Record<string, unknown>) || {};
    const rawDataByGroup = (row.raw_data_by_group as Record<string, Record<string, unknown>>) || {};
    const rowForGetVal: FeituoRowData = { ...rawData, _rawDataByGroup: rawDataByGroup };
    const cn = row.container_number as string;

    const location = getVal(rowForGetVal, 1, '港口代码', '港口名') || getVal(rowForGetVal, 0, '港口代码', '港口名') || (rawData['港口代码'] as string) || undefined;
    const derived: { statusCode: string; occurredAt: Date; statusName: string }[] = [];

    const gateInTime = parseDate(getVal(rowForGetVal, 1, '重箱进场时间') || rawData['重箱进场时间']);
    if (gateInTime) derived.push({ statusCode: 'GTIN', occurredAt: gateInTime, statusName: '进港' });

    const unloadTime = parseDate(getVal(rowForGetVal, 1, '卸船时间') || rawData['卸船时间']);
    if (unloadTime) derived.push({ statusCode: 'DSCH', occurredAt: unloadTime, statusName: '卸船' });

    const availableTime = parseDate(getVal(rowForGetVal, 1, '可提箱日期') || rawData['可提箱日期']);
    if (availableTime) derived.push({ statusCode: 'PCAB', occurredAt: availableTime, statusName: '可提货' });

    const gateOutTime = parseDate(getVal(rowForGetVal, 1, '实际提箱日期', '出场时间') || rawData['实际提箱日期'] || rawData['出场时间']);
    if (gateOutTime) derived.push({ statusCode: 'GTOT', occurredAt: gateOutTime, statusName: '提柜' });

    for (const d of derived) {
      const existing = await eventRepo.findOne({
        where: { containerNumber: cn, statusCode: d.statusCode, occurredAt: d.occurredAt }
      });
      if (existing) continue;

      const event = eventRepo.create({
        containerNumber: cn,
        statusCode: d.statusCode,
        statusName: d.statusName,
        occurredAt: d.occurredAt,
        location: location ?? null,
        description: d.statusName,
        dataSource: 'Feituo',
        rawData: { derivedFrom: 'table2_time_fields_backfill' }
      });
      await eventRepo.save(event);
      added++;
      console.log(`  + ${cn} ${d.statusCode} @ ${d.occurredAt.toISOString()}`);
    }
  }

  console.log(`\n完成，新增 ${added} 条状态事件`);
  await AppDataSource.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
